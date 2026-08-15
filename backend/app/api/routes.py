from fastapi import APIRouter, HTTPException

from app.services.firestore import (
    get_collection,
    get_document,
)

router = APIRouter()


@router.get("/health")
def health():
    return {
        "status": "ok",
        "service": "nexus-backend",
    }


@router.get("/incidents")
def incidents():
    return get_collection("incidents")


@router.get("/incidents/{incident_id}")
def incident(incident_id: str):
    result = get_document(
        "incidents",
        incident_id,
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    return result


@router.get("/zones")
def zones():
    return get_collection("zones")


@router.get("/zones/{zone_id}")
def zone(zone_id: str):
    result = get_document(
        "zones",
        zone_id,
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Zone not found",
        )

    return result


@router.get("/roads")
def roads():
    return get_collection("roads")


@router.get("/shelters")
def shelters():
    return get_collection("shelters")


@router.get("/hospitals")
def hospitals():
    return get_collection("hospitals")


@router.get("/teams")
def teams():
    return get_collection("teams")


@router.get("/vehicles")
def vehicles():
    return get_collection("vehicles")


@router.get("/supplies")
def supplies():
    return get_collection("supplies")


@router.get("/activity")
def activity():
    return get_collection("activity")