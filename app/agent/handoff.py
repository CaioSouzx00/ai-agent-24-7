"""Sensitive/complex intent detection (Task 6.1)."""

SENSITIVE_KEYWORDS = (
    "refund",
    "cancel contract",
    "lawsuit",
    "lawyer",
    "fraud",
    "formal complaint",
    "talk to a human",
    "human agent",
    # Portuguese
    "reembolso",
    "cancelar contrato",
    "processo judicial",
    "advogado",
    "fraude",
    "falar com humano",
    "atendente",
)


def needs_handoff(text: str) -> bool:
    t = text.lower()
    return any(k in t for k in SENSITIVE_KEYWORDS)
