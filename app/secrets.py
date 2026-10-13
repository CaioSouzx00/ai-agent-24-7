"""Production secrets management and environment security validation (Task 7).

Supports:
- Docker Secrets / Kubernetes mounted secrets at `/run/secrets/<name>`
- `<NAME>_FILE` environment variable paths (e.g. `NIM_API_KEY_FILE=/secrets/nim_key`)
- Production hardening checks (validates that insecure dev defaults are not deployed to prod)
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.config import Settings

SECRETS_DIR = Path("/run/secrets")


def get_secret(name: str, default: str = "") -> str:
    """Read secret from file env var, Docker/K8s secret mount, or standard env var."""
    # 1. Check <NAME>_FILE env var
    file_path = os.getenv(f"{name.upper()}_FILE")
    if file_path and Path(file_path).is_file():
        try:
            return Path(file_path).read_text(encoding="utf-8").strip()
        except OSError:
            pass

    # 2. Check /run/secrets/<name>
    secret_file = SECRETS_DIR / name.lower()
    if secret_file.is_file():
        try:
            return secret_file.read_text(encoding="utf-8").strip()
        except OSError:
            pass

    # 3. Standard environment variable
    return os.getenv(name, default)


def validate_production_settings(settings: Settings) -> list[str]:
    """Validate settings when running in production (APP_ENV=prod). Returns warning list."""
    if settings.app_env != "prod":
        return []

    issues: list[str] = []
    insecure_dev_values = {
        "dev-secret-key",
        "dev-secret",
        "secret",
        "changeme",
        "123456",
        "test",
        "password",
    }

    # 1. Auth check: prod must have API keys or JWT configured
    keys = [k.strip() for k in settings.api_keys.split(",") if k.strip()]
    has_keys = bool(keys)
    has_jwt = bool(settings.jwt_secret or settings.jwt_jwks_url)
    if not has_keys and not has_jwt:
        issues.append("CRITICAL: Production environment requires API_KEYS or JWT configuration")

    # Insecure API keys or JWT secrets
    insecure_keys = [k for k in keys if k.lower() in insecure_dev_values]
    if insecure_keys:
        issues.append(
            f"CRITICAL: API_KEYS contains insecure development default: {', '.join(insecure_keys)}"
        )

    if settings.jwt_secret and settings.jwt_secret.lower() in insecure_dev_values:
        issues.append("CRITICAL: JWT_SECRET is using an insecure development default")

    # 2. Insecure default keys
    if settings.nim_api_key in ("not-needed-locally", "mock"):
        issues.append("WARNING: NIM_API_KEY is using a development placeholder")

    if "agent:agent" in settings.database_url:
        issues.append(
            "WARNING: DATABASE_URL is using the default development credentials (agent:agent)"
        )

    return issues
