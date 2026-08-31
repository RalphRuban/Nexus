import contextvars
import os
from typing import Any, Dict, List, Optional

from app.config import USE_FIRESTORE
from app.data.mock_data import (
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

# ---------------------------------------------------------------------------
# Mock store
# ---------------------------------------------------------------------------

MOCK_COLLECTIONS: Dict[str, List[Dict[str, Any]]] = {
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
    "plans": [],
    "agent_state": [],
    "traces": [],
}

_MOCK_STORE: Dict[str, Dict[str, Dict[str, Any]]] = {
    name: {item["id"]: dict(item) for item in items}
    for name, items in MOCK_COLLECTIONS.items()
}

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

    return _MOCK_STORE


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

        if cred_path:
            cred = credentials.Certificate(cred_path)
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
) -> List[Dict[str, Any]]:
    filters = filters or {}

    active_store = _store_override.get()

    if active_store is not None or not USE_FIRESTORE:
        store = active_store if active_store is not None else _MOCK_STORE

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

        return results

    query = _get_collection(collection_name)

    for key, value in filters.items():
        query = query.where(key, "==", value)

    documents = query.stream()

    return [
        {
            "id": document.id,
            **from_firestore_value(document.to_dict()),
        }
        for document in documents
    ]


def get_document(
    collection_name: str,
    document_id: str,
) -> Optional[Dict[str, Any]]:

    active_store = _store_override.get()

    if active_store is not None or not USE_FIRESTORE:
        store = active_store if active_store is not None else _MOCK_STORE

        collection_store = store.get(
            collection_name,
            {},
        )

        item = collection_store.get(document_id)

        if item is None:
            return None

        return dict(item)

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


# ---------------------------------------------------------------------------
# Write operations
# ---------------------------------------------------------------------------


def create_document(
    collection_name: str,
    document_id: str,
    data: Dict[str, Any],
) -> Dict[str, Any]:
    active_store = _store_override.get()

    if active_store is not None or not USE_FIRESTORE:
        store = active_store if active_store is not None else _MOCK_STORE

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

    document_ref = (
        _get_collection(collection_name)
        .document(document_id)
    )

    document_ref.set(dict(data))

    return {
        "id": document_id,
        **dict(data),
    }


def update_document(
    collection_name: str,
    document_id: str,
    data: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    active_store = _store_override.get()

    if active_store is not None or not USE_FIRESTORE:
        store = active_store if active_store is not None else _MOCK_STORE

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


def delete_document(
    collection_name: str,
    document_id: str,
) -> bool:
    active_store = _store_override.get()

    if active_store is not None or not USE_FIRESTORE:
        store = active_store if active_store is not None else _MOCK_STORE

        collection_store = store.get(
            collection_name,
            {},
        )

        if document_id not in collection_store:
            return False

        del collection_store[document_id]

        return True

    document_ref = (
        _get_collection(collection_name)
        .document(document_id)
    )

    snapshot = document_ref.get()

    if not snapshot.exists:
        return False

    document_ref.delete()

    return True


# ---------------------------------------------------------------------------
# Seed / test helper
# ---------------------------------------------------------------------------


def set_mock_documents(
    collection: str,
    documents: List[Dict[str, Any]],
) -> None:
    collection_store = _MOCK_STORE.setdefault(
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
    for collection_store in _MOCK_STORE.values():
        collection_store.clear()


def reset_store() -> int:
    """Rebuild the mock store from the seed collections and return the
    number of documents loaded. Does nothing in Firestore mode."""
    if USE_FIRESTORE:
        return 0

    clear_mock_store()

    count = 0

    for collection_name, documents in MOCK_COLLECTIONS.items():
        collection_store = _MOCK_STORE.setdefault(
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
