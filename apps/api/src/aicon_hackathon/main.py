import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings

app = FastAPI(title=settings.title, version=settings.version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "online", "message": "Aicon backend is running cleanly!"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "api-sidecar"}

def run():
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("aicon_hackathon.main:app", host="0.0.0.0", port=port, reload=True)

if __name__ == "__main__":
    run()
