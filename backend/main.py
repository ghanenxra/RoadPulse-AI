from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from models.database import init_db, SessionLocal, RoadSegment
from data.seed import seed_database

from api import health, roads, metrics, processing, reports, authority, demo

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB
    os.makedirs(os.path.join(BASE_DIR, 'data'), exist_ok=True)
    os.makedirs(os.path.join(PROJECT_DIR, 'reports'), exist_ok=True)
    os.makedirs(os.path.join(PROJECT_DIR, 'uploads'), exist_ok=True)
    
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
app.mount("/reports", StaticFiles(directory=os.path.join(PROJECT_DIR, 'reports')), name="reports")
app.mount("/uploads", StaticFiles(directory=os.path.join(PROJECT_DIR, 'uploads')), name="uploads")
