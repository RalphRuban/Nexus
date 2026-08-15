import sys

import firebase_admin
from firebase_admin import credentials, firestore

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


COLLECTIONS = {
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


def initialize_firebase():
    if firebase_admin._apps:
        return

    credentials_path = (
        r"C:\Users\Ralph\Desktop\nexus"
        r"\credentials\nexus-f351a-firebase-adminsdk-fbsvc-ec82f4ca9b.json"
    )

    cred = credentials.Certificate(credentials_path)

    firebase_admin.initialize_app(cred)


def to_firestore_value(value):
    if isinstance(value, list):
        if value and all(
            isinstance(item, list)
            and len(item) == 2
            and all(
                isinstance(coord, (int, float))
                for coord in item
            )
            for item in value
        ):
            return [
                {"latitude": item[0], "longitude": item[1]}
                for item in value
            ]

        return [
            to_firestore_value(item)
            for item in value
        ]

    if isinstance(value, dict):
        return {
            key: to_firestore_value(item)
            for key, item in value.items()
        }

    return value


def seed_firestore():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    initialize_firebase()

    db = firestore.client()

    total = 0

    for collection_name, documents in COLLECTIONS.items():

        print(
            f"\nSeeding collection: {collection_name}"
        )

        collection_ref = db.collection(
            collection_name
        )

        for document in documents:

            document_id = document["id"]

            data = to_firestore_value(
                {
                    key: value
                    for key, value in document.items()
                    if key != "id"
                }
            )

            collection_ref.document(
                document_id
            ).set(data)

            print(
                f"  ✓ {document_id}"
            )

            total += 1

    print("\n--------------------------------")
    print("NEXUS Firestore seed completed")
    print(f"Documents written: {total}")
    print("--------------------------------")


if __name__ == "__main__":
    seed_firestore()