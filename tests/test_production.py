"""Unit tests for production secrets and deployment validation (Task 7)."""

from app.config import get_settings
from app.secrets import get_secret, validate_production_settings


def test_get_secret_from_env(monkeypatch):
    monkeypatch.setenv("TEST_SECRET_KEY", "env-value-123")
    assert get_secret("TEST_SECRET_KEY") == "env-value-123"


def test_get_secret_from_file_env(tmp_path, monkeypatch):
    secret_file = tmp_path / "secret.txt"
    secret_file.write_text("file-secret-value-456", encoding="utf-8")
    monkeypatch.setenv("MY_KEY_FILE", str(secret_file))

    assert get_secret("MY_KEY") == "file-secret-value-456"


def test_settings_load_secret_file_env(tmp_path, monkeypatch):
    secret_file = tmp_path / "nim-api-key.txt"
    secret_file.write_text("file-backed-nim-key", encoding="utf-8")
    monkeypatch.setenv("NIM_API_KEY_FILE", str(secret_file))
    monkeypatch.delenv("NIM_API_KEY", raising=False)

    settings = get_settings.__wrapped__()
    assert settings.nim_api_key == "file-backed-nim-key"


def test_get_secret_default():
    assert get_secret("NON_EXISTENT_VAR", default="my-default") == "my-default"


def test_validate_production_insecure_defaults(monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "app_env", "prod")
    monkeypatch.setattr(s, "api_keys", "")
    monkeypatch.setattr(s, "jwt_secret", "")
    monkeypatch.setattr(s, "jwt_jwks_url", "")
    monkeypatch.setattr(s, "nim_api_key", "not-needed-locally")
    monkeypatch.setattr(s, "database_url", "postgresql://agent:agent@localhost:5432/agent")

    issues = validate_production_settings(s)
    assert any("CRITICAL: Production environment requires API_KEYS" in i for i in issues)
    assert any("WARNING: NIM_API_KEY is using a development placeholder" in i for i in issues)
    assert any(
        "WARNING: DATABASE_URL is using the default development credentials" in i for i in issues
    )


def test_production_validation_does_not_echo_insecure_api_key(monkeypatch):
    settings = get_settings.__wrapped__()
    monkeypatch.setattr(settings, "app_env", "prod")
    monkeypatch.setattr(settings, "api_keys", "secret")

    issues = validate_production_settings(settings)
    assert any("insecure development default" in issue for issue in issues)
    assert all("secret" not in issue for issue in issues)


def test_validate_production_clean(monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "app_env", "prod")
    monkeypatch.setattr(s, "api_keys", "strong-prod-api-key")
    monkeypatch.setattr(s, "nim_api_key", "nvapi-real-key")
    monkeypatch.setattr(
        s, "database_url", "postgresql://prod_user:strong_pass@db.internal:5432/agent"
    )

    issues = validate_production_settings(s)
    assert issues == []
