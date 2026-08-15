import os
from typing import Any

from app.data.mock_data import (
    ACTIVITY,
    HOSPITALS,
    INCIDENTS,
    ROADS,
    SHELTERS,
    SUPPLIES,
    TEAMS,
    VEHICLES,
    ZONES,
)

_firestore_client = None


def get_firestore_client():
    global _firestore_client

    if _firestore_client is not None:
        return _firestore_client

    if os.getenv("USE_FIRESTORE", "false").lower() != "true":
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


MOCK_COLLECTIONS = {
    "incidents": INCIDENTS,
    "zones": ZONES,
    "roads": ROADS,
    "shelters": SHELTERS,
    "hospitals": HOSPITALS,
    "teams": TEAMS,
    "vehicles": VEHICLES,
    "supplies": SUPPLIES,
    "activity": ACTIVITY,
}


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


def get_collection(collection_name: str) -> list[dict[str, Any]]:
    client = get_firestore_client()

    if client is None:
        return MOCK_COLLECTIONS.get(collection_name, [])

    documents = (
        client.collection(collection_name)
        .stream()
    )

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
) -> dict[str, Any] | None:

    client = get_firestore_client()

    if client is None:
        collection = MOCK_COLLECTIONS.get(
            collection_name,
            [],
        )

        for item in collection:
            if item.get("id") == document_id:
                return item

        return None

    document = (
        client
        .collection(collection_name)
        .document(document_id)
        .get()
    )

    if not document.exists:
        return None

    return {
        "id": document.id,
        **from_firestore_value(document.to_dict()),
    }