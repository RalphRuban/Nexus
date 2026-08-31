import argparse
import os
import sys

import firebase_admin
from firebase_admin import credentials, firestore

from app.services.firestore import MOCK_COLLECTIONS


def initialize_firebase(credentials_path: str):
    if firebase_admin._apps:
        return

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


def seed_firestore(credentials_path: str):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    initialize_firebase(credentials_path)

    db = firestore.client()

    total = 0

    for collection_name, documents in MOCK_COLLECTIONS.items():

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
    parser = argparse.ArgumentParser(
        prog="seed_firestore",
        description="Seed NEXUS Firestore with the mock dataset.",
    )
    parser.add_argument(
        "--credentials",
        default=os.getenv("GOOGLE_APPLICATION_CREDENTIALS"),
        help="Path to the Firebase admin service-account JSON. "
        "Defaults to the GOOGLE_APPLICATION_CREDENTIALS env var.",
    )
    args = parser.parse_args()

    if not args.credentials:
        print(
            "No credentials provided. "
            "Set GOOGLE_APPLICATION_CREDENTIALS or pass --credentials.",
            file=sys.stderr,
        )
        sys.exit(1)

    seed_firestore(args.credentials)