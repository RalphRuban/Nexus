from fastapi import APIRouter, File, HTTPException, UploadFile

from app.vision.schemas import VisionExtraction
from app.vision.service import extract_from_image

router = APIRouter()

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

MAX_IMAGE_BYTES = 10 * 1024 * 1024


@router.post("/vision/extract", response_model=VisionExtraction)
async def extract_incident_image(file: UploadFile = File(...)):
    mime_type = file.content_type or ""

    if mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type '{mime_type}'. "
                "Allowed: JPEG, PNG, WEBP."
            ),
        )

    image_bytes = await file.read()

    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="Image exceeds the 10 MB size limit.",
        )

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    try:
        return extract_from_image(image_bytes, mime_type)
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Image analysis failed: {exc}",
        ) from exc