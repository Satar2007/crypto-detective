from __future__ import annotations

from .smart_analyzer import SmartCipherAnalyzer
from .models import CrackCandidate, CrackResult
from .utils import letters_only


class RankedSmartCipherAnalyzer(SmartCipherAnalyzer):
    """
    Confidence-calibrated Smart Six-Cipher Analyzer.

    confidence/recovery_confidence:
        Heuristic evidence strength for the recovered plaintext/key.

    algorithm_confidence:
        Heuristic evidence strength for cipher-family identification.
        It is 100 only when algorithm_hint explicitly supplies the algorithm.

    These scores are not statistical probabilities.
    """

    @staticmethod
    def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
        return max(low, min(high, float(value)))

    @staticmethod
    def _strength(confidence: float) -> str:
        value = float(confidence)

        if value <= 0:
            return "NONE"
        if value < 30:
            return "VERY LOW"
        if value < 50:
            return "LOW"
        if value < 70:
            return "MEDIUM"
        if value < 85:
            return "HIGH"
        return "VERY HIGH"

    @staticmethod
    def _vigenere_key(candidate: CrackCandidate) -> str:
        key = candidate.recovered_key
        return "" if key is None else str(key).upper()

    @classmethod
    def _is_caesar_equivalent_vigenere(cls, candidate: CrackCandidate) -> bool:
        if candidate.algorithm != "vigenere":
            return False

        key = cls._vigenere_key(candidate)
        return bool(key) and len(set(key)) == 1

    @staticmethod
    def _productive(candidates: list[CrackCandidate]) -> list[CrackCandidate]:
        return [candidate for candidate in candidates if candidate.plaintext]

    @staticmethod
    def _rank(candidates: list[CrackCandidate]) -> list[CrackCandidate]:
        return sorted(
            candidates,
            key=lambda candidate: float(candidate.score),
            reverse=True,
        )

    @classmethod
    def _adjusted_score(
        cls,
        candidate: CrackCandidate,
        letter_count: int,
    ) -> float:
        score = float(candidate.score)
        algorithm = candidate.algorithm.lower()

        if algorithm == "caesar":
            return score + (3.0 if letter_count < 10 else 1.2)

        if algorithm == "vigenere":
            key = cls._vigenere_key(candidate)
            key_length = max(1, len(key))
            score -= key_length * 0.60

            if letter_count < 10:
                score -= 1.4
            elif letter_count < 20:
                score -= 0.5

            return score

        if algorithm == "hill":
            if letter_count < 10:
                score -= 6.0
            elif letter_count < 20:
                score -= 4.0
            elif letter_count < 40:
                score -= 2.5
            else:
                score -= 1.5

            return score

        if algorithm == "playfair":
            if letter_count < 10:
                score -= 7.0
            elif letter_count < 20:
                score -= 5.0
            elif letter_count < 40:
                score -= 3.0
            else:
                score -= 2.0

            return score

        return score

    @classmethod
    def _family_leader(
        cls,
        candidates: list[CrackCandidate],
        algorithm: str,
    ) -> CrackCandidate | None:
        family = [
            candidate
            for candidate in candidates
            if candidate.algorithm == algorithm and candidate.plaintext
        ]

        if not family:
            return None

        if algorithm == "vigenere":
            genuine = [
                candidate
                for candidate in family
                if not cls._is_caesar_equivalent_vigenere(candidate)
            ]

            # V4.3:
            # Repeated one-symbol Vigenere keys (H, HH, HHH, ...)
            # are mathematically Caesar shifts, not independent evidence.
            # If every Vigenere candidate is Caesar-equivalent, exclude
            # Vigenere from cross-family competition.
            if not genuine:
                return None

            family = genuine

        return cls._rank(family)[0]

    @classmethod
    def _family_recovery_confidence(
        cls,
        algorithm: str,
        candidates: list[CrackCandidate],
        letter_count: int,
    ) -> tuple[float, str]:
        ranked = cls._rank(cls._productive(candidates))

        if not ranked:
            return 0.0, "No plaintext candidate was produced."

        best = ranked[0]
        second_score = (
            float(ranked[1].score)
            if len(ranked) > 1
            else float(best.score) - 2.0
        )
        margin = max(0.0, float(best.score) - second_score)

        if algorithm == "caesar":
            confidence = (
                54.0
                + min(30.0, margin * 6.0)
                + min(15.0, letter_count * 0.65)
            )

            if letter_count < 6:
                confidence = min(confidence, 78.0)
            elif letter_count < 10:
                confidence = min(confidence, 86.0)

            confidence = cls._clamp(confidence, 5.0, 99.0)
            reason = (
                f"Caesar searched all 26 shifts; best-vs-second "
                f"language-score margin={margin:.3f}, letters={letter_count}."
            )
            return confidence, reason

        if algorithm == "vigenere":
            confidence = (
                42.0
                + min(28.0, margin * 5.0)
                + min(24.0, letter_count * 0.30)
            )

            if letter_count < 10:
                confidence = min(confidence, 62.0)
            elif letter_count < 20:
                confidence = min(confidence, 74.0)

            confidence = cls._clamp(confidence, 5.0, 96.0)
            reason = (
                f"Vigenere ranked-key evidence; best-vs-second "
                f"margin={margin:.3f}, letters={letter_count}. "
                f"Short ciphertext is penalized because frequency evidence is unstable."
            )
            return confidence, reason

        if algorithm == "hill":
            confidence = (
                52.0
                + min(35.0, margin * 2.0)
                + min(11.0, letter_count * 0.18)
            )

            if letter_count < 8:
                confidence = min(confidence, 60.0)
            elif letter_count < 16:
                confidence = min(confidence, 76.0)
            elif letter_count >= 30 and margin >= 8.0:
                confidence = max(confidence, 90.0)

            if letter_count >= 40 and margin >= 15.0:
                confidence = max(confidence, 97.0)

            confidence = cls._clamp(confidence, 5.0, 98.0)
            reason = (
                f"Hill 2x2 exhaustive matrix search completed; "
                f"best-vs-second margin={margin:.3f}, letters={letter_count}. "
                f"Large separation after exhaustive search is strong recovery evidence."
            )
            return confidence, reason

        if algorithm == "playfair":
            confidence = (
                28.0
                + min(28.0, margin * 2.4)
                + min(18.0, letter_count * 0.18)
            )

            if letter_count < 16:
                confidence = min(confidence, 42.0)
            elif letter_count < 30:
                confidence = min(confidence, 58.0)

            confidence = cls._clamp(confidence, 5.0, 78.0)
            reason = (
                f"Playfair heuristic key-square search; "
                f"best-vs-second margin={margin:.3f}, letters={letter_count}. "
                f"Confidence is capped because the keyspace is not exhaustively searched."
            )
            return confidence, reason

        return 0.0, "No ciphertext-only recovery score is available."

    @classmethod
    def _apply_candidate_confidence(
        cls,
        candidates: list[CrackCandidate],
        best_confidence: float,
    ) -> list[CrackCandidate]:
        ranked = cls._rank(cls._productive(candidates))

        if not ranked:
            return candidates

        best_score = float(ranked[0].score)

        for index, candidate in enumerate(ranked):
            if index == 0:
                candidate.confidence = round(best_confidence, 2)
                continue

            gap = max(0.0, best_score - float(candidate.score))

            candidate.confidence = round(
                cls._clamp(
                    best_confidence - gap * 4.0 - index * 4.0,
                    1.0,
                    max(1.0, best_confidence - 5.0),
                ),
                2,
            )

        return candidates

    @classmethod
    def _algorithm_confidence_auto(
        cls,
        leaders: list[tuple[float, CrackCandidate]],
        letter_count: int,
    ) -> tuple[float, str]:
        if not leaders:
            return 0.0, "No cipher-family candidate was produced."

        best_adjusted = float(leaders[0][0])
        second_adjusted = (
            float(leaders[1][0])
            if len(leaders) > 1
            else best_adjusted - 2.0
        )
        margin = max(0.0, best_adjusted - second_adjusted)

        confidence = (
            52.0
            + min(34.0, margin * 5.2)
            + min(10.0, letter_count * 0.16)
        )

        if letter_count < 6:
            confidence = min(confidence, 78.0)
        elif letter_count < 10:
            confidence = min(confidence, 85.0)
        elif letter_count < 16:
            confidence = min(confidence, 91.0)

        confidence = cls._clamp(confidence, 5.0, 97.0)
        reason = (
            f"Unknown-cipher family ranking used complexity-calibrated scores; "
            f"best-vs-second family margin={margin:.3f}, letters={letter_count}."
        )
        return confidence, reason

    @classmethod
    def _build_result(
        cls,
        *,
        status: str,
        algorithm: str | None,
        algorithm_confidence: float,
        recovery_confidence: float,
        plaintext: str | None,
        recovered_key,
        message: str,
        candidates: list[CrackCandidate],
        attack_method: str,
        confidence_reason: str,
        algorithm_known: bool,
    ) -> CrackResult:
        recovery_confidence = cls._clamp(recovery_confidence)
        algorithm_confidence = cls._clamp(algorithm_confidence)

        return CrackResult(
            status=status,
            detected_algorithm=algorithm,
            confidence=round(recovery_confidence, 2),
            plaintext=plaintext,
            recovered_key=recovered_key,
            message=message,
            candidates=candidates,
            algorithm_confidence=round(algorithm_confidence, 2),
            recovery_confidence=round(recovery_confidence, 2),
            evidence_strength=cls._strength(recovery_confidence),
            attack_method=attack_method,
            confidence_reason=confidence_reason,
            algorithm_known=algorithm_known,
        )

    def _known_algorithm_result(
        self,
        ciphertext: str,
        algorithm: str,
    ) -> CrackResult:
        letter_count = len(letters_only(ciphertext))

        if algorithm == "caesar":
            candidates = self.caesar_candidates(ciphertext)
            recovery, reason = self._family_recovery_confidence(
                "caesar", candidates, letter_count
            )
            self._apply_candidate_confidence(candidates, recovery)
            best = self._rank(self._productive(candidates))[0]

            return self._build_result(
                status="cracked" if recovery >= 85.0 else "ambiguous",
                algorithm="caesar",
                algorithm_confidence=100.0,
                recovery_confidence=recovery,
                plaintext=best.plaintext,
                recovered_key=best.recovered_key,
                message=(
                    "Algorithm was supplied as Caesar. Exhaustive brute force "
                    "tested every shift."
                ),
                candidates=candidates,
                attack_method="Exhaustive Caesar brute force (26 shifts)",
                confidence_reason=reason,
                algorithm_known=True,
            )

        if algorithm == "vigenere":
            candidates = self.vigenere_candidates(ciphertext)

            if not self._productive(candidates):
                parent = super()._analyze_known_algorithm(ciphertext, algorithm)
                parent.algorithm_confidence = 100.0
                parent.recovery_confidence = float(parent.confidence)
                parent.algorithm_known = True
                parent.evidence_strength = self._strength(parent.confidence)
                parent.attack_method = "Vigenere frequency/IC analysis"
                return parent

            recovery, reason = self._family_recovery_confidence(
                "vigenere", candidates, letter_count
            )
            self._apply_candidate_confidence(candidates, recovery)
            best = self._rank(self._productive(candidates))[0]

            return self._build_result(
                status="cracked" if recovery >= 85.0 else "ambiguous",
                algorithm="vigenere",
                algorithm_confidence=100.0,
                recovery_confidence=recovery,
                plaintext=best.plaintext,
                recovered_key=best.recovered_key,
                message=(
                    "Algorithm was supplied as Vigenere. IC/frequency analysis "
                    "and bounded short-key brute force were evaluated."
                ),
                candidates=candidates,
                attack_method="IC/frequency analysis + bounded short-key brute force",
                confidence_reason=reason,
                algorithm_known=True,
            )

        if algorithm == "hill":
            candidates = self.hill_candidates(ciphertext)

            if not self._productive(candidates):
                parent = super()._analyze_known_algorithm(ciphertext, algorithm)
                parent.algorithm_confidence = 100.0
                parent.recovery_confidence = float(parent.confidence)
                parent.algorithm_known = True
                parent.evidence_strength = self._strength(parent.confidence)
                parent.attack_method = "Hill 2x2 exhaustive matrix search"
                return parent

            recovery, reason = self._family_recovery_confidence(
                "hill", candidates, letter_count
            )
            self._apply_candidate_confidence(candidates, recovery)
            best = self._rank(self._productive(candidates))[0]

            return self._build_result(
                status="cracked" if recovery >= 85.0 else "ambiguous",
                algorithm="hill",
                algorithm_confidence=100.0,
                recovery_confidence=recovery,
                plaintext=best.plaintext,
                recovered_key=best.recovered_key,
                message=(
                    "Algorithm was supplied as Hill. Every invertible 2x2 matrix "
                    "was searched."
                ),
                candidates=candidates,
                attack_method="Exhaustive Hill 2x2 matrix search",
                confidence_reason=reason,
                algorithm_known=True,
            )

        if algorithm == "playfair":
            candidates = self.playfair_candidates(ciphertext)

            if not self._productive(candidates):
                parent = super()._analyze_known_algorithm(ciphertext, algorithm)
                parent.algorithm_confidence = 100.0
                parent.recovery_confidence = float(parent.confidence)
                parent.algorithm_known = True
                parent.evidence_strength = self._strength(parent.confidence)
                parent.attack_method = "Playfair heuristic key-square search"
                return parent

            recovery, reason = self._family_recovery_confidence(
                "playfair", candidates, letter_count
            )
            self._apply_candidate_confidence(candidates, recovery)
            best = self._rank(self._productive(candidates))[0]

            return self._build_result(
                status="cracked" if recovery >= 85.0 else "ambiguous",
                algorithm="playfair",
                algorithm_confidence=100.0,
                recovery_confidence=recovery,
                plaintext=best.plaintext,
                recovered_key=best.recovered_key,
                message=(
                    "Algorithm was supplied as Playfair. The attack uses "
                    "heuristic key-square search."
                ),
                candidates=candidates,
                attack_method="Heuristic Playfair key-square search",
                confidence_reason=reason,
                algorithm_known=True,
            )

        if algorithm in {"otp", "stream"}:
            parent = super()._analyze_known_algorithm(ciphertext, algorithm)

            return self._build_result(
                status=parent.status,
                algorithm=algorithm,
                algorithm_confidence=100.0,
                recovery_confidence=0.0,
                plaintext=None,
                recovered_key=None,
                message=parent.message,
                candidates=parent.candidates,
                attack_method=(
                    "OTP ciphertext-only impossibility check"
                    if algorithm == "otp"
                    else "Stream-cipher key/keystream requirement check"
                ),
                confidence_reason=(
                    "The algorithm is known, but ciphertext alone does not provide "
                    "the missing OTP key or stream-cipher keystream."
                ),
                algorithm_known=True,
            )

        raise ValueError(f"Unsupported algorithm hint: {algorithm}")

    def analyze(
        self,
        ciphertext: str,
        algorithm_hint: str | None = None,
    ) -> CrackResult:
        if not ciphertext or not ciphertext.strip():
            raise ValueError("Ciphertext cannot be empty.")

        if algorithm_hint is not None:
            algorithm = str(algorithm_hint).lower().strip()

            if algorithm not in self.SUPPORTED_ALGORITHMS:
                raise ValueError(f"Unsupported algorithm hint: {algorithm}")

            return self._known_algorithm_result(ciphertext, algorithm)

        if self._looks_encoded_base64(ciphertext) or self._looks_hex(ciphertext):
            parent = super().analyze(ciphertext)
            parent.algorithm_confidence = 0.0
            parent.recovery_confidence = 0.0
            parent.confidence = 0.0
            parent.evidence_strength = "NONE"
            parent.attack_method = "Encoded-binary family detection"
            parent.confidence_reason = (
                "Encoded binary ciphertext can be compatible with OTP or a "
                "stream cipher; ciphertext alone cannot reliably distinguish them."
            )
            parent.algorithm_known = False
            return parent

        letters = letters_only(ciphertext)
        letter_count = len(letters)

        if letter_count == 0:
            return self._build_result(
                status="undetermined",
                algorithm=None,
                algorithm_confidence=0.0,
                recovery_confidence=0.0,
                plaintext=None,
                recovered_key=None,
                message="No A-Z classical-cipher material was found.",
                candidates=[],
                attack_method="None",
                confidence_reason="No analyzable alphabetic ciphertext.",
                algorithm_known=False,
            )

        caesar = self.caesar_candidates(ciphertext)
        vigenere = self.vigenere_candidates(ciphertext)

        hill: list[CrackCandidate] = []
        if 4 <= letter_count <= 100:
            hill = self.hill_candidates(ciphertext)

        playfair: list[CrackCandidate] = []
        if letter_count >= 6 and letter_count % 2 == 0:
            playfair = self.playfair_candidates(ciphertext)

        # V4.1: calibrate EVERY productive family, not only the winning family.
        family_sets = {
            "caesar": caesar,
            "vigenere": vigenere,
            "hill": hill,
            "playfair": playfair,
        }

        for family_name, family_candidates in family_sets.items():
            if not self._productive(family_candidates):
                continue

            family_confidence, _family_reason = self._family_recovery_confidence(
                family_name,
                family_candidates,
                letter_count,
            )

            self._apply_candidate_confidence(
                family_candidates,
                family_confidence,
            )

        all_candidates = caesar + vigenere + hill + playfair

        leaders: list[tuple[float, CrackCandidate]] = []

        for algorithm in ("caesar", "vigenere", "hill", "playfair"):
            leader = self._family_leader(all_candidates, algorithm)

            if leader is not None:
                leaders.append(
                    (
                        self._adjusted_score(leader, letter_count),
                        leader,
                    )
                )

        leaders.sort(key=lambda item: item[0], reverse=True)

        if not leaders:
            return self._build_result(
                status="undetermined",
                algorithm=None,
                algorithm_confidence=0.0,
                recovery_confidence=0.0,
                plaintext=None,
                recovered_key=None,
                message="No plaintext candidate was produced.",
                candidates=all_candidates,
                attack_method="Multi-cipher analysis",
                confidence_reason="No productive cipher-family candidate.",
                algorithm_known=False,
            )

        algorithm_confidence, algorithm_reason = self._algorithm_confidence_auto(
            leaders,
            letter_count,
        )

        _, best = leaders[0]
        best_algorithm = best.algorithm

        family_candidates = [
            candidate
            for candidate in all_candidates
            if candidate.algorithm == best_algorithm
        ]

        family_recovery, recovery_reason = self._family_recovery_confidence(
            best_algorithm,
            family_candidates,
            letter_count,
        )

        # Keep the winning family synchronized with the final recovery score.
        self._apply_candidate_confidence(
            family_candidates,
            family_recovery,
        )

        # V4.2 semantic fix:
        # recovery_confidence measures the strength of the recovered
        # plaintext/key INSIDE the selected cipher family.  It must not be
        # numerically capped by algorithm_confidence, because the two answer
        # different questions.
        final_recovery = family_recovery

        productive_family = self._rank(self._productive(family_candidates))
        family_best = productive_family[0] if productive_family else best

        status = (
            "cracked"
            if final_recovery >= 85.0 and algorithm_confidence >= 80.0
            else "ambiguous"
        )

        leader_text = ", ".join(
            f"{leader.algorithm}={score:.2f}"
            for score, leader in leaders
        )

        return self._build_result(
            status=status,
            algorithm=best_algorithm,
            algorithm_confidence=algorithm_confidence,
            recovery_confidence=final_recovery,
            plaintext=family_best.plaintext,
            recovered_key=family_best.recovered_key,
            message=(
                "Smart Six-Cipher Analyzer compared feasible attacks using "
                "complexity-calibrated family ranking. Confidence values are "
                "heuristic evidence scores, not statistical probabilities. "
                f"Family scores: {leader_text}"
            ),
            candidates=all_candidates,
            attack_method="Multi-cipher ranked cryptanalysis",
            confidence_reason=algorithm_reason + " " + recovery_reason,
            algorithm_known=False,
        )
