"""
Main FastAPI application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.database import init_db
from app.routes import users, events, triage, reports, voice, insights, clinical, medications

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up - initializing database...")
    init_db()
    logger.info("Database initialized")
    yield
    # Shutdown
    logger.info("Shutting down...")

# Create FastAPI app
app = FastAPI(
    title="Chronic Health Buddy API",
    description="Multilingual health buddy for chronic condition management",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users.router, prefix="/api", tags=["users"])
app.include_router(events.router, prefix="/api", tags=["events"])
app.include_router(triage.router, prefix="/api", tags=["triage"])
app.include_router(reports.router, prefix="/api", tags=["reports"])
app.include_router(voice.router, prefix="/api", tags=["voice"])
app.include_router(insights.router, prefix="/api", tags=["insights"])
app.include_router(clinical.router, prefix="/api", tags=["clinical"])
app.include_router(medications.router, prefix="/api", tags=["medications"])

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Chronic Health Buddy API is running"}

@app.get("/")
async def root():
    return {
        "name": "Chronic Health Buddy API",
        "version": "1.0.0",
        "status": "running"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
