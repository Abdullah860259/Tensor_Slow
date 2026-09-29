import os
from pydantic import BaseModel

class Settings(BaseModel):
    title: str = "Aicon Hackathon API"
    version: str = "1.0.0"
    port: int = int(os.getenv("PORT", "8000"))
    allowed_origins: list[str] = [
        origin.strip()
        for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
        if origin.strip()
    ]

settings = Settings()
