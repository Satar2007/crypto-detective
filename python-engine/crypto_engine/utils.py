import math
import re
from collections import Counter

ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

# Lightweight language model for educational cracking. It intentionally combines
# Indonesian and English indicators because classroom examples may use either.
COMMON_WORDS = {
    "DAN", "YANG", "DI", "KE", "DARI", "UNTUK", "DENGAN", "INI", "ITU",
    "BELAJAR", "KRIPTOGRAFI", "PESAN", "RAHASIA", "KITA", "SAYA", "KAMU",
    "BESOK", "JAM", "KAMPUS", "TEMAN", "EMAIL", "ALICE", "BOB",
    "THE", "AND", "THIS", "THAT", "HELLO", "WORLD", "MESSAGE", "SECRET",
}

# Approximate Indonesian-oriented letter frequencies. Exact values are not vital
# here; the scorer is a heuristic for the educational analyzer.
ID_FREQ = {
    "A": 0.190, "B": 0.025, "C": 0.012, "D": 0.035, "E": 0.087,
    "F": 0.003, "G": 0.032, "H": 0.025, "I": 0.085, "J": 0.010,
    "K": 0.052, "L": 0.033, "M": 0.030, "N": 0.095, "O": 0.030,
    "P": 0.025, "Q": 0.001, "R": 0.045, "S": 0.050, "T": 0.050,
    "U": 0.045, "V": 0.001, "W": 0.004, "X": 0.001, "Y": 0.018,
    "Z": 0.001,
}

COMMON_BIGRAMS = (
    "AN", "IN", "EN", "ER", "AR", "NG", "KA", "TA", "DA", "RA", "LA",
    "SA", "MA", "PA", "BA", "DI", "KE", "SE", "ME", "PE", "BE",
    "TH", "HE", "IN", "ER", "AN", "RE", "ON", "AT",
)


def letters_only(text: str) -> str:
    return "".join(ch for ch in text.upper() if ch in ALPHABET)


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip())


def index_of_coincidence(text: str) -> float:
    s = letters_only(text)
    n = len(s)
    if n < 2:
        return 0.0
    counts = Counter(s)
    return sum(v * (v - 1) for v in counts.values()) / (n * (n - 1))


def chi_square_language(text: str) -> float:
    s = letters_only(text)
    n = len(s)
    if n == 0:
        return float("inf")
    counts = Counter(s)
    chi = 0.0
    for ch in ALPHABET:
        expected = max(ID_FREQ.get(ch, 1e-6) * n, 1e-6)
        observed = counts.get(ch, 0)
        chi += (observed - expected) ** 2 / expected
    return chi


def language_score(text: str) -> float:
    """Higher is better. Suitable for ranking candidate plaintexts, not proof."""
    if not text:
        return -1e9
    upper = text.upper()
    letters = letters_only(upper)
    if not letters:
        return -1e9

    score = 0.0
    # Reward likely words.
    words = re.findall(r"[A-Z]+", upper)
    for w in words:
        if w in COMMON_WORDS:
            score += 7.5 + min(len(w), 8) * 0.4
        elif len(w) >= 3 and any(bg in w for bg in COMMON_BIGRAMS):
            score += 0.4

    # Reward common bigrams throughout continuous text.
    compact = letters
    score += sum(compact.count(bg) for bg in COMMON_BIGRAMS) * 0.35

    # Penalize unlikely frequency distributions but keep scale modest.
    chi = chi_square_language(upper)
    score -= min(chi, 400.0) * 0.025

    # Penalize very long consonant clusters.
    score -= len(re.findall(r"[BCDFGHJKLMNPQRSTVWXYZ]{5,}", upper)) * 3.0
    return score


def score_to_confidence(best: float, second: float | None = None) -> float:
    if not math.isfinite(best):
        return 0.0
    margin = best - second if second is not None and math.isfinite(second) else best
    # Conservative confidence mapping for heuristic analysis.
    return max(0.0, min(99.0, 50.0 + margin * 4.0))
