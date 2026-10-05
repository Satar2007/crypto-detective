import base64
from dataclasses import dataclass

from .utils import (
    ALPHABET,
    chi_square_language,
    index_of_coincidence,
    language_score,
    letters_only,
)

from .models import CrackCandidate, CrackResult
from .ciphers.caesar import CaesarCipher
from .ciphers.vigenere import VigenereCipher


@dataclass
class VigenereGuess:
    key: str
    plaintext: str
    score: float
    key_length: int


class CipherAnalyzer:
    SUPPORTED_ALGORITHMS = {
        "caesar",
        "vigenere",
        "playfair",
        "hill",
        "otp",
        "stream",
    }

    def __init__(self):
        self.caesar = CaesarCipher()
        self.vigenere = VigenereCipher()

    def crack_caesar(self, ciphertext: str) -> CrackCandidate:
        ranked = []

        for shift in range(26):
            plain = self.caesar.decrypt(
                ciphertext,
                shift,
            )

            ranked.append(
                (
                    language_score(plain),
                    shift,
                    plain,
                )
            )

        ranked.sort(
            reverse=True,
            key=lambda x: x[0],
        )

        best = ranked[0]

        second = (
            ranked[1]
            if len(ranked) > 1
            else (
                best[0] - 1,
                0,
                "",
            )
        )

        margin = best[0] - second[0]

        confidence = max(
            5.0,
            min(
                99.0,
                55.0 + margin * 5.5,
            ),
        )

        return CrackCandidate(
            algorithm="caesar",
            score=best[0],
            confidence=confidence,
            plaintext=best[2],
            recovered_key=best[1],
            status="cracked",
            reason=(
                "Mencoba seluruh 26 shift dan memilih "
                "plaintext dengan skor bahasa tertinggi."
            ),
        )

    @staticmethod
    def _decrypt_column(
        column: str,
        shift: int,
    ) -> str:
        return "".join(
            chr(
                (
                    ord(ch)
                    - 65
                    - shift
                )
                % 26
                + 65
            )
            for ch in column
        )

    def _best_shift_for_column(
        self,
        column: str,
    ) -> int:
        best_shift = 0
        best_chi = float("inf")

        for shift in range(26):
            plain = self._decrypt_column(
                column,
                shift,
            )

            chi = chi_square_language(
                plain
            )

            if chi < best_chi:
                best_chi = chi
                best_shift = shift

        return best_shift

    def _candidate_key_lengths(
        self,
        ciphertext: str,
        max_len: int = 12,
    ) -> list[int]:
        s = letters_only(ciphertext)

        if len(s) < 16:
            return [2]

        upper = min(
            max_len,
            max(
                2,
                len(s) // 4,
            ),
        )

        scored = []

        for k in range(
            2,
            upper + 1,
        ):
            cols = [
                s[i::k]
                for i in range(k)
            ]

            avg_ic = (
                sum(
                    index_of_coincidence(c)
                    for c in cols
                )
                / k
            )

            distance = abs(
                avg_ic - 0.065
            )

            scored.append(
                (
                    distance,
                    k,
                )
            )

        scored.sort()

        return [
            k
            for _, k in scored[
                : min(
                    6,
                    len(scored),
                )
            ]
        ]

    def crack_vigenere(
        self,
        ciphertext: str,
    ) -> CrackCandidate:
        s = letters_only(ciphertext)

        if len(s) < 16:
            return CrackCandidate(
                algorithm="vigenere",
                score=-1e9,
                confidence=3.0,
                status="insufficient_data",
                reason=(
                    "Ciphertext terlalu pendek untuk "
                    "analisis frekuensi Vigenere "
                    "yang stabil."
                ),
            )

        guesses: list[VigenereGuess] = []

        for k in self._candidate_key_lengths(
            ciphertext
        ):
            shifts = []

            for i in range(k):
                col = s[i::k]

                shifts.append(
                    self._best_shift_for_column(
                        col
                    )
                )

            key = "".join(
                ALPHABET[shift]
                for shift in shifts
            )

            plain = self.vigenere.decrypt(
                ciphertext,
                key,
            )

            score = language_score(
                plain
            )

            # Hindari overfitting key panjang.
            score -= k * 0.12

            # Key dengan satu huruf berulang
            # secara matematis ekuivalen Caesar.
            if len(set(key)) == 1:
                score -= 25.0

            guesses.append(
                VigenereGuess(
                    key=key,
                    plaintext=plain,
                    score=score,
                    key_length=k,
                )
            )

        guesses.sort(
            key=lambda g: g.score,
            reverse=True,
        )

        best = guesses[0]

        second_score = (
            guesses[1].score
            if len(guesses) > 1
            else best.score - 1
        )

        margin = (
            best.score
            - second_score
        )

        confidence = max(
            5.0,
            min(
                94.0,
                45.0
                + margin * 4.0
                + min(
                    len(s),
                    120,
                )
                * 0.08,
            ),
        )

        return CrackCandidate(
            algorithm="vigenere",
            score=best.score,
            confidence=confidence,
            plaintext=best.plaintext,
            recovered_key=best.key,
            status="cracked_candidate",
            reason=(
                "Estimasi IC + analisis frekuensi "
                f"menghasilkan kandidat key panjang "
                f"{best.key_length}."
            ),
        )

    @staticmethod
    def _looks_encoded_base64(
        text: str,
    ) -> bool:
        """
        Deteksi payload Base64 yang lebih konservatif.

        Cipher klasik proyek ini umumnya berupa
        huruf kapital A-Z dan spasi.

        OTP/Stream menghasilkan Base64 yang dapat
        berisi:
        - huruf kecil
        - digit
        - +
        - /
        - =
        """
        compact = "".join(
            text.split()
        )

        if (
            len(compact) < 8
            or len(compact) % 4 != 0
        ):
            return False

        has_base64_marker = any(
            ch.islower()
            or ch.isdigit()
            or ch in "+/="
            for ch in compact
        )

        if not has_base64_marker:
            return False

        try:
            raw = base64.b64decode(
                compact,
                validate=True,
            )

            return len(raw) > 0

        except Exception:
            return False

    def _key_required_result(
        self,
        algorithm: str,
    ) -> CrackResult:
        reasons = {
            "playfair": (
                "Algoritma diketahui sebagai Playfair, "
                "tetapi ciphertext saja tidak cukup "
                "untuk memperoleh key secara andal."
            ),

            "hill": (
                "Algoritma diketahui sebagai Hill, "
                "tetapi matrix key tidak dapat "
                "ditentukan secara andal hanya dari "
                "ciphertext ini."
            ),

            "otp": (
                "Algoritma diketahui sebagai OTP. "
                "OTP yang digunakan dengan key acak "
                "sekali pakai dan sepanjang pesan "
                "tidak dapat dipulihkan secara pasti "
                "dari ciphertext saja."
            ),

            "stream": (
                "Algoritma diketahui sebagai Stream "
                "Cipher. Secret key atau keystream "
                "diperlukan untuk memperoleh "
                "plaintext."
            ),
        }

        reason = reasons[algorithm]

        candidate = CrackCandidate(
            algorithm=algorithm,
            score=-2.0,
            confidence=0.0,
            plaintext=None,
            recovered_key=None,
            status="key_required",
            reason=reason,
        )

        return CrackResult(
            status="key_required",
            detected_algorithm=algorithm,
            confidence=0.0,
            plaintext=None,
            recovered_key=None,
            message=reason,
            candidates=[
                candidate
            ],
        )

    def _analyze_known_algorithm(
        self,
        ciphertext: str,
        algorithm: str,
    ) -> CrackResult:
        if algorithm == "caesar":
            candidate = self.crack_caesar(
                ciphertext
            )

            return CrackResult(
                status="cracked",
                detected_algorithm="caesar",
                confidence=candidate.confidence,
                plaintext=candidate.plaintext,
                recovered_key=(
                    candidate.recovered_key
                ),
                message=(
                    "Caesar berhasil dianalisis "
                    "dengan brute-force 26 shift."
                ),
                candidates=[
                    candidate
                ],
            )

        if algorithm == "vigenere":
            candidate = self.crack_vigenere(
                ciphertext
            )

            if (
                candidate.status
                == "insufficient_data"
            ):
                return CrackResult(
                    status="undetermined",
                    detected_algorithm="vigenere",
                    confidence=(
                        candidate.confidence
                    ),
                    plaintext=None,
                    recovered_key=None,
                    message=(
                        "Algoritma diketahui sebagai "
                        "Vigenere, tetapi ciphertext "
                        "terlalu pendek untuk analisis "
                        "frekuensi yang stabil."
                    ),
                    candidates=[
                        candidate
                    ],
                )

            if candidate.confidence < 60:
                return CrackResult(
                    status="ambiguous",
                    detected_algorithm="vigenere",
                    confidence=(
                        candidate.confidence
                    ),
                    plaintext=(
                        candidate.plaintext
                    ),
                    recovered_key=(
                        candidate.recovered_key
                    ),
                    message=(
                        "Ditemukan kandidat hasil "
                        "analisis Vigenere, tetapi "
                        "confidence belum cukup tinggi "
                        "untuk dianggap pasti."
                    ),
                    candidates=[
                        candidate
                    ],
                )

            return CrackResult(
                status="cracked",
                detected_algorithm="vigenere",
                confidence=(
                    candidate.confidence
                ),
                plaintext=(
                    candidate.plaintext
                ),
                recovered_key=(
                    candidate.recovered_key
                ),
                message=(
                    "Vigenere berhasil dianalisis "
                    "secara heuristik menggunakan "
                    "Index of Coincidence dan "
                    "analisis frekuensi."
                ),
                candidates=[
                    candidate
                ],
            )

        return self._key_required_result(
            algorithm
        )

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
        hint = None

        if algorithm_hint is not None:
            hint = str(
                algorithm_hint
            ).lower().strip()

            if hint not in self.SUPPORTED_ALGORITHMS:
                raise ValueError(
                    "Unsupported algorithm hint: "
                    + hint
                )

        # Dalam simulasi Alice-Bob-Trudy,
        # algoritma boleh diketahui attacker.
        # Yang tetap rahasia adalah key.
        if hint is not None:
            return self._analyze_known_algorithm(
                ciphertext,
                hint,
            )

        # Sangat penting:
        #
        # Jika ciphertext terlihat seperti Base64
        # hasil XOR/binary, jangan paksa isinya
        # dianalisis sebagai Caesar/Vigenere.
        if self._looks_encoded_base64(
            ciphertext
        ):
            otp_candidate = CrackCandidate(
                algorithm="otp",
                score=-2.0,
                confidence=12.0,
                plaintext=None,
                recovered_key=None,
                status="key_required",
                reason=(
                    "Payload Base64 konsisten dengan "
                    "cipher biner seperti OTP. "
                    "Ciphertext saja tidak cukup "
                    "untuk memperoleh key."
                ),
            )

            stream_candidate = CrackCandidate(
                algorithm="stream",
                score=-2.1,
                confidence=12.0,
                plaintext=None,
                recovered_key=None,
                status="key_required",
                reason=(
                    "Payload Base64 konsisten dengan "
                    "stream cipher. Key atau keystream "
                    "diperlukan untuk dekripsi."
                ),
            )

            return CrackResult(
                status="key_required",
                detected_algorithm=None,
                confidence=0.0,
                plaintext=None,
                recovered_key=None,
                message=(
                    "Ciphertext terlihat seperti "
                    "payload Base64/biner. Tanpa "
                    "informasi algoritma dan secret "
                    "key, OTP dan Stream Cipher tidak "
                    "dapat dibedakan atau dipecahkan "
                    "secara andal."
                ),
                candidates=[
                    otp_candidate,
                    stream_candidate,
                ],
            )

        candidates: list[
            CrackCandidate
        ] = []

        letters = letters_only(
            ciphertext
        )

        alpha_ratio = (
            len(letters)
            / max(
                1,
                len(
                    ciphertext.replace(
                        " ",
                        "",
                    )
                ),
            )
        )

        if letters:
            caesar = self.crack_caesar(
                ciphertext
            )

            candidates.append(
                caesar
            )

            vigenere = self.crack_vigenere(
                ciphertext
            )

            candidates.append(
                vigenere
            )

            if (
                len(letters) % 2 == 0
                and alpha_ratio > 0.85
            ):
                candidates.append(
                    CrackCandidate(
                        algorithm="playfair",
                        score=(
                            language_score(
                                ciphertext
                            )
                            - 8
                        ),
                        confidence=18.0,
                        status="key_required",
                        reason=(
                            "Panjang alfabet genap "
                            "konsisten dengan digraph "
                            "Playfair, tetapi ciphertext "
                            "saja tidak cukup untuk "
                            "memastikan key."
                        ),
                    )
                )

                candidates.append(
                    CrackCandidate(
                        algorithm="hill",
                        score=(
                            language_score(
                                ciphertext
                            )
                            - 9
                        ),
                        confidence=16.0,
                        status="key_required",
                        reason=(
                            "Panjang alfabet genap "
                            "konsisten dengan Hill 2x2, "
                            "tetapi matrix key tidak "
                            "dapat dipastikan hanya dari "
                            "ciphertext."
                        ),
                    )
                )

        if not candidates:
            return CrackResult(
                status="undetermined",
                detected_algorithm=None,
                confidence=0.0,
                plaintext=None,
                recovered_key=None,
                message=(
                    "Format ciphertext tidak memberi "
                    "cukup bukti untuk menentukan "
                    "algoritma."
                ),
                candidates=[],
            )

        crackable = [
            candidate
            for candidate in candidates
            if candidate.status
            in {
                "cracked",
                "cracked_candidate",
            }
        ]

        crackable.sort(
            key=lambda candidate:
                candidate.score,
            reverse=True,
        )

        if crackable:
            best = crackable[0]

            second_score = (
                crackable[1].score
                if len(crackable) > 1
                else best.score - 2
            )

            margin = (
                best.score
                - second_score
            )

            if (
                best.score < -4
                or margin < 0.75
            ):
                return CrackResult(
                    status="ambiguous",
                    detected_algorithm=(
                        best.algorithm
                    ),
                    confidence=min(
                        best.confidence,
                        55.0,
                    ),
                    plaintext=(
                        best.plaintext
                    ),
                    recovered_key=(
                        best.recovered_key
                    ),
                    message=(
                        "Ada kandidat plaintext, "
                        "tetapi identifikasi cipher "
                        "belum cukup kuat. Gunakan "
                        "sebagai kandidat, bukan "
                        "kepastian."
                    ),
                    candidates=sorted(
                        candidates,
                        key=lambda candidate:
                            candidate.score,
                        reverse=True,
                    ),
                )

            return CrackResult(
                status="cracked",
                detected_algorithm=(
                    best.algorithm
                ),
                confidence=(
                    best.confidence
                ),
                plaintext=(
                    best.plaintext
                ),
                recovered_key=(
                    best.recovered_key
                ),
                message=(
                    "Cipher kandidat berhasil "
                    "dianalisis secara heuristik."
                ),
                candidates=sorted(
                    candidates,
                    key=lambda candidate:
                        candidate.score,
                    reverse=True,
                ),
            )

        return CrackResult(
            status="key_required",
            detected_algorithm=None,
            confidence=0.0,
            plaintext=None,
            recovered_key=None,
            message=(
                "Ciphertext tidak dapat dipecahkan "
                "secara andal tanpa key."
            ),
            candidates=sorted(
                candidates,
                key=lambda candidate:
                    candidate.score,
                reverse=True,
            ),
        )