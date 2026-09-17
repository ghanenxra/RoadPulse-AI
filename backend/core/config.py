"""
backend/core/config.py
───────────────────────
Central Settings class for RoadPulse AI.

All environment variables are defined here with defaults.
Never use os.environ or os.getenv directly in any other file.
Always import `settings` from this module.

Usage:
    from core.config import settings

    settings.database_url        # DB connection string
    settings.uploads_dir         # Absolute path to uploads
    settings.reports_dir         # Absolute path to reports
    settings.backend_host        # Host to bind
    settings.backend_port        # Port to bind
    settings.cors_origins_list   # Parsed list of allowed CORS origins
    settings.scoring_weight_*    # Scoring weights
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# ── Resolve directory paths ───────────────────────────────────────────────────
# backend/core/config.py -> backend/ -> project_root/
CORE_DIR    = Path(__file__).resolve().parent   # backend/core/
BACKEND_DIR = CORE_DIR.parent                   # backend/
PROJECT_DIR = BACKEND_DIR.parent                # RoadPulse-AI/

# Load .env: check backend/ first, then project root
_env_backend = BACKEND_DIR / ".env"
_env_root    = PROJECT_DIR / ".env"
if _env_backend.exists():
    load_dotenv(_env_backend)
elif _env_root.exists():
    load_dotenv(_env_root)
# If neither exists, platform env vars are used (production deployment)


def _get(key: str, default: str = "") -> str:
    """Read a single env var, strip whitespace."""
    return os.environ.get(key, default).strip()


def _get_path(key: str, fallback: Path) -> Path:
    """Read an env var as a path. Relative paths resolve from PROJECT_DIR."""
    raw = _get(key)
    if not raw:
        return fallback
    p = Path(raw)
    return p if p.is_absolute() else (PROJECT_DIR / p).resolve()


# ─────────────────────────────────────────────────────────────────────────────

class Settings:
    """
    Single source of truth for all runtime configuration.

    Reads from:
      1. .env file in backend/ directory
      2. .env file in project root
      3. Actual environment variables (production platform like Railway, Render, etc.)

    All properties have safe defaults so the app works locally
    without any .env file at all.
    """

    # ── Database ──────────────────────────────────────────────────────────────
    @property
    def database_url(self) -> str:
        """
        Full SQLAlchemy database URL.
        Default: SQLite file inside backend/ directory.
        Production: Set DATABASE_URL to a PostgreSQL URL.
        Examples:
          sqlite:////absolute/path/to/roadpulse.db
          postgresql://user:pass@host:5432/roadpulse
        """
        raw = _get("DATABASE_URL")
        if raw:
            return raw
        db_file = BACKEND_DIR / "roadpulse.db"
        return f"sqlite:///{db_file}"

    @property
    def db_connect_args(self) -> dict:
        """SQLAlchemy connect_args. Needed for SQLite thread safety."""
        if self.database_url.startswith("sqlite"):
            return {"check_same_thread": False}
        return {}

    # ── Server ────────────────────────────────────────────────────────────────
    @property
    def backend_host(self) -> str:
        return _get("BACKEND_HOST", "0.0.0.0")

    @property
    def backend_port(self) -> int:
        return int(_get("BACKEND_PORT", "8000"))

    # ── Directories ───────────────────────────────────────────────────────────
    @property
    def uploads_dir(self) -> Path:
        return _get_path("UPLOADS_DIR", PROJECT_DIR / "uploads")

    @property
    def reports_dir(self) -> Path:
        return _get_path("REPORTS_DIR", PROJECT_DIR / "reports")

    # ── CORS ──────────────────────────────────────────────────────────────────
    @property
    def cors_wildcard(self) -> bool:
        """True if CORS_ORIGINS=* — allow all origins (dev/testing only)."""
        return _get("CORS_ORIGINS", "").strip() == "*"

    @property
    def cors_origins_list(self) -> list:
        """
        Full list of allowed CORS origins.
        Always includes localhost variants for local dev.
        Add production/staging frontend URLs via CORS_ORIGINS env var
        (comma-separated, e.g. "https://myapp.vercel.app,https://staging.myapp.com").
        Set CORS_ORIGINS=* to allow all origins (useful for quick testing).
        """
        if self.cors_wildcard:
            return ["*"]
        base = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
            "http://localhost:3002",
            "http://127.0.0.1:3002",
            "http://localhost:3005",
            "http://127.0.0.1:3005",
            "https://road-pulse-ai-mu.vercel.app",
        ]
        extra_raw = _get("CORS_ORIGINS", "")
        extra = [o.strip() for o in extra_raw.split(",") if o.strip()]
        seen = set(base)
        for o in extra:
            if o not in seen:
                base.append(o)
                seen.add(o)
        return base

    @property
    def cors_origin_regex(self) -> str:
        """Regex pattern for wildcard CORS matching (e.g. all Vercel preview URLs)."""
        return _get("CORS_ORIGIN_REGEX", r"https://.*\.vercel\.app")


    # ── Scoring weights ───────────────────────────────────────────────────────
    @property
    def scoring_weight_severity(self) -> float:
        return float(_get("SCORING_WEIGHT_SEVERITY", "0.40"))

    @property
    def scoring_weight_density(self) -> float:
        return float(_get("SCORING_WEIGHT_DENSITY", "0.25"))

    @property
    def scoring_weight_trend(self) -> float:
        return float(_get("SCORING_WEIGHT_TREND", "0.20"))

    @property
    def scoring_weight_context(self) -> float:
        return float(_get("SCORING_WEIGHT_CONTEXT", "0.15"))

    # ── App environment ───────────────────────────────────────────────────────
    @property
    def app_env(self) -> str:
        """'development' or 'production'."""
        return _get("APP_ENV", "development")

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    # ── Debug helper ──────────────────────────────────────────────────────────
    def summary(self) -> dict:
        """Returns all active config values (safe to log on startup)."""
        return {
            "app_env":      self.app_env,
            "database_url": self.database_url,
            "backend_host": self.backend_host,
            "backend_port": self.backend_port,
            "uploads_dir":  str(self.uploads_dir),
            "reports_dir":  str(self.reports_dir),
            "cors_origins": self.cors_origins_list,
            "scoring_weights": {
                "severity": self.scoring_weight_severity,
                "density":  self.scoring_weight_density,
                "trend":    self.scoring_weight_trend,
                "context":  self.scoring_weight_context,
            },
        }


# ── Singleton — import this everywhere ───────────────────────────────────────
settings = Settings()
