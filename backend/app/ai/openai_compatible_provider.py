"""
Универсальный провайдер для любого API, совместимого с форматом OpenAI
chat-completions + tool calling. Под этим форматом сегодня работают:

  - Groq      — БЕСПЛАТНО (без карты), быстрый инференс, открытые модели
                (Llama 3.3 70B, GPT-OSS-120B). Рекомендуемый бесплатный вариант.
  - xAI Grok  — платный (от $0.20/1M токенов), но тот же формат API.
  - OpenRouter— агрегатор, есть бесплатные модели с пометкой ":free".
  - Ollama    — локальная модель на своей машине, вообще без API-ключа.

Один класс обслуживает их всех — отличается только base_url/model/key,
которые задаются в .env (см. PROVIDER_PRESETS в app/routers/ai.py).
"""
from __future__ import annotations

import json
import logging

from sqlalchemy.orm import Session

from app.ai.base import AIAgentProvider, AgentResponse
from app.ai import tools
from app.ai.prompts import SYSTEM_PROMPT
from app.settings import get_settings

logger = logging.getLogger("hydromonitor.ai")
settings = get_settings()


def _to_openai_tools(tool_defs: list[dict]) -> list[dict]:
    """Конвертирует общие TOOL_DEFINITIONS (формат Anthropic) в формат OpenAI function-calling."""
    return [
        {
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t["description"],
                "parameters": t["input_schema"],
            },
        }
        for t in tool_defs
    ]


class OpenAICompatibleProvider(AIAgentProvider):
    """Provider name отражает реально подключённый сервис (groq / grok / openrouter / ollama),
    выставляется снаружи через provider_label, чтобы фронтенд показывал честный бейдж."""

    def __init__(self, base_url: str, model: str, api_key: str, provider_label: str):
        try:
            from openai import OpenAI
        except ImportError as e:
            raise RuntimeError("Пакет 'openai' не установлен: pip install openai") from e

        # Ollama локально не требует ключа — для остальных он обязателен.
        if not api_key and "localhost" not in base_url and "127.0.0.1" not in base_url:
            raise RuntimeError(f"AI_PROVIDER_API_KEY не задан в .env (нужен для {provider_label})")

        self.client = OpenAI(api_key=api_key or "not-needed-for-local", base_url=base_url)
        self.model = model
        self.name = provider_label

    def ask(self, question: str, db: Session) -> AgentResponse:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question},
        ]
        used_tools: list[str] = []
        openai_tools = _to_openai_tools(tools.TOOL_DEFINITIONS)

        for _ in range(4):  # ограничение на число шагов tool-use
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=openai_tools,
                tool_choice="auto",
            )
            msg = response.choices[0].message

            if not msg.tool_calls:
                return AgentResponse(answer=msg.content or "", used_tools=used_tools, provider=self.name)

            messages.append({
                "role": "assistant",
                "content": msg.content,
                "tool_calls": [
                    {"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                    for tc in msg.tool_calls
                ],
            })

            for call in msg.tool_calls:
                fn = tools.TOOL_FUNCTIONS.get(call.function.name)
                used_tools.append(call.function.name)
                try:
                    args = json.loads(call.function.arguments or "{}")
                    result = fn(db, **args) if fn else {"error": "unknown tool"}
                except Exception as e:
                    result = {"error": str(e)}
                messages.append({
                    "role": "tool",
                    "tool_call_id": call.id,
                    "content": json.dumps(result, ensure_ascii=False, default=str),
                })

        return AgentResponse(
            answer="Не удалось получить ответ за разумное число шагов.",
            used_tools=used_tools, provider=self.name,
        )
