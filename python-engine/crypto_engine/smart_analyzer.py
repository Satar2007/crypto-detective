import base64
import hashlib
import math
import random
import string
from itertools import product

from .analyzer import CipherAnalyzer
from .models import CrackCandidate, CrackResult
from .utils import (
    ALPHABET,
    language_score,
    letters_only,
)


class SmartCipherAnalyzer(CipherAnalyzer):
    """
    Crypto Detective Smart Six-Cipher Analyzer.

    Serangan yang dilakukan:

    Caesar
        Exhaustive 26 shift.

    Vigenere
        Analyzer lama + brute force key pendek.

    Hill 2x2
        Exhaustive semua matrix invertible modulo 26.

    Playfair
        Simulated-annealing heuristic key-square search.

    OTP
        Ciphertext-only exact recovery tidak dipalsukan.

    Stream
        Secret key / keystream tetap diperlukan.
    """

    COMMON_BIGRAMS = {
        "AN", "NG", "DI", "KE", "ER",
        "AR", "RA", "TA", "IN", "EN",
        "SE", "ME", "LA", "AH", "KA",
        "BA", "SA", "PA", "RI", "YA",
        "DA", "MA", "AT", "TI", "BU",
        "AL", "HA", "NA", "LI",

        "TH", "HE", "ON", "RE", "ED",
        "ND", "ES", "OF", "OR", "NT",
        "EA", "TO", "IT", "ST", "IO",
    }

    COMMON_TRIGRAMS = {
        "DAN",
        "YANG",
        "KAN",
        "BER",
        "TER",
        "MEN",
        "PEN",
        "ING",
        "HAL",
        "ALO",
        "NAM",
        "AMA",
        "SAY",
        "AYA",
        "BUD",
        "UDI",
        "BIN",
        "INT",
        "NTA",
        "TAN",
        "ANG",
        "KRI",
        "GRA",
        "RAF",
        "AFI",

        "THE",
        "AND",
        "HER",
        "ERE",
        "ENT",
        "THA",
        "FOR",
    }

    PLAYFAIR_ALPHABET = (
        "ABCDEFGHIKLMNOPQRSTUVWXYZ"
    )

    # =========================================================
    # LANGUAGE SCORE
    # =========================================================

    @staticmethod
    def _az(text: str) -> str:
        return "".join(
            char
            for char in text.upper()
            if "A" <= char <= "Z"
        )

    def _ngram_score(
        self,
        text: str,
    ) -> float:
        value = self._az(text)

        if not value:
            return -1e9

        score = 0.0

        for index in range(
            len(value) - 1
        ):
            if (
                value[
                    index:index + 2
                ]
                in self.COMMON_BIGRAMS
            ):
                score += 0.75

        for index in range(
            len(value) - 2
        ):
            if (
                value[
                    index:index + 3
                ]
                in self.COMMON_TRIGRAMS
            ):
                score += 2.4

        rare_count = sum(
            char in "QXZJ"
            for char in value
        )

        score -= (
            rare_count * 0.25
        )

        vowels = sum(
            char in "AEIOU"
            for char in value
        )

        vowel_ratio = (
            vowels
            / max(
                1,
                len(value),
            )
        )

        score -= (
            abs(
                vowel_ratio - 0.42
            )
            * 7.0
        )

        return score

    def _smart_score(
        self,
        text: str,
    ) -> float:
        return (
            language_score(text)
            + self._ngram_score(text)
        )

    @staticmethod
    def _confidence(
        best_score: float,
        second_score: float,
        maximum: float = 99.0,
    ) -> float:
        margin = (
            best_score
            - second_score
        )

        confidence = (
            48.0
            + max(
                0.0,
                margin,
            )
            * 5.0
        )

        return max(
            5.0,
            min(
                maximum,
                confidence,
            ),
        )

    # =========================================================
    # CAESAR
    # =========================================================

    def caesar_candidates(
        self,
        ciphertext: str,
    ) -> list[CrackCandidate]:

        results = []

        for shift in range(26):
            plaintext = (
                self.caesar.decrypt(
                    ciphertext,
                    shift,
                )
            )

            results.append(
                CrackCandidate(
                    algorithm="caesar",

                    score=self._smart_score(
                        plaintext
                    ),

                    confidence=0.0,

                    plaintext=plaintext,

                    recovered_key=shift,

                    status="candidate",

                    reason=(
                        "Exhaustive Caesar "
                        f"shift {shift}/25."
                    ),
                )
            )

        results.sort(
            key=lambda item:
                item.score,

            reverse=True,
        )

        best = results[0]

        second = results[1]

        confidence = (
            self._confidence(
                best.score,
                second.score,
            )
        )

        letter_count = len(
            letters_only(
                ciphertext
            )
        )

        if letter_count >= 30:
            confidence = max(
                confidence,
                82.0,
            )

        if letter_count < 8:
            confidence = min(
                confidence,
                60.0,
            )

        best.confidence = confidence

        best.status = (
            "cracked"
            if confidence >= 75
            else "cracked_candidate"
        )

        return results

    # =========================================================
    # VIGENERE
    # =========================================================

    def _short_vigenere_candidates(
        self,
        ciphertext: str,
        max_key_length: int = 3,
        keep: int = 8,
    ) -> list[CrackCandidate]:

        letters = letters_only(
            ciphertext
        )

        if len(letters) > 24:
            return []

        best = []

        for key_length in range(
            1,
            max_key_length + 1,
        ):

            for indices in product(
                range(26),
                repeat=key_length,
            ):

                key = "".join(
                    ALPHABET[index]
                    for index
                    in indices
                )

                plaintext = (
                    self.vigenere.decrypt(
                        ciphertext,
                        key,
                    )
                )

                score = (
                    self._smart_score(
                        plaintext
                    )
                    - key_length
                    * 0.2
                )

                candidate = (
                    CrackCandidate(
                        algorithm=
                            "vigenere",

                        score=score,

                        confidence=0.0,

                        plaintext=
                            plaintext,

                        recovered_key=
                            key,

                        status=
                            "cracked_candidate",

                        reason=(
                            "Bounded brute force "
                            f"Vigenere key length "
                            f"{key_length}."
                        ),
                    )
                )

                best.append(
                    candidate
                )

                best.sort(
                    key=lambda item:
                        item.score,

                    reverse=True,
                )

                if len(best) > keep:
                    best.pop()

        return best

    def vigenere_candidates(
        self,
        ciphertext: str,
    ) -> list[CrackCandidate]:

        candidates = []

        # Analyzer Vigenere lama sudah terbukti
        # bekerja untuk ciphertext panjang.
        try:
            base = (
                super()
                .crack_vigenere(
                    ciphertext
                )
            )

            if base.plaintext:
                base.score = (
                    self._smart_score(
                        base.plaintext
                    )
                )

            candidates.append(
                base
            )

        except Exception:
            pass

        candidates.extend(
            self._short_vigenere_candidates(
                ciphertext
            )
        )

        unique = {}

        for candidate in candidates:
            marker = (
                str(
                    candidate
                    .recovered_key
                ),
                candidate.plaintext,
            )

            current = (
                unique.get(
                    marker
                )
            )

            if (
                current is None
                or candidate.score
                    > current.score
            ):
                unique[
                    marker
                ] = candidate

        ranked = sorted(
            unique.values(),

            key=lambda item:
                item.score,

            reverse=True,
        )

        return ranked[:8]

    # =========================================================
    # HILL 2x2
    # =========================================================

    @staticmethod
    def _mod_inverse(
        value: int,
    ) -> int | None:

        value %= 26

        for candidate in range(
            1,
            26,
        ):
            if (
                value
                * candidate
            ) % 26 == 1:
                return candidate

        return None

    @classmethod
    def _hill_decrypt(
        cls,
        ciphertext: str,
        key,
    ) -> str | None:

        a, b, c, d = key

        determinant = (
            a * d
            - b * c
        ) % 26

        inverse_det = (
            cls._mod_inverse(
                determinant
            )
        )

        if inverse_det is None:
            return None

        ia = (
            d * inverse_det
        ) % 26

        ib = (
            -b * inverse_det
        ) % 26

        ic = (
            -c * inverse_det
        ) % 26

        id_value = (
            a * inverse_det
        ) % 26

        text = cls._az(
            ciphertext
        )

        if len(text) % 2:
            text += "X"

        output = []

        for index in range(
            0,
            len(text),
            2,
        ):
            first = (
                ord(
                    text[index]
                )
                - 65
            )

            second = (
                ord(
                    text[index + 1]
                )
                - 65
            )

            p1 = (
                ia * first
                + ib * second
            ) % 26

            p2 = (
                ic * first
                + id_value
                * second
            ) % 26

            output.append(
                chr(
                    p1 + 65
                )
            )

            output.append(
                chr(
                    p2 + 65
                )
            )

        return "".join(
            output
        )

    def hill_candidates(
        self,
        ciphertext: str,
        keep: int = 6,
    ) -> list[CrackCandidate]:

        letters = self._az(
            ciphertext
        )

        if len(letters) < 4:
            return []

        shortlist = []

        for a in range(26):
            for b in range(26):
                for c in range(26):
                    for d in range(26):

                        determinant = (
                            a * d
                            - b * c
                        ) % 26

                        if (
                            math.gcd(
                                determinant,
                                26,
                            )
                            != 1
                        ):
                            continue

                        key = (
                            a,
                            b,
                            c,
                            d,
                        )

                        plaintext = (
                            self._hill_decrypt(
                                letters,
                                key,
                            )
                        )

                        if plaintext is None:
                            continue

                        score = (
                            self._ngram_score(
                                plaintext
                            )
                        )

                        shortlist.append(
                            (
                                score,
                                key,
                                plaintext,
                            )
                        )

                        shortlist.sort(
                            key=lambda item:
                                item[0],

                            reverse=True,
                        )

                        if (
                            len(shortlist)
                            > keep * 4
                        ):
                            shortlist.pop()

        refined = []

        for (
            fast_score,
            key,
            plaintext,
        ) in shortlist:

            refined.append(
                (
                    fast_score
                    + language_score(
                        plaintext
                    ),

                    key,

                    plaintext,
                )
            )

        refined.sort(
            key=lambda item:
                item[0],

            reverse=True,
        )

        result = []

        for (
            score,
            key,
            plaintext,
        ) in refined[:keep]:

            result.append(
                CrackCandidate(
                    algorithm="hill",

                    score=score,

                    confidence=35.0,

                    plaintext=
                        plaintext,

                    recovered_key=
                        list(key),

                    status=
                        "cracked_candidate",

                    reason=(
                        "Exhaustive search "
                        "of invertible Hill "
                        "2x2 matrices."
                    ),
                )
            )

        return result

    # =========================================================
    # PLAYFAIR
    # =========================================================

    @classmethod
    def _playfair_decrypt(
        cls,
        ciphertext: str,
        square: str,
    ) -> str:

        positions = {
            char: (
                index // 5,
                index % 5,
            )

            for index, char
            in enumerate(
                square
            )
        }

        rows = [
            square[
                index:index + 5
            ]

            for index
            in range(
                0,
                25,
                5,
            )
        ]

        letters = (
            cls._az(
                ciphertext
            )
            .replace(
                "J",
                "I",
            )
        )

        if len(letters) % 2:
            letters += "X"

        output = []

        for index in range(
            0,
            len(letters),
            2,
        ):
            first = (
                letters[index]
            )

            second = (
                letters[index + 1]
            )

            if (
                first
                not in positions
                or second
                not in positions
            ):
                continue

            row_a, col_a = (
                positions[first]
            )

            row_b, col_b = (
                positions[second]
            )

            if row_a == row_b:

                output.append(
                    rows[row_a][
                        (
                            col_a - 1
                        )
                        % 5
                    ]
                )

                output.append(
                    rows[row_b][
                        (
                            col_b - 1
                        )
                        % 5
                    ]
                )

            elif col_a == col_b:

                output.append(
                    rows[
                        (
                            row_a - 1
                        )
                        % 5
                    ][col_a]
                )

                output.append(
                    rows[
                        (
                            row_b - 1
                        )
                        % 5
                    ][col_b]
                )

            else:

                output.append(
                    rows[
                        row_a
                    ][col_b]
                )

                output.append(
                    rows[
                        row_b
                    ][col_a]
                )

        return "".join(
            output
        )

    @staticmethod
    def _mutate_playfair(
        square: str,
        rng,
    ) -> str:

        chars = list(
            square
        )

        first = rng.randrange(
            25
        )

        second = rng.randrange(
            25
        )

        (
            chars[first],
            chars[second],
        ) = (
            chars[second],
            chars[first],
        )

        return "".join(
            chars
        )

    def playfair_candidates(
        self,
        ciphertext: str,
        keep: int = 5,
    ) -> list[CrackCandidate]:

        letters = (
            self._az(
                ciphertext
            )
            .replace(
                "J",
                "I",
            )
        )

        if len(letters) < 6:
            return []

        seed_bytes = (
            hashlib
            .sha256(
                letters.encode(
                    "ascii"
                )
            )
            .digest()[:8]
        )

        seed = int.from_bytes(
            seed_bytes,
            "big",
        )

        rng = random.Random(
            seed
        )

        results = []

        for _restart in range(6):

            square_chars = list(
                self.PLAYFAIR_ALPHABET
            )

            rng.shuffle(
                square_chars
            )

            square = "".join(
                square_chars
            )

            plaintext = (
                self._playfair_decrypt(
                    letters,
                    square,
                )
            )

            score = (
                self._ngram_score(
                    plaintext
                )
            )

            temperature = 10.0

            for _iteration in range(
                1800
            ):

                candidate_square = (
                    self._mutate_playfair(
                        square,
                        rng,
                    )
                )

                candidate_plain = (
                    self._playfair_decrypt(
                        letters,
                        candidate_square,
                    )
                )

                candidate_score = (
                    self._ngram_score(
                        candidate_plain
                    )
                )

                difference = (
                    candidate_score
                    - score
                )

                accepted = (
                    difference >= 0
                    or rng.random()
                    < math.exp(
                        difference
                        / max(
                            0.1,
                            temperature,
                        )
                    )
                )

                if accepted:
                    square = (
                        candidate_square
                    )

                    plaintext = (
                        candidate_plain
                    )

                    score = (
                        candidate_score
                    )

                temperature *= (
                    0.997
                )

            results.append(
                CrackCandidate(
                    algorithm=
                        "playfair",

                    score=(
                        score
                        + language_score(
                            plaintext
                        )
                    ),

                    confidence=
                        25.0,

                    plaintext=
                        plaintext,

                    recovered_key=
                        square,

                    status=
                        "cracked_candidate",

                    reason=(
                        "Playfair heuristic "
                        "key-square search."
                    ),
                )
            )

        results.sort(
            key=lambda item:
                item.score,

            reverse=True,
        )

        return results[:keep]

    # =========================================================
    # BINARY FORMAT
    # =========================================================

    @staticmethod
    def _looks_hex(
        text: str,
    ) -> bool:

        compact = "".join(
            text.split()
        )

        if (
            len(compact) < 8
            or len(compact) % 2
        ):
            return False

        return all(
            char
            in string.hexdigits

            for char
            in compact
        )

    # =========================================================
    # KNOWN ALGORITHM
    # =========================================================

    def _analyze_known_algorithm(
        self,
        ciphertext: str,
        algorithm: str,
    ) -> CrackResult:

        if algorithm == "caesar":

            candidates = (
                self.caesar_candidates(
                    ciphertext
                )
            )

            best = candidates[0]

            return CrackResult(
                status=(
                    "cracked"
                    if best.status
                    == "cracked"

                    else "ambiguous"
                ),

                detected_algorithm=
                    "caesar",

                confidence=
                    best.confidence,

                plaintext=
                    best.plaintext,

                recovered_key=
                    best.recovered_key,

                message=(
                    "Caesar brute force "
                    "completed: all "
                    "26 shifts tested."
                ),

                candidates=
                    candidates,
            )

        if algorithm == "vigenere":

            candidates = (
                self.vigenere_candidates(
                    ciphertext
                )
            )

            best = candidates[0]

            return CrackResult(
                status="ambiguous",

                detected_algorithm=
                    "vigenere",

                confidence=
                    best.confidence,

                plaintext=
                    best.plaintext,

                recovered_key=
                    best.recovered_key,

                message=(
                    "Vigenere frequency/"
                    "IC analysis and "
                    "short-key brute force "
                    "completed."
                ),

                candidates=
                    candidates,
            )

        if algorithm == "hill":

            candidates = (
                self.hill_candidates(
                    ciphertext
                )
            )

            if not candidates:
                return super()._analyze_known_algorithm(
                    ciphertext,
                    algorithm,
                )

            best = candidates[0]

            return CrackResult(
                status="ambiguous",

                detected_algorithm=
                    "hill",

                confidence=
                    best.confidence,

                plaintext=
                    best.plaintext,

                recovered_key=
                    best.recovered_key,

                message=(
                    "Hill 2x2 exhaustive "
                    "matrix search completed."
                ),

                candidates=
                    candidates,
            )

        if algorithm == "playfair":

            candidates = (
                self.playfair_candidates(
                    ciphertext
                )
            )

            if not candidates:
                return super()._analyze_known_algorithm(
                    ciphertext,
                    algorithm,
                )

            best = candidates[0]

            return CrackResult(
                status="ambiguous",

                detected_algorithm=
                    "playfair",

                confidence=
                    best.confidence,

                plaintext=
                    best.plaintext,

                recovered_key=
                    best.recovered_key,

                message=(
                    "Playfair heuristic "
                    "search completed."
                ),

                candidates=
                    candidates,
            )

        return super()._analyze_known_algorithm(
            ciphertext,
            algorithm,
        )

    # =========================================================
    # SMART AUTO ANALYSIS
    # =========================================================

    def analyze(
        self,
        ciphertext: str,
        algorithm_hint: str | None = None,
    ) -> CrackResult:

        if (
            not ciphertext
            or not ciphertext.strip()
        ):
            raise ValueError(
                "Ciphertext cannot be empty."
            )

        if algorithm_hint:

            algorithm = (
                algorithm_hint
                .lower()
                .strip()
            )

            if (
                algorithm
                not in
                self.SUPPORTED_ALGORITHMS
            ):
                raise ValueError(
                    "Unsupported "
                    "algorithm hint: "
                    + algorithm
                )

            return (
                self
                ._analyze_known_algorithm(
                    ciphertext,
                    algorithm,
                )
            )

        # OTP/Stream dari proyek menghasilkan
        # payload Base64.
        if (
            self._looks_encoded_base64(
                ciphertext
            )
            or self._looks_hex(
                ciphertext
            )
        ):

            return super().analyze(
                ciphertext
            )

        letters = letters_only(
            ciphertext
        )

        if not letters:

            return CrackResult(
                status="undetermined",

                detected_algorithm=None,

                confidence=0.0,

                plaintext=None,

                recovered_key=None,

                message=(
                    "Tidak ada material "
                    "A-Z yang dapat "
                    "dianalisis."
                ),

                candidates=[],
            )

        candidates = []

        # Caesar: SEMUA 26.
        candidates.extend(
            self.caesar_candidates(
                ciphertext
            )
        )

        # Vigenere.
        candidates.extend(
            self.vigenere_candidates(
                ciphertext
            )
        )

        # Hill.
        if (
            4
            <= len(letters)
            <= 100
        ):
            candidates.extend(
                self.hill_candidates(
                    ciphertext
                )
            )

        # Playfair.
        if (
            len(letters) >= 6
            and len(letters) % 2
            == 0
        ):
            candidates.extend(
                self.playfair_candidates(
                    ciphertext
                )
            )

        productive = [
            item
            for item
            in candidates

            if item.plaintext
        ]

        productive.sort(
            key=lambda item:
                item.score,

            reverse=True,
        )

        if not productive:

            return CrackResult(
                status="undetermined",

                detected_algorithm=None,

                confidence=0.0,

                plaintext=None,

                recovered_key=None,

                message=(
                    "Tidak ada kandidat "
                    "plaintext yang "
                    "berhasil dihasilkan."
                ),

                candidates=
                    candidates,
            )

        best = productive[0]

        second_score = (
            productive[1].score

            if len(productive)
            > 1

            else best.score - 2
        )

        confidence = (
            self._confidence(
                best.score,
                second_score,
            )
        )

        if len(letters) < 10:
            confidence = min(
                confidence,
                60.0,
            )

        status = (
            "cracked"

            if confidence >= 76

            else "ambiguous"
        )

        return CrackResult(
            status=status,

            detected_algorithm=
                best.algorithm,

            confidence=
                confidence,

            plaintext=
                best.plaintext,

            recovered_key=
                best.recovered_key,

            message=(
                "Smart Six-Cipher Analyzer "
                "telah mencoba seluruh "
                "serangan feasible. "
                "Untuk ciphertext pendek, "
                "lihat semua kandidat "
                "karena jawaban dapat ambigu."
            ),

            candidates=
                candidates,
        )