from dataclasses import dataclass, asdict
from typing import Any, Optional


@dataclass
class EncryptResult:
    algorithm: str
    ciphertext: str
    key: Any
    normalized_plaintext: str
    reason: str
    notes: list[str]

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class CrackCandidate:
    algorithm: str
    score: float
    confidence: float
    plaintext: Optional[str] = None
    recovered_key: Any = None
    status: str = "candidate"
    reason: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class CrackResult:
    status: str
    detected_algorithm: Optional[str]
    confidence: float
    plaintext: Optional[str]
    recovered_key: Any
    message: str
    candidates: list[CrackCandidate]

    algorithm_confidence: float = 0.0
    recovery_confidence: float = 0.0
    evidence_strength: str = "NONE"
    attack_method: str = ""
    confidence_reason: str = ""
    algorithm_known: bool = False

    def to_dict(self) -> dict:
        data = asdict(self)
        data["candidates"] = [c.to_dict() for c in self.candidates]
        return data
