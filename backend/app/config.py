import os
from dotenv import load_dotenv

load_dotenv()

APP_NAME = os.getenv("APP_NAME", "NEXUS Backend")
APP_ENV = os.getenv("APP_ENV", "development")

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:3000",
)