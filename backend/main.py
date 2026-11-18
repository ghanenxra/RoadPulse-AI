from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from core.config import settings
from models.database import init_db
from api import health, roads, metrics, processing, reports, authority, demo, ingest


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure required directories exist (paths from settings)
    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    settings.reports_dir.mkdir(parents=True, exist_ok=True)

    # Initialize DB schema (creates tables if not present, never drops data)
    init_db()

    if not settings.is_production:
        import json
        print("\n=== RoadPulse AI — Config ===")
        print(json.dumps(settings.summary(), indent=2, default=str))
        print("=============================")
        print("  -> Seed roads : python mock_tools/seed_roads.py")
        print("  -> Inject data: python mock_tools/inject.py --road TR-01")
        print("  -> Stream data: python mock_tools/stream.py --road TR-01 --duration 60\n")

    yield


app = FastAPI(
    title="RoadPulse AI API",
    version="1.0.0-prototype",
    lifespan=lifespan
)

# CORS — fully driven by settings (which reads from env vars)
# Set CORS_ORIGINS=* in env to allow all origins (useful for dev/testing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=settings.cors_origin_regex if not settings.cors_wildcard else None,
    allow_credentials=not settings.cors_wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "status": "healthy",
        "service": "RoadPulse AI",
        "version": "1.0.0-prototype",
        "docs": "/docs",
        "env": settings.app_env,
    }


@app.get("/api/config")
def get_config():
    """Returns active config (non-sensitive). Useful for debugging deployment."""
    return settings.summary()


# Routers
app.include_router(health.router)
app.include_router(roads.router)
app.include_router(metrics.router)
app.include_router(processing.router)
app.include_router(reports.router)
app.include_router(authority.router)
app.include_router(demo.router)
app.include_router(ingest.router)   # <- Local YOLO / mock_tools ingestion

# Mount static files — directories from settings
app.mount("/reports", StaticFiles(directory=str(settings.reports_dir)), name="reports")
app.mount("/uploads", StaticFiles(directory=str(settings.uploads_dir)), name="uploads")
