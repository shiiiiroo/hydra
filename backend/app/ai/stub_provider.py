"""
Rule-based провайдер "AI-агента" — без единого вызова внешнего API.

Цель этого файла — не имитация интеллекта, а демонстрация рабочего
сквозного пути "вопрос пользователя → вызов инструмента → ответ на
естественном языке", который реальный LLM-провайдер (AnthropicProvider)
заменит один-в-один, без переписывания роутера или фронтенда.
"""
from __future__ import annotations

import re

from sqlalchemy.orm import Session

from app.ai.base import AIAgentProvider, AgentResponse
from app.ai import tools


class StubAIProvider(AIAgentProvider):
    name = "stub"

    def ask(self, question: str, db: Session) -> AgentResponse:
        q = question.lower().strip()
        used: list[str] = []

        if any(w in q for w in ["авари", "критич", "проблем", "риск", "critical", "risk", "апаттық", "тәуекел"]):
            used.append("get_top_risky")
            top = tools.get_top_risky(db, limit=5)
            lines = "\n".join(f"• {o['code']} ({o['district']}) — риск-скор {o['risk_score']}, {o['status']}" for o in top)
            answer = (
                "Это демо-режим без подключённой модели (AI_PROVIDER=stub), но вот реальные данные "
                f"из базы — топ-5 самых рискованных объектов:\n{lines}\n\n"
                "Подключите Anthropic/Gemini API-ключ в .env, чтобы получать развёрнутые ответы на "
                "произвольные вопросы (см. app/ai/anthropic_provider.py)."
            )
            return AgentResponse(answer=answer, used_tools=used, provider=self.name)

        if any(w in q for w in ["сколько", "всего", "статист", "счёт", "счет", "how many", "total", "statistic", "қанша", "барлық"]):
            used.append("get_dashboard_summary")
            s = tools.get_dashboard_summary(db)
            answer = (
                f"Всего объектов в каталоге: {s['total']}.\n"
                f"Исправно: {s['by_status'].get('ok', 0)} · "
                f"Наблюдение: {s['by_status'].get('watch', 0)} · "
                f"Ремонт: {s['by_status'].get('repair', 0)} · "
                f"Авария: {s['by_status'].get('critical', 0)}.\n\n"
                "(Это демо-режим: ответ собран по правилам из реальных данных, без LLM.)"
            )
            return AgentResponse(answer=answer, used_tools=used, provider=self.name)

        district_match = re.search(r"район[а-я]*\s*(\d+|[а-яё]+)", q)
        if district_match or "найди" in q or "поиск" in q or "канал" in q:
            used.append("search_objects")
            results = tools.search_objects(db, query=question, limit=5)
            if results:
                lines = "\n".join(f"• {o['code']} — {o['district']}, {o['status']} (риск {o['risk_score']})" for o in results)
                answer = f"Нашёл по запросу «{question}»:\n{lines}"
            else:
                answer = f"По запросу «{question}» ничего не нашлось в каталоге."
            return AgentResponse(answer=answer, used_tools=used, provider=self.name)

        return AgentResponse(
            answer=(
                "Я работаю в демо-режиме (без подключённой LLM) и понимаю только простые запросы: "
                "сводная статистика, топ рискованных объектов, поиск по коду/району. "
                "Попробуйте: «сколько аварийных объектов» или «найди район 5».\n\n"
                "Это специально оставленная точка расширения: добавьте ANTHROPIC_API_KEY в .env и "
                "переключите AI_PROVIDER=anthropic, чтобы подключить настоящего LLM-агента с "
                "function calling по тем же данным (см. README → «AI-агент»)."
            ),
            used_tools=used,
            provider=self.name,
        )
