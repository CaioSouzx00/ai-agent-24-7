"""Internationalization (i18n) and language detection module (Task 9)."""

from __future__ import annotations

import re
import unicodedata

LANGUAGE_NAMES: dict[str, str] = {
    "pt": "Portuguese (Português)",
    "en": "English",
    "es": "Spanish (Español)",
    "fr": "French (Français)",
    "de": "German (Deutsch)",
    "it": "Italian (Italiano)",
}

# Distinctive word sets for fast, lightweight language detection
_LANGUAGE_KEYWORDS: dict[str, set[str]] = {
    "pt": {
        "voce",
        "voces",
        "ola",
        "obrigado",
        "obrigada",
        "nao",
        "para",
        "como",
        "fazer",
        "esta",
        "estou",
        "por",
        "favor",
        "ajuda",
        "bom",
        "dia",
        "tarde",
        "noite",
        "quero",
        "preciso",
        "falar",
        "humano",
        "atendente",
        "problema",
        "conta",
        "estorno",
        "cancelar",
    },
    "es": {
        "hola",
        "gracias",
        "por",
        "favor",
        "como",
        "esta",
        "estoy",
        "buenos",
        "dias",
        "tardes",
        "noches",
        "quiero",
        "necesito",
        "hablar",
        "humano",
        "ayuda",
        "problema",
        "cuenta",
        "cancelar",
        "reembolso",
        "donde",
        "hacer",
        "tambien",
    },
    "fr": {
        "bonjour",
        "merci",
        "sil",
        "vous",
        "plait",
        "comment",
        "allez",
        "besoin",
        "aide",
        "parler",
        "humain",
        "probleme",
        "compte",
        "remboursement",
        "annuler",
        "pourquoi",
        "avec",
        "dans",
        "pour",
    },
    "de": {
        "hallo",
        "danke",
        "bitte",
        "guten",
        "tag",
        "morgen",
        "abend",
        "hilfe",
        "brauche",
        "sprechen",
        "mensch",
        "problem",
        "konto",
        "stornieren",
        "ruckerstattung",
        "warum",
        "nicht",
        "oder",
    },
    "it": {
        "ciao",
        "grazie",
        "per",
        "favore",
        "buongiorno",
        "buonasera",
        "aiuto",
        "bisogno",
        "parlare",
        "umano",
        "problema",
        "conto",
        "rimborso",
        "cancellare",
        "perche",
        "questo",
        "sono",
    },
    "en": {
        "hello",
        "hi",
        "thanks",
        "thank",
        "you",
        "please",
        "how",
        "what",
        "when",
        "where",
        "why",
        "need",
        "help",
        "speak",
        "human",
        "agent",
        "problem",
        "issue",
        "account",
        "refund",
        "cancel",
        "support",
        "chargeback",
    },
}

LOCALIZED_MESSAGES: dict[str, dict[str, str]] = {
    "handoff": {
        "pt": "Encaminhei sua solicitação para um atendente humano.",
        "en": "I have forwarded your request to a human agent.",
        "es": "He transferido su solicitud a un agente humano.",
        "fr": "J'ai transmis votre demande à un agent humain.",
        "de": "Ich habe Ihre Anfrage an einen menschlichen Mitarbeiter weitergeleitet.",
        "it": "Ho inoltrato la tua richiesta a un operatore umano.",
    },
    "error": {
        "pt": "Desculpe, ocorreu um erro ao processar sua mensagem.",
        "en": "Sorry, something went wrong while processing your message.",
        "es": "Disculpe, ocurrió un error al procesar su mensaje.",
        "fr": "Désolé, une erreur s'est produite lors du traitement de votre message.",
        "de": "Entschuldigung, bei der Verarbeitung Ihrer Nachricht ist ein Fehler aufgetreten.",
        "it": "Spiacente, si è verificato un errore durante l'elaborazione del messaggio.",
    },
    "rate_limited": {
        "pt": "Limite de requisições excedido. Por favor, tente novamente mais tarde.",
        "en": "Rate limit exceeded. Please try again later.",
        "es": "Límite de solicitudes superado. Por favor, inténtelo de nuevo más tarde.",
        "fr": "Limite de requêtes dépassée. Veuillez réessayer plus tard.",
        "de": "Anfragelimit überschritten. Bitte versuchen Sie es später erneut.",
        "it": "Limite di richieste superato. Riprova più tardi.",
    },
}


def _strip_accents(text: str) -> str:
    """Normalize and strip diacritics for uniform keyword matching."""
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


def detect_language(text: str) -> str:
    """Detect the ISO 639-1 language code from input text using heuristic matching."""
    if not text or not text.strip():
        return "en"

    raw_lower = text.lower()

    # Immediate high-confidence character indicators
    if any(c in raw_lower for c in ["ç", "ã", "õ"]):
        return "pt"
    if any(c in raw_lower for c in ["ñ", "¿", "¡"]):
        return "es"
    if any(c in raw_lower for c in ["ä", "ö", "ü", "ß"]):
        return "de"

    # Tokenize words
    clean = _strip_accents(raw_lower)
    tokens = set(re.findall(r"\b[a-z]{2,}\b", clean))

    if not tokens:
        return "en"

    scores: dict[str, int] = {lang: 0 for lang in _LANGUAGE_KEYWORDS}
    for lang, keywords in _LANGUAGE_KEYWORDS.items():
        matches = tokens.intersection(keywords)
        scores[lang] = len(matches)

    best_lang, best_score = max(scores.items(), key=lambda item: item[1])
    return best_lang if best_score > 0 else "en"


def get_localized_message(key: str, lang: str = "en") -> str:
    """Retrieve localized system response message for a given key and language."""
    translations = LOCALIZED_MESSAGES.get(key, {})
    return translations.get(lang) or translations.get("en", "")
