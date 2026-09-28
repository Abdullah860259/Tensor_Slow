from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Initialize the application
app = FastAPI(title="Aicon Hackathon API", version="1.0.0")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "online", "message": "Aicon backend is running cleanly!"}
