"""Detecção de intenção complexa/sensível (Task 6.1)."""

SENSITIVE_KEYWORDS = (
    "reembolso",
    "cancelar contrato",
    "processo judicial",
    "advogado",
    "fraude",
    "reclamação formal",
    "falar com humano",
    "atendente",
)


def needs_handoff(text: str) -> bool:
    t = text.lower()
    return any(k in t for k in SENSITIVE_KEYWORDS)
