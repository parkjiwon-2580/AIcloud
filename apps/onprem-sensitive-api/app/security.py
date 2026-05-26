import base64
import hashlib
import json
import os
from typing import Any

from cryptography.fernet import Fernet
from fastapi import HTTPException


def _is_dev() -> bool:
    return os.getenv("APP_ENV", "dev").lower() in {"dev", "local", "test"}


def _raw_key() -> str:
    key = os.getenv("FIELD_ENCRYPTION_KEY", "")
    if key:
        return key
    if _is_dev():
        # Development fallback only. Production must inject FIELD_ENCRYPTION_KEY.
        print("[onprem-sensitive-api] WARNING: FIELD_ENCRYPTION_KEY is empty; using dev-only fallback key")
        return "dev-only-field-encryption-key"
    raise HTTPException(status_code=500, detail="FIELD_ENCRYPTION_KEY is not configured")


def _fernet() -> Fernet:
    derived = base64.urlsafe_b64encode(hashlib.sha256(_raw_key().encode("utf-8")).digest())
    return Fernet(derived)


def encrypt_text(value: str | None) -> str:
    payload = "" if value is None else value
    return _fernet().encrypt(payload.encode("utf-8")).decode("utf-8")


def encrypt_json(value: dict[str, Any] | None) -> str:
    payload = json.dumps(value or {}, ensure_ascii=False, separators=(",", ":"))
    return encrypt_text(payload)


def decrypt_text(value: str) -> str:
    return _fernet().decrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_json(value: str) -> dict[str, Any]:
    payload = decrypt_text(value)
    return json.loads(payload) if payload else {}
