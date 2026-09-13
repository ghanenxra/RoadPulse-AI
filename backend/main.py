from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from backend.models.database import init_db, SessionLocal, RoadSegment
from backend.data.seed import seed_database

from backend.api import health, roads, metrics, processing, reports, authority, demo

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB
    os.makedirs("C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/backend/data", exist_ok=True)
    os.makedirs("C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/backend/reports", exist_ok=True)
    os.makedirs("C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/backend/uploads", exist_ok=True)
    
    init_db()
    
    db = SessionLocal()
    try:
        # Check if empty, auto-seed if so
        if db.query(RoadSegment).count() == 0:
            print("Database empty, auto-seeding with demo data...")
            seed_database(db)
    finally:
        db.close()
    
    yield

app = FastAPI(title="RoadPulse AI API", version="1.0.0-prototype", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router)
app.include_router(roads.router)
app.include_router(metrics.router)
app.include_router(processing.router)
app.include_router(reports.router)
app.include_router(authority.router)
app.include_router(demo.router)

# Mount static files
app.mount("/reports", StaticFiles(directory="C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/backend/reports"), name="reports")
app.mount("/uploads", StaticFiles(directory="C:/Users/pureg/.gemini/antigravity/scratch/roadpulse-ai/backend/uploads"), name="uploads")
