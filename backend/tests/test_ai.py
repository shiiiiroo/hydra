from unittest.mock import MagicMock

from app.ai.stub_provider import StubAIProvider
from app.ai.openai_compatible_provider import OpenAICompatibleProvider
from app.routers.ai import OPENAI_COMPATIBLE_PRESETS


def test_stub_provider_answers_without_any_api_key(client, auth_headers):
    r = client.post("/api/ai/ask", headers=auth_headers, json={"question": "сколько всего объектов"})
    assert r.status_code == 200
    body = r.json()
    assert body["provider"] == "stub"
    assert "объект" in body["answer"].lower() or "Всего" in body["answer"]


def test_ai_requires_authentication(client):
    r = client.post("/api/ai/ask", json={"question": "test"})
    assert r.status_code == 401


def test_known_free_and_paid_presets_configured():
    """Groq (free) and the other OpenAI-compatible presets must stay registered."""
    assert "groq" in OPENAI_COMPATIBLE_PRESETS
    assert "grok" in OPENAI_COMPATIBLE_PRESETS
    assert OPENAI_COMPATIBLE_PRESETS["groq"]["base_url"] == "https://api.groq.com/openai/v1"


def test_openai_compatible_provider_tool_calling_loop(db_session_factory=None):
    """Mocks a Groq-style response: a tool call, then a final answer."""
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        provider = OpenAICompatibleProvider(
            base_url="https://api.groq.com/openai/v1", model="llama-3.3-70b-versatile",
            api_key="fake-key-for-test", provider_label="groq",
        )

        tool_call = MagicMock(id="call_1")
        tool_call.function.name = "get_dashboard_summary"
        tool_call.function.arguments = "{}"
        msg1 = MagicMock(tool_calls=[tool_call], content=None)
        resp1 = MagicMock(choices=[MagicMock(message=msg1)])

        msg2 = MagicMock(tool_calls=[], content="Готово.")
        resp2 = MagicMock(choices=[MagicMock(message=msg2)])

        provider.client.chat.completions.create = MagicMock(side_effect=[resp1, resp2])

        result = provider.ask("сколько объектов", db)
        assert result.answer == "Готово."
        assert "get_dashboard_summary" in result.used_tools
        assert result.provider == "groq"
    finally:
        db.close()
