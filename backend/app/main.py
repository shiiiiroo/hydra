from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.database import Base, engine, SessionLocal
from app.routers import objects, stats, categories, reports, auth, ai
from app.settings import get_settings
from app.middleware import SecurityHeadersMiddleware
from app.rate_limit import limiter
from app.seed import seed_default_users

logging.basicConfig(level=logging.INFO)
settings = get_settings()

app = FastAPI(
    title="HydroMonitor API",
    description="Каталогизация и мониторинг гидротехнических сооружений Жамбылской области (AITU Hackday MVP)",
    version="1.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"detail": "Слишком много запросов. Попробуйте позже."})


app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_default_users(db)
    finally:
        db.close()


app.include_router(auth.router)
app.include_router(objects.router)
app.include_router(stats.router)
app.include_router(categories.router)
app.include_router(reports.router)
app.include_router(ai.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "env": settings.ENV}
