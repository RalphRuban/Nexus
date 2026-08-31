from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.api.scenarios import router as scenarios_router
from app.api.vision import router as vision_router
from app.api.plans import router as plans_router
from app.config import APP_NAME


app = FastAPI(
    title=APP_NAME,
    description="NEXUS Crisis Decision Support Backend",
    version="0.1.0",
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc),
            "path": request.url.path,
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
):
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation error",
            "detail": exc.errors(),
            "path": request.url.path,
        },
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(router)
app.include_router(scenarios_router)
app.include_router(vision_router)
app.include_router(plans_router)


@app.get("/")
def root():
    return {
        "name": "NEXUS",
        "service": "backend",
        "version": "0.1.0",
        "status": "running",
    }