import contextvars
import logging
import os
import sys
from typing import Any, Dict, List, Optional

from app.config import USE_FIRESTORE

logger = logging.getLogger("nexus.firestore")

# When a Firestore (or the admin client init / any cloud call) fails at
# runtime -- e.g. the Spark free tier hits its daily read/write quota and
# returns 429 -- we degrade gracefully to the in-memory mock store so the
# demo keeps working. This flag flips on the first such failure.
_FIRESTORE_FAILED = False


def _firestore_available() -> bool:
    """True when Firestore is enabled and has not hit a runtime failure."""
    return USE_FIRESTORE and not _FIRESTORE_FAILED


def _mark_firestore_failed():
    global _FIRESTORE_FAILED
    _FIRESTORE_FAILED = True
    logger.warning(
        "Firestore unavailable (likely quota exceeded); "
        "falling back to in-memory mock store for this process."
    )

# ---------------------------------------------------------------------------
# Lazy mock data
#
# The seed data (``app.data.mock_data -> app.data.real_data``) is a large
# module whose import materializes ~3,660 weather records and 198 wards as
# live Python objects (~200-400 MB RSS). It is only needed when running in
# mock (non-Firestore) mode, so we defer the import until first access.
# This keeps the process footprint small at startup on memory-limited hosts.
# ---------------------------------------------------------------------------

_mock_data_cache = None


def _load_mock_data() -> dict:
    """Import the mock data module once and cache the raw collections."""
    global _mock_data_cache

    if _mock_data_cache is None:
        from app.data.mock_data import (  # heavy import - deferred
            ACTIVITY,
            HOSPITALS,
            INCIDENTS,
            INCIDENT_REPORTS,
            ROADS,
            SCENARIOS,
            SHELTERS,
            SUPPLIES,
            TEAMS,
            VEHICLES,
            WARDS,
            WEATHER_EVENTS,
            ZONES,
        )

        _mock_data_cache = {
            "incidents": INCIDENTS,
            "zones": ZONES,
            "roads": ROADS,
            "shelters": SHELTERS,
            "hospitals": HOSPITALS,
            "teams": TEAMS,
            "vehicles": VEHICLES,
            "supplies": SUPPLIES,
            "weather_events": WEATHER_EVENTS,
            "incident_reports": INCIDENT_REPORTS,
            "wards": WARDS,
            "activity": ACTIVITY,
            "scenarios": SCENARIOS,
        }

    return _mock_data_cache


_COLLECTION_KEYS = (
    "incidents",
    "zones",
    "roads",
    "shelters",
    "hospitals",
    "teams",
    "vehicles",
    "supplies",
    "weather_events",
    "incident_reports",
    "wards",
    "activity",
    "scenarios",
)


class _LazyCollections:
    """Lazy dict-like view over the seed collections.

    Iteration / item access triggers the (heavy) mock data import on first
    use, so code that only wants to enumerate collection names never pays
    the cost of loading the weather/ward objects.
    """

    def items(self):
        return _load_mock_data().items()

    def keys(self):
        return _load_mock_data().keys()

    def values(self):
        return _load_mock_data().values()

    def get(self, key, default=None):
        return _load_mock_data().get(key, default)

    def __iter__(self):
        return iter(_COLLECTION_KEYS)

    def __len__(self):
        return len(_COLLECTION_KEYS)


MOCK_COLLECTIONS: Dict[str, List[Dict[str, Any]]] = _LazyCollections()

_mock_store_cache = None


def _mock_store() -> Dict[str, Dict[str, Dict[str, Any]]]:
    """Return the in-memory mock store, building it lazily on first use."""
    global _mock_store_cache

    if _mock_store_cache is None:
        _mock_store_cache = {
            name: {item["id"]: dict(item) for item in items}
            for name, items in _load_mock_data().items()
        }
        _mock_store_cache.setdefault("plans", {})
        _mock_store_cache.setdefault("agent_state", {})
        _mock_store_cache.setdefault("traces", {})

    return _mock_store_cache


# When set, CRUD operations route to this isolated store instead of the
# global store. Used by the scenario engine to run "what if?" mutations
# without leaking into real data.
_store_override: contextvars.ContextVar[
    Optional[Dict[str, Dict[str, Dict[str, Any]]]]
] = contextvars.ContextVar("store_override", default=None)

_firestore_client = None


def _active_store() -> Dict[str, Dict[str, Dict[str, Any]]]:
    override = _store_override.get()

    if override is not None:
        return override

    return _mock_store()


# ---------------------------------------------------------------------------
# Client helpers
# ---------------------------------------------------------------------------


def get_firestore_client():
    global _firestore_client

    if _firestore_client is not None:
        return _firestore_client

    if not USE_FIRESTORE:
        return None

    import firebase_admin
    from firebase_admin import credentials, firestore

    if not firebase_admin._apps:
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        cred_json = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")

        if cred_path:
            cred = credentials.Certificate(cred_path)
        elif cred_json:
            import json
            import tempfile

            with tempfile.NamedTemporaryFile(
                mode="w",
                suffix=".json",
                delete=False,
                encoding="utf-8",
            ) as tmp:
                json.dump(json.loads(cred_json), tmp)
                credential_file = tmp.name

            cred = credentials.Certificate(credential_file)
        else:
            cred = None

        if cred is not None:
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()

    _firestore_client = firestore.client()

    return _firestore_client


def _get_collection(collection_name: str):
    client = get_firestore_client()
    return client.collection(collection_name)


def from_firestore_value(value):
    if isinstance(value, list):
        if value and all(
            isinstance(item, dict)
            and "latitude" in item
            and "longitude" in item
            for item in value
        ):
            return [
                [item["latitude"], item["longitude"]]
                for item in value
            ]

        return [
            from_firestore_value(item)
            for item in value
        ]

    if isinstance(value, dict):
        return {
            key: from_firestore_value(item)
            for key, item in value.items()
        }

    return value


# ---------------------------------------------------------------------------
# Read operations
# ---------------------------------------------------------------------------


def list_documents(
    collection_name: str,
    filters: Optional[Dict[str, Any]] = None,
    limit: Optional[int] = None,
) -> List[Dict[str, Any]]:
    filters = filters or {}

    active_store = _store_override.get()

    if active_store is not None or not _firestore_available():
        store = active_store if active_store is not None else _mock_store()

        collection_store = store.get(
            collection_name,
            {},
        )

        results = list(collection_store.values())

        for key, value in filters.items():
            results = [
                item
                for item in results
                if item.get(key) == value
            ]

        if limit is not None:
            results = results[:limit]

        return results

    try:
        query = _get_collection(collection_name)

        for key, value in filters.items():
            query = query.where(key, "==", value)

        if limit is not None:
            query = query.limit(limit)

        documents = query.stream()

        return [
            {
                "id": document.id,
                **from_firestore_value(document.to_dict()),
            }
            for document in documents
        ]
    except Exception:
        _mark_firestore_failed()
        return list_documents(collection_name, filters, limit)


def get_document(
    collection_name: str,
    document_id: str,
) -> Optional[Dict[str, Any]]:

    active_store = _store_override.get()

    if active_store is not None or not _firestore_available():
        store = active_store if active_store is not None else _mock_store()

        collection_store = store.get(
            collection_name,
            {},
        )

        item = collection_store.get(document_id)

        if item is None:
            return None

        return dict(item)

    try:
        document = (
            _get_collection(collection_name)
            .document(document_id)
            .get()
        )

        if not document.exists:
            return None

        return {
            "id": document.id,
            **from_firestore_value(document.to_dict()),
        }
    except Exception:
        _mark_firestore_failed()
        return get_document(collection_name, document_id)


# ---------------------------------------------------------------------------
# Write operations
# ---------------------------------------------------------------------------


def create_document(
    collection_name: str,
    document_id: str,
    data: Dict[str, Any],
) -> Dict[str, Any]:
    active_store = _store_override.get()

    if active_store is not None or not _firestore_available():
        store = active_store if active_store is not None else _mock_store()

        collection_store = store.setdefault(
            collection_name,
            {},
        )

        collection_store[document_id] = {
            "id": document_id,
            **dict(data),
        }

        return {
            "id": document_id,
            **dict(data),
        }

    try:
        document_ref = (
            _get_collection(collection_name)
            .document(document_id)
        )

        document_ref.set(dict(data))

        return {
            "id": document_id,
            **dict(data),
        }
    except Exception:
        _mark_firestore_failed()
        return create_document(collection_name, document_id, data)


def update_document(
    collection_name: str,
    document_id: str,
    data: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    active_store = _store_override.get()

    if active_store is not None or not _firestore_available():
        store = active_store if active_store is not None else _mock_store()

        collection_store = store.setdefault(
            collection_name,
            {},
        )

        existing = collection_store.get(document_id)

        if existing is None:
            return None

        existing.update(data)

        return {
            "id": document_id,
            **dict(existing),
        }

    try:
        document_ref = (
            _get_collection(collection_name)
            .document(document_id)
        )

        snapshot = document_ref.get()

        if not snapshot.exists:
            return None

        document_ref.update(dict(data))

        updated = document_ref.get()

        return {
            "id": document_id,
            **from_firestore_value(updated.to_dict()),
        }
    except Exception:
        _mark_firestore_failed()
        return update_document(collection_name, document_id, data)


def delete_document(
    collection_name: str,
    document_id: str,
) -> bool:
    active_store = _store_override.get()

    if active_store is not None or not _firestore_available():
        store = active_store if active_store is not None else _mock_store()

        collection_store = store.get(
            collection_name,
            {},
        )

        if document_id not in collection_store:
            return False

        del collection_store[document_id]

        return True

    try:
        document_ref = (
            _get_collection(collection_name)
            .document(document_id)
        )

        snapshot = document_ref.get()

        if not snapshot.exists:
            return False

        document_ref.delete()

        return True
    except Exception:
        _mark_firestore_failed()
        return delete_document(collection_name, document_id)


# ---------------------------------------------------------------------------
# Seed / test helper
# ---------------------------------------------------------------------------


def set_mock_documents(
    collection: str,
    documents: List[Dict[str, Any]],
) -> None:
    collection_store = _mock_store().setdefault(
        collection,
        {},
    )

    collection_store.clear()

    for document in documents:
        if "id" not in document:
            raise ValueError(
                "Mock documents must contain an 'id' field."
            )

        document_id = document["id"]

        collection_store[document_id] = dict(
            document
        )


def clear_mock_store() -> None:
    for collection_store in _mock_store().values():
        collection_store.clear()


def reset_store() -> int:
    """Rebuild the mock store from the seed collections and return the
    number of documents loaded. Does nothing in Firestore mode."""
    if USE_FIRESTORE:
        return 0

    clear_mock_store()

    count = 0

    for collection_name, documents in MOCK_COLLECTIONS.items():
        collection_store = _mock_store().setdefault(
            collection_name,
            {},
        )

        for document in documents:
            if "id" not in document:
                continue

            collection_store[document["id"]] = dict(document)
            count += 1

    return count


# ---------------------------------------------------------------------------
# Isolated store override (used by the scenario engine)
# ---------------------------------------------------------------------------


def set_store_override(
    store: Optional[Dict[str, Dict[str, Dict[str, Any]]]],
) -> None:
    """Activate an isolated store for the current async context.

    Pass None to clear the override and restore normal reads/writes.
    """
    _store_override.set(store)
