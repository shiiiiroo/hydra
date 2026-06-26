"""
Интерфейс провайдера AI-агента. Любая реализация (stub, Anthropic, Gemini,
...) подчиняется этому контракту, поэтому роутер (app/ai/router.py) и
фронтенд не знают и не должны знать, какой именно провайдер сейчас активен.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from sqlalchemy.orm import Session


@dataclass
class AgentResponse:
    answer: str
    used_tools: list[str] = field(default_factory=list)
    provider: str = "stub"


class AIAgentProvider(ABC):
    @abstractmethod
    def ask(self, question: str, db: Session) -> AgentResponse:
        ...
