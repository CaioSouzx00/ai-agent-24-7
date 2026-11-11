"""Sensitive/complex intent detection (Task 6.1).

``needs_handoff`` decides *whether* to escalate (unchanged keyword list); ``handoff_reason``
classifies *why*, using the closed taxonomy from ``app.metrics.HANDOFF_REASONS``.

``frustration`` and ``low_confidence`` are part of the taxonomy but are NOT emitted by the
keyword detector: escalating on frustration would change product behaviour, and the LLM API
exposes no calibrated confidence. They are reserved for a future classifier/LLM-judge node.
"""

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

# keyword -> reason category (first match wins, ordered by specificity)
REASON_KEYWORDS: tuple[tuple[str, str], ...] = (
    ("talk to a human", "human_requested"),
    ("human agent", "human_requested"),
    ("falar com humano", "human_requested"),
    ("atendente", "human_requested"),
    ("cancel contract", "cancel"),
    ("cancelar contrato", "cancel"),
    ("refund", "cancel"),
    ("reembolso", "cancel"),
    ("lawsuit", "complex"),
    ("lawyer", "complex"),
    ("fraud", "complex"),
    ("formal complaint", "complex"),
    ("processo judicial", "complex"),
    ("advogado", "complex"),
    ("fraude", "complex"),
)


def needs_handoff(text: str) -> bool:
    t = text.lower()
    return any(k in t for k in SENSITIVE_KEYWORDS)


def handoff_reason(text: str) -> str:
    """Return the reason category for an escalated message (``other`` if none matches)."""
    t = text.lower()
    for keyword, reason in REASON_KEYWORDS:
        if keyword in t:
            return reason
    return "other"
