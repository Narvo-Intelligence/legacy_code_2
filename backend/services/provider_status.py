"""Runtime provider health registry for launch hardening and operator visibility."""

from __future__ import annotations

import os
import threading
import time
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any, Dict

_LOCK = threading.Lock()

_PROVIDER_SPECS: Dict[str, Dict[str, Any]] = {
    "gemini": {"label": "Gemini", "required": True, "env_var": "GEMINI_API_KEY"},
    "groq": {"label": "Groq", "required": False, "env_var": "GROQ_API_KEY"},
    "yarngpt": {"label": "YarnGPT", "required": True, "env_var": "YARNGPT_API_KEY"},
    "google_tts": {
        "label": "Google Cloud TTS",
        "required": False,
        "env_var": "GOOGLE_APPLICATION_CREDENTIALS",
    },
    "openai_tts": {"label": "OpenAI TTS", "required": False, "env_var": "OPENAI_API_KEY"},
    "web_push": {"label": "Web Push", "required": False, "env_var": "VAPID_PRIVATE_KEY"},
}

_RUNTIME: Dict[str, Dict[str, Any]] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _env_configured(env_var: str | None) -> bool:
    if not env_var:
        return False
    return bool(os.environ.get(env_var, "").strip())


def _base_entry(name: str) -> Dict[str, Any]:
    spec = _PROVIDER_SPECS[name]
    configured = _env_configured(spec.get("env_var"))
    detail = None if configured else f"{spec.get('env_var')} not configured"
    return {
        "name": name,
        "label": spec["label"],
        "required": bool(spec.get("required")),
        "configured": configured,
        "status": "unknown" if configured else "disabled",
        "detail": detail,
        "error_kind": None,
        "last_error": None,
        "last_error_at": None,
        "last_ok_at": None,
        "cooldown_until": None,
        "cooldown_remaining_s": 0,
    }


def _merged_entry(name: str) -> Dict[str, Any]:
    entry = _base_entry(name)
    runtime = _RUNTIME.get(name)
    if runtime:
        entry.update(runtime)

    if not entry["configured"]:
        entry["status"] = "disabled"
        entry["cooldown_until"] = None
        entry["cooldown_remaining_s"] = 0
        return entry

    cooldown_until = entry.get("cooldown_until")
    now = time.monotonic()
    if isinstance(cooldown_until, (int, float)) and cooldown_until > now:
        entry["status"] = "cooldown"
        entry["cooldown_remaining_s"] = max(1, int(cooldown_until - now))
    else:
        entry["cooldown_remaining_s"] = 0
        if entry.get("status") == "cooldown":
            entry["status"] = "degraded" if entry.get("last_error") else "unknown"
        entry["cooldown_until"] = None
    return entry


def _upsert(
    name: str,
    *,
    status: str,
    detail: str | None = None,
    error_kind: str | None = None,
    last_error: str | None = None,
    cooldown_seconds: float | None = None,
) -> None:
    with _LOCK:
        current = _RUNTIME.get(name, {})
        next_entry = deepcopy(current)
        next_entry["status"] = status
        next_entry["detail"] = detail
        next_entry["error_kind"] = error_kind
        if last_error is not None:
            next_entry["last_error"] = last_error
            next_entry["last_error_at"] = _now_iso()
        if status == "ok":
            next_entry["last_ok_at"] = _now_iso()
            next_entry["last_error"] = None
            next_entry["last_error_at"] = None
            next_entry["error_kind"] = None
            next_entry["cooldown_until"] = None
        elif cooldown_seconds and cooldown_seconds > 0:
            next_entry["cooldown_until"] = time.monotonic() + float(cooldown_seconds)
        else:
            next_entry["cooldown_until"] = None
        _RUNTIME[name] = next_entry


def mark_provider_ok(name: str, detail: str | None = None) -> None:
    if name not in _PROVIDER_SPECS:
        return
    _upsert(name, status="ok", detail=detail)


def mark_provider_error(
    name: str,
    error: object,
    *,
    kind: str = "error",
    cooldown_seconds: float | None = None,
    detail: str | None = None,
) -> None:
    if name not in _PROVIDER_SPECS:
        return
    status = "cooldown" if cooldown_seconds and cooldown_seconds > 0 else "error"
    _upsert(
        name,
        status=status,
        detail=detail,
        error_kind=kind,
        last_error=str(error),
        cooldown_seconds=cooldown_seconds,
    )


def mark_provider_disabled(name: str, detail: str | None = None) -> None:
    if name not in _PROVIDER_SPECS:
        return
    _upsert(name, status="disabled", detail=detail)


def get_provider_status() -> Dict[str, Dict[str, Any]]:
    with _LOCK:
        return {name: _merged_entry(name) for name in _PROVIDER_SPECS}


def get_provider_summary() -> Dict[str, int]:
    summary = {"ok": 0, "unknown": 0, "disabled": 0, "error": 0, "cooldown": 0, "degraded": 0}
    for provider in get_provider_status().values():
        status = str(provider.get("status") or "unknown")
        summary[status] = summary.get(status, 0) + 1
    return summary


def build_provider_alerts() -> list[Dict[str, Any]]:
    alerts: list[Dict[str, Any]] = []
    for name, provider in get_provider_status().items():
        status = provider["status"]
        required = bool(provider.get("required"))
        if status == "ok":
            continue
        if status == "disabled" and not required:
            continue
        if status == "unknown":
            continue

        label = str(provider.get("label") or name).upper().replace(" ", "_")
        title = f"{label}_{status.upper()}"
        detail = str(provider.get("detail") or "").strip()
        error = str(provider.get("last_error") or "").strip()
        desc_parts = []
        if detail:
            desc_parts.append(detail)
        if status == "cooldown" and provider.get("cooldown_remaining_s"):
            desc_parts.append(
                f"Retry window active for about {provider['cooldown_remaining_s']}s."
            )
        if error:
            desc_parts.append(error[:280])
        if not desc_parts:
            desc_parts.append(f"{provider.get('label') or name} is {status}.")

        alerts.append(
            {
                "id": f"provider-{name}",
                "type": "warning" if required or status in {"error", "cooldown", "degraded"} else "info",
                "title": title,
                "desc": " ".join(desc_parts),
                "time": provider.get("last_error_at") or provider.get("last_ok_at") or _now_iso(),
                "priority": bool(required or status in {"error", "cooldown"}),
            }
        )
    return alerts


def _reset_provider_runtime() -> None:
    with _LOCK:
        _RUNTIME.clear()
