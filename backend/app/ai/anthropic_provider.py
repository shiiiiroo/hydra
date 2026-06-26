"""
Реальный провайдер на Claude (Anthropic Messages API) с function calling
по тем же инструментам из app/ai/tools.py.

Это НЕ заглушка — рабочая реализация. Чтобы включить:
  1. pip install anthropic  (уже в requirements.txt)
  2. В .env: AI_AGENT_ENABLED=true, AI_PROVIDER=anthropic, AI_PROVIDER_API_KEY=sk-ant-...
  3. Перезапустить backend — роутер (app/ai/router.py) подхватит провайдера автоматически.

Импорт anthropic — best-effort: если пакет не установлен и провайдер не
выбран, всё остальное приложение продолжает работать (см. try/except).
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


class AnthropicAIProvider(AIAgentProvider):
    name = "anthropic"

    def __init__(self):
        try:
            import anthropic
        except ImportError as e:
            raise RuntimeError("Пакет 'anthropic' не установлен: pip install anthropic") from e
        if not settings.AI_PROVIDER_API_KEY:
            raise RuntimeError("AI_PROVIDER_API_KEY не задан в .env")
        self.client = anthropic.Anthropic(api_key=settings.AI_PROVIDER_API_KEY)

    def ask(self, question: str, db: Session) -> AgentResponse:
        messages = [{"role": "user", "content": question}]
        used_tools: list[str] = []

        for _ in range(4):  # ограничение на число шагов tool-use, чтобы не уйти в цикл
            response = self.client.messages.create(
                model=settings.AI_MODEL,
                max_tokens=1024,
                system=SYSTEM_PROMPT,
                tools=tools.TOOL_DEFINITIONS,
                messages=messages,
            )

            tool_uses = [b for b in response.content if b.type == "tool_use"]
            if not tool_uses:
                text = "".join(b.text for b in response.content if b.type == "text")
                return AgentResponse(answer=text, used_tools=used_tools, provider=self.name)

            messages.append({"role": "assistant", "content": response.content})
            tool_results = []
            for call in tool_uses:
                fn = tools.TOOL_FUNCTIONS.get(call.name)
                used_tools.append(call.name)
                try:
                    result = fn(db, **call.input) if fn else {"error": "unknown tool"}
                except Exception as e:
                    result = {"error": str(e)}
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": call.id,
                    "content": json.dumps(result, ensure_ascii=False, default=str),
                })
            messages.append({"role": "user", "content": tool_results})

        return AgentResponse(answer="Не удалось получить ответ за разумное число шагов.", used_tools=used_tools, provider=self.name)
