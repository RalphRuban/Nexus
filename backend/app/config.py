import os
from dotenv import load_dotenv

load_dotenv()

APP_NAME = os.getenv("APP_NAME", "NEXUS Backend")
APP_ENV = os.getenv("APP_ENV", "development")

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:3000",
)

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]

USE_FIRESTORE = (
    os.getenv("USE_FIRESTORE", "false").lower()
    in {"true", "1", "yes"}
)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

AGENT_LLM_MODE = os.getenv("AGENT_LLM_MODE", "deterministic").lower()

AGENT_MODEL = os.getenv("AGENT_MODEL", "gemini-3.5-flash")

VISION_MODE = os.getenv("VISION_MODE", "llm").lower()

VISION_MODEL = os.getenv("VISION_MODEL", "gemini-3.5-flash")