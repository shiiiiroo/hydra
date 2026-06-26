"""
Централизованная конфигурация приложения.

Все секреты и параметры окружения читаются из .env (см. .env.example),
а не хардкодятся в коде — это первый пункт любого чек-листа "industrial
standards" для бэкенда: секреты не лежат в git, разные окружения
(dev/staging/prod) настраиваются переменными, а не правкой кода.
"""
from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ENV: str = "development"  # development | staging | production

    # --- База данных ---
    # SQLite по умолчанию для хакатона/демо. В проде — поменять на
    # postgresql+psycopg://user:pass@host:5432/hydromonitor (PostGIS опционально).
    DATABASE_URL: str = "sqlite:///./hydromonitor.db"

    # --- Аутентификация / JWT ---
    SECRET_KEY: str = "CHANGE_ME_INSECURE_DEFAULT_DO_NOT_USE_IN_PRODUCTION"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- Учётка администратора, создаётся при первом запуске (seed) ---
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "CHANGE_ME_ON_FIRST_LOGIN"
    ADMIN_EMAIL: str = "admin@hydromonitor.local"

    # Демо-аккаунт только для чтения — удобно для показа жюри без выдачи
    # реальных прав записи.
    CREATE_DEMO_VIEWER: bool = True
    DEMO_VIEWER_USERNAME: str = "viewer"
    DEMO_VIEWER_PASSWORD: str = "viewer12345"

    # --- CORS ---
    # В проде — конкретные домены, никогда "*", когда включена аутентификация
    # с credentials (cookies/Authorization).
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # --- Rate limiting ---
    RATE_LIMIT_LOGIN: str = "10/minute"
    RATE_LIMIT_DEFAULT: str = "120/minute"

    # --- AI-агент (точка расширения, см. app/ai/) ---
    AI_AGENT_ENABLED: bool = False
    AI_PROVIDER: str = "stub"  # stub | groq | grok | openrouter | ollama | anthropic
    AI_PROVIDER_API_KEY: str = ""
    AI_MODEL: str = ""          # пусто = взять разумный дефолт для выбранного провайдера (см. app/routers/ai.py)
    AI_BASE_URL: str = ""       # пусто = взять дефолтный base_url для выбранного провайдера; задайте вручную для Ollama на другом хосте и т.п.

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENV == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
