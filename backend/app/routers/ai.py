from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth_deps import get_current_user
from app.models import User
from app.settings import get_settings
from app.ai.base import AgentResponse
from app.ai.stub_provider import StubAIProvider

router = APIRouter(prefix="/api/ai", tags=["ai"])
logger = logging.getLogger("hydromonitor.ai")
settings = get_settings()

# --------------------------------------------------------------------------
# Пресеты для провайдеров, совместимых с форматом OpenAI chat-completions.
# Менять провайдера = менять только .env (AI_PROVIDER + ключ), без правок кода.
# Groq — рекомендуемый бесплатный вариант (см. README → «AI-агент»).
# --------------------------------------------------------------------------
OPENAI_COMPATIBLE_PRESETS = {
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "default_model": "llama-3.3-70b-versatile",
    },
    "grok": {
        "base_url": "https://api.x.ai/v1",
        "default_model": "grok-4.1-fast",
    },
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "default_model": "meta-llama/llama-3.3-70b-instruct:free",
    },
    "ollama": {
        "base_url": "http://localhost:11434/v1",
        "default_model": "llama3.1",
    },
}

_provider_instance = None


def get_provider():
    """Ленивая инициализация провайдера с откатом на stub при любой ошибке
    конфигурации (отсутствующий ключ, не установлен пакет, провайдер недоступен
    и т.д.) — AI-функции никогда не должны положить остальное приложение."""
    global _provider_instance
    if _provider_instance is not None:
        return _provider_instance

    if settings.AI_AGENT_ENABLED:
        provider_key = settings.AI_PROVIDER.lower()

        if provider_key == "anthropic":
            try:
                from app.ai.anthropic_provider import AnthropicAIProvider
                _provider_instance = AnthropicAIProvider()
                logger.info("AI-агент: активирован провайдер Anthropic (%s)", settings.AI_MODEL)
                return _provider_instance
            except Exception as e:
                logger.warning("AI-агент: не удалось инициализировать Anthropic (%s), используется stub", e)

        elif provider_key in OPENAI_COMPATIBLE_PRESETS:
            preset = OPENAI_COMPATIBLE_PRESETS[provider_key]
            try:
                from app.ai.openai_compatible_provider import OpenAICompatibleProvider
                _provider_instance = OpenAICompatibleProvider(
                    base_url=settings.AI_BASE_URL or preset["base_url"],
                    model=settings.AI_MODEL or preset["default_model"],
                    api_key=settings.AI_PROVIDER_API_KEY,
                    provider_label=provider_key,
                )
                logger.info("AI-агент: активирован провайдер %s (%s)", provider_key, settings.AI_MODEL or preset["default_model"])
                return _provider_instance
            except Exception as e:
                logger.warning("AI-агент: не удалось инициализировать %s (%s), используется stub", provider_key, e)

        elif provider_key != "stub":
            logger.warning("AI-агент: неизвестный AI_PROVIDER=%s, используется stub", settings.AI_PROVIDER)

    _provider_instance = StubAIProvider()
    return _provider_instance


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str
    used_tools: list[str]
    provider: str


@router.get("/status")
def ai_status(user: User = Depends(get_current_user)):
    return {
        "enabled": settings.AI_AGENT_ENABLED,
        "provider": settings.AI_PROVIDER,
        "active_provider": get_provider().name,
    }


@router.post("/ask", response_model=AskResponse)
def ask(payload: AskRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    provider = get_provider()
    result: AgentResponse = provider.ask(payload.question, db)
    return AskResponse(answer=result.answer, used_tools=result.used_tools, provider=result.provider)
