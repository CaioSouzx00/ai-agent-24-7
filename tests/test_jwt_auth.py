"""Unit tests for user authentication with JWT, Clerk, and Auth0 (Task 2)."""

import time

import jwt
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.config import get_settings
from app.security import require_auth

KEY_32 = "a" * 32


def create_test_app():
    test_app = FastAPI()

    @test_app.get("/protected", dependencies=[Depends(require_auth)])
    async def protected():
        return {"ok": True}

    return test_app


def test_jwt_hs256_success(monkeypatch):
    monkeypatch.setattr(get_settings(), "jwt_secret", KEY_32)
    monkeypatch.setattr(get_settings(), "app_env", "prod")

    token = jwt.encode(
        {"sub": "user_123", "email": "caio@example.com", "exp": int(time.time()) + 3600},
        KEY_32,
        algorithm="HS256",
    )

    client = TestClient(create_test_app())
    resp = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json() == {"ok": True}


def test_jwt_expired(monkeypatch):
    monkeypatch.setattr(get_settings(), "jwt_secret", KEY_32)
    monkeypatch.setattr(get_settings(), "app_env", "prod")

    token = jwt.encode(
        {"sub": "user_123", "exp": int(time.time()) - 100},
        KEY_32,
        algorithm="HS256",
    )

    client = TestClient(create_test_app())
    resp = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401
    assert "expired" in resp.json()["detail"].lower()


def test_jwt_invalid_signature(monkeypatch):
    monkeypatch.setattr(get_settings(), "jwt_secret", KEY_32)
    monkeypatch.setattr(get_settings(), "app_env", "prod")

    token = jwt.encode(
        {"sub": "user_123", "exp": int(time.time()) + 3600},
        "b" * 32,
        algorithm="HS256",
    )

    client = TestClient(create_test_app())
    resp = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401


def test_jwt_dev_mode_without_secret(monkeypatch):
    monkeypatch.setattr(get_settings(), "jwt_secret", "")
    monkeypatch.setattr(get_settings(), "jwt_jwks_url", "")
    monkeypatch.setattr(get_settings(), "api_keys", "")
    monkeypatch.setattr(get_settings(), "app_env", "dev")

    # In dev mode, an unverified JWT still works smoothly
    token = jwt.encode({"sub": "dev_subject", "name": "Tester"}, KEY_32, algorithm="HS256")

    client = TestClient(create_test_app())
    resp = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200


def test_static_api_key_still_works_alongside_jwt(monkeypatch):
    monkeypatch.setattr(get_settings(), "api_keys", "secret-api-key-999")
    monkeypatch.setattr(get_settings(), "jwt_secret", KEY_32)
    monkeypatch.setattr(get_settings(), "app_env", "prod")

    client = TestClient(create_test_app())
    resp = client.get("/protected", headers={"X-API-Key": "secret-api-key-999"})
    assert resp.status_code == 200
