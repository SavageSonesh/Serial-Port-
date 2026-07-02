"""
Heuristic "estimated engagement score" and clip-candidate selection.

Nothing here is a guarantee of virality - it is a transparent, explainable
scoring system built from lexical and timing signals in the transcript. The
weights are intentionally simple so the score_breakdown returned to the
frontend is easy to reason about.
"""
import random
import re
from dataclasses import dataclass, field
from typing import List, Optional

DURATION_PRESETS = {
    "15-30": (15.0, 30.0),
    "30-45": (30.0, 45.0),
    "45-60": (45.0, 60.0),
}

HOOK_STARTERS = [
    "the reason", "here's why", "here's how", "nobody tells you", "nobody talks about",
    "the secret", "why you", "what if", "imagine", "stop doing", "never do", "the biggest mistake",
    "the truth about", "did you know", "how to", "this is why", "listen", "let me tell you",
]
QUESTION_WORDS = {"what", "why", "how", "when", "where", "who", "which", "should", "can", "did", "is", "are", "do", "does"}
EMOTIONAL_WORDS = {
    "amazing", "incredible", "shocking", "insane", "crazy", "unbelievable", "love", "hate",
    "terrifying", "beautiful", "devastating", "hilarious", "furious", "heartbroken", "obsessed",
    "worst", "best", "scared", "excited", "thrilled", "disgusting", "brutal", "epic", "wild",
}
ADVICE_WORDS = {
    "tip", "tips", "trick", "tricks", "step", "steps", "learn", "should", "must", "need to",
    "always", "never", "avoid", "mistake", "mistakes", "lesson", "advice", "strategy", "hack",
}
STORY_WORDS = {
    "one day", "so i", "then i", "suddenly", "turns out", "little did", "eventually",
    "years ago", "when i was", "i remember", "at first", "in the end",
}
CONTROVERSIAL_WORDS = {
    "actually", "wrong", "myth", "unpopular", "controversial", "everyone thinks",
    "lie", "lying", "fake", "overrated", "underrated", "nobody wants to admit",
}
FILLER_TOKENS = {"um", "uh", "erm", "hmm", "like", "you know", "sort of", "kind of"}
STOPWORDS = {
    "the", "a", "an", "is", "it", "to", "of", "and", "in", "that", "this", "was", "for",
    "on", "with", "as", "at", "by", "be", "are", "or", "so", "but", "i", "you", "we",
}

SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")
WORD_RE = re.compile(r"[a-zA-Z0-9']+")


@dataclass
class Sentence:
    text: str
    start: float
    end: float
    words: List[dict] = field(default_factory=list)


@dataclass
class Candidate:
    start: float
    end: float
    text: str
    score: int
    breakdown: dict


def duration_range(settings) -> tuple:
    if settings.duration_preset == "custom" and settings.custom_min_duration and settings.custom_max_duration:
        return float(settings.custom_min_duration), float(settings.custom_max_duration)
    return DURATION_PRESETS.get(settings.duration_preset, (30.0, 45.0))


def build_sentences(segments: List[dict]) -> List[Sentence]:
    """Flatten transcript segments into word-timestamped sentences."""
    all_words: List[dict] = []
    for seg in segments:
        if seg.get("words"):
            all_words.extend(seg["words"])
        else:
            n = max(1, len(seg["text"].split()))
            span = (seg["end"] - seg["start"]) / n
            for i, w in enumerate(seg["text"].split()):
                all_words.append({"word": w, "start": seg["start"] + i * span, "end": seg["start"] + (i + 1) * span})

    sentences: List[Sentence] = []
    buf: List[dict] = []

    def flush():
        if not buf:
            return
        text = " ".join(w["word"] for w in buf).strip()
        if text:
            sentences.append(Sentence(text=text, start=buf[0]["start"], end=buf[-1]["end"], words=list(buf)))

    for w in all_words:
        buf.append(w)
        if re.search(r"[.!?]$", w["word"].strip()):
            flush()
            buf = []
    flush()

    if not sentences and all_words:
        sentences.append(
            Sentence(
                text=" ".join(w["word"] for w in all_words),
                start=all_words[0]["start"],
                end=all_words[-1]["end"],
                words=all_words,
            )
        )
    return sentences


def _silence_ratio(sentences: List[Sentence], start: float, end: float) -> float:
    span = max(0.001, end - start)
    covered = sum(min(s.end, end) - max(s.start, start) for s in sentences if s.end > start and s.start < end)
    return max(0.0, 1.0 - covered / span)


def _score_window(sentences: List[Sentence], start_idx: int, end_idx: int) -> Candidate:
    window = sentences[start_idx : end_idx + 1]
    text = " ".join(s.text for s in window)
    lower = text.lower()
    start, end = window[0].start, window[-1].end
    duration = max(0.1, end - start)
    words = WORD_RE.findall(lower)
    word_count = max(1, len(words))
    first_sentence = window[0].text.lower()

    hook = 0
    if any(first_sentence.startswith(p) for p in HOOK_STARTERS):
        hook += 40
    first_word = words[0] if words else ""
    if first_word in QUESTION_WORDS:
        hook += 20
    if len(window[0].words) >= 4:
        hook += 15
    hook = min(100, hook + 10)

    question = 25 if "?" in text else 0
    emotional = min(100, sum(10 for w in EMOTIONAL_WORDS if w in lower))
    numbers = min(100, len(re.findall(r"\b\d+([.,]\d+)?\b", text)) * 20)
    advice = min(100, sum(12 for phrase in ADVICE_WORDS if phrase in lower))
    story = min(100, sum(20 for phrase in STORY_WORDS if phrase in lower))
    controversial = min(100, sum(20 for phrase in CONTROVERSIAL_WORDS if phrase in lower))

    energy = min(100, (word_count / duration) * 28)

    silence = _silence_ratio(sentences, start, end)
    silence_score = max(0, 100 - int(silence * 140))

    ends_clearly = 20 if re.search(r"[.!?]$", window[-1].text.strip()) else 0

    self_contained = 20
    if first_word in {"this", "it", "that", "so", "and", "but", "because", "then"}:
        self_contained = 0

    tokens = [t for t in words if t not in STOPWORDS and len(t) > 3]
    freq = {}
    for t in tokens:
        freq[t] = freq.get(t, 0) + 1
    repeated = min(100, sum(15 for v in freq.values() if v >= 2))

    breakdown = {
        "hook_strength": hook,
        "question_curiosity": question,
        "emotional_language": emotional,
        "numbers_specifics": numbers,
        "educational_value": advice,
        "story_structure": story,
        "controversial_take": controversial,
        "speech_energy": round(energy),
        "low_silence": silence_score,
        "clear_ending": ends_clearly,
        "self_contained": self_contained,
        "repeated_keywords": repeated,
    }
    weights = {
        "hook_strength": 0.22,
        "question_curiosity": 0.08,
        "emotional_language": 0.12,
        "numbers_specifics": 0.07,
        "educational_value": 0.12,
        "story_structure": 0.09,
        "controversial_take": 0.07,
        "speech_energy": 0.08,
        "low_silence": 0.06,
        "clear_ending": 0.04,
        "self_contained": 0.03,
        "repeated_keywords": 0.02,
    }
    total = sum(breakdown[k] * weights[k] for k in weights)
    score = max(1, min(99, round(total)))
    return Candidate(start=start, end=end, text=text, score=score, breakdown=breakdown)


def _generate_candidates(sentences: List[Sentence], min_dur: float, max_dur: float) -> List[Candidate]:
    candidates: List[Candidate] = []
    n = len(sentences)
    for i in range(n):
        j = i
        while j < n and sentences[j].end - sentences[i].start < min_dur:
            j += 1
        while j < n and sentences[j].end - sentences[i].start <= max_dur:
            dur = sentences[j].end - sentences[i].start
            if dur >= min_dur:
                candidates.append(_score_window(sentences, i, j))
            j += 1
    return candidates


def _overlaps(a: Candidate, b: Candidate) -> bool:
    return a.start < b.end and b.start < a.end


def select_viral_clips(segments: List[dict], settings) -> List[dict]:
    sentences = build_sentences(segments)
    if not sentences:
        return []
    min_dur, max_dur = duration_range(settings)
    candidates = _generate_candidates(sentences, min_dur, max_dur)
    if not candidates:
        return []
    candidates.sort(key=lambda c: c.score, reverse=True)

    chosen: List[Candidate] = []
    for c in candidates:
        if len(chosen) >= settings.num_clips:
            break
        if settings.allow_overlapping_clips or not any(_overlaps(c, existing) for existing in chosen):
            chosen.append(c)

    chosen.sort(key=lambda c: c.start)
    return [
        {"start": c.start, "end": c.end, "text": c.text, "score": c.score, "breakdown": c.breakdown}
        for c in chosen
    ]


def select_random_clips(segments: List[dict], settings, video_duration: float) -> List[dict]:
    sentences = build_sentences(segments)
    if not sentences:
        return []
    min_dur, max_dur = duration_range(settings)
    candidates = _generate_candidates(sentences, min_dur, max_dur)
    # Avoid low-content windows: require reasonable word density (no long silence / empty frames)
    viable = [c for c in candidates if _silence_ratio(sentences, c.start, c.end) < 0.35]
    if not viable:
        viable = candidates
    if not viable:
        return []

    random.shuffle(viable)
    chosen: List[Candidate] = []
    for c in viable:
        if len(chosen) >= settings.num_clips:
            break
        if settings.allow_overlapping_clips or not any(_overlaps(c, existing) for existing in chosen):
            chosen.append(c)

    chosen.sort(key=lambda c: c.start)
    return [
        {"start": c.start, "end": c.end, "text": c.text, "score": None, "breakdown": None}
        for c in chosen
    ]


def build_manual_clips(manual_ranges: Optional[List[List[float]]], segments: List[dict]) -> List[dict]:
    sentences = build_sentences(segments)
    result = []
    for rng in manual_ranges or []:
        start, end = float(rng[0]), float(rng[1])
        text = " ".join(s.text for s in sentences if s.end > start and s.start < end)
        result.append({"start": start, "end": end, "text": text, "score": None, "breakdown": None})
    return result
