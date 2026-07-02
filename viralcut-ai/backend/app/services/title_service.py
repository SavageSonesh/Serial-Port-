"""
Generates short title/hook suggestions for a clip from its own transcript text.

Everything returned is either lifted verbatim from what was actually said, or
built from a generic template filled in with a keyword extracted from the
clip - never a fabricated statistic or claim.
"""
import re
from collections import Counter
from typing import List

STOPWORDS = {
    "the", "a", "an", "is", "it", "to", "of", "and", "in", "that", "this", "was", "for",
    "on", "with", "as", "at", "by", "be", "are", "or", "so", "but", "i", "you", "we", "they",
    "he", "she", "them", "his", "her", "have", "has", "had", "not", "just", "will", "would",
    "can", "could", "there", "what", "when", "where", "who", "how", "your", "my", "our", "if",
}

GENERIC_TEMPLATES = [
    "Nobody Tells You This About {kw}",
    "The Truth About {kw}",
    "This Changes Everything About {kw}",
    "The Biggest Mistake About {kw}",
    "Watch This Before You Think About {kw}",
]

FALLBACK_HOOKS = ["You Need To See This", "This Changes Everything", "Wait For It", "Watch Until The End"]

WORD_RE = re.compile(r"[A-Za-z0-9']+")


def _top_keyword(text: str) -> str:
    words = [w.lower() for w in WORD_RE.findall(text)]
    candidates = [w for w in words if w not in STOPWORDS and len(w) > 3]
    if not candidates:
        return ""
    counts = Counter(candidates)
    return counts.most_common(1)[0][0].capitalize()


def _truncate(text: str, max_len: int = 60) -> str:
    text = text.strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 1].rsplit(" ", 1)[0] + "…"


def generate_title_suggestions(clip_text: str) -> List[str]:
    text = (clip_text or "").strip()
    if not text:
        return FALLBACK_HOOKS[:3]

    sentences = re.split(r"(?<=[.!?])\s+", text)
    sentences = [s.strip() for s in sentences if s.strip()]

    suggestions: List[str] = []

    question = next((s for s in sentences if s.endswith("?")), None)
    if question:
        suggestions.append(_truncate(question))

    if sentences:
        first = sentences[0]
        candidate = _truncate(first)
        if candidate not in suggestions:
            suggestions.append(candidate)

    keyword = _top_keyword(text)
    if keyword:
        seed = sum(ord(c) for c in text[:20]) if text else 0
        for i in range(len(GENERIC_TEMPLATES)):
            template = GENERIC_TEMPLATES[(seed + i) % len(GENERIC_TEMPLATES)]
            candidate = template.format(kw=keyword)
            if candidate not in suggestions:
                suggestions.append(candidate)
            if len(suggestions) >= 3:
                break

    for fallback in FALLBACK_HOOKS:
        if len(suggestions) >= 3:
            break
        if fallback not in suggestions:
            suggestions.append(fallback)

    return suggestions[:3]
