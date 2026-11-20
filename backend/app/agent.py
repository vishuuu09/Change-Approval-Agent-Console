"""Planning agent. Drafts a change plan; it can NEVER execute anything.

Uses an LLM when ANTHROPIC_API_KEY is set, otherwise a deterministic stub so the
app and tests run offline. All LLM output is validated against the Plan schema.
"""
import json
import logging

import httpx
from pydantic import ValidationError

from .config import settings
from .schemas import Plan

log = logging.getLogger("agent")


class PlanningError(Exception):
    pass


PROMPT = (
    "You are an infrastructure change planner. Return ONLY JSON with keys "
    '"summary" (string) and "steps" (list of {"order": int, "action": str, '
    '"risk": "low"|"medium"|"high"}). Max 8 steps. Request title: {title}. '
    "Description: {description}"
)


def _stub(title: str, description: str) -> Plan:
    risky = any(w in description.lower() for w in ("delete", "drop", "production", "prod"))
    return Plan.model_validate(
        {
            "summary": f"Plan for: {title}",
            "steps": [
                {"order": 1, "action": "Snapshot current state and verify backups", "risk": "low"},
                {"order": 2, "action": f"Apply change: {title}", "risk": "high" if risky else "medium"},
                {"order": 3, "action": "Run health checks and verify metrics", "risk": "low"},
            ],
        }
    )


def draft_plan(title: str, description: str) -> Plan:
    if not settings.anthropic_api_key:
        return _stub(title, description)
    try:
        resp = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": settings.anthropic_api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": settings.agent_model,
                "max_tokens": 1000,
                "messages": [
                    {"role": "user", "content": PROMPT.format(title=title, description=description)}
                ],
            },
            timeout=settings.agent_timeout_s,
        )
        resp.raise_for_status()
        text = resp.json()["content"][0]["text"].strip()
        text = text.removeprefix("```json").removesuffix("```").strip()
        return Plan.model_validate(json.loads(text))
    except (httpx.HTTPError, KeyError, IndexError, ValueError, ValidationError) as exc:
        log.warning("planning failed", extra={"ctx": {"error": type(exc).__name__}})
        raise PlanningError(type(exc).__name__) from exc
