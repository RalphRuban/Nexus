from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import APP_NAME, FRONTEND_URL


app = FastAPI(
    title=APP_NAME,
    description="NEXUS Crisis Decision Support Backend",
    version="0.1.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(router)


@app.get("/")
def root():
    return {
        "name": "NEXUS",
        "service": "backend",
        "version": "0.1.0",
        "status": "running",
    }