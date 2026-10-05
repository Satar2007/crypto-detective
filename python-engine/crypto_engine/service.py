import secrets

from .models import EncryptResult
from .selector import CipherSelector
from .ranked_analyzer import RankedSmartCipherAnalyzer
from .ciphers.caesar import CaesarCipher
from .ciphers.vigenere import VigenereCipher
from .ciphers.playfair import PlayfairCipher
from .ciphers.hill import HillCipher
from .ciphers.otp import OneTimePadCipher
from .ciphers.stream import StreamCipher


class CryptoService:
    def __init__(self):
        self.selector = CipherSelector()
        self.analyzer = RankedSmartCipherAnalyzer()

        self.ciphers = {
            "caesar": CaesarCipher(),
            "vigenere": VigenereCipher(),
            "playfair": PlayfairCipher(),
            "hill": HillCipher(),
            "otp": OneTimePadCipher(),
            "stream": StreamCipher(),
        }

    @staticmethod
    def _generate_key(
        algorithm: str,
        plaintext: str,
    ):
        if algorithm == "caesar":
            return (
                secrets.randbelow(25)
                + 1
            )

        if algorithm == "vigenere":
            alphabet = (
                "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
            )

            return "".join(
                secrets.choice(
                    alphabet
                )
                for _ in range(6)
            )

        if algorithm == "playfair":
            alphabet = (
                "ABCDEFGHIKLMNOPQRSTUVWXYZ"
            )

            return "".join(
                secrets.choice(
                    alphabet
                )
                for _ in range(8)
            )

        if algorithm == "hill":
            return HillCipher.generate_key()
        if algorithm == "otp":
            return (
                OneTimePadCipher
                .generate_key_for_text(
                    plaintext
                )
            )

        if algorithm == "stream":
            return (
                StreamCipher
                .generate_key()
            )

        raise ValueError(
            f"Unknown algorithm: {algorithm}"
        )

    def encrypt(
        self,
        plaintext: str,
        algorithm: str = "auto",
        key=None,
    ) -> EncryptResult:
        if (
            not plaintext
            or not plaintext.strip()
        ):
            raise ValueError(
                "Plaintext cannot be empty."
            )

        if algorithm == "auto":
            selected = (
                self.selector.select(
                    plaintext
                )
            )

            algorithm = (
                selected.algorithm
            )

            reason = (
                selected.reason
            )

        else:
            algorithm = (
                algorithm.lower().strip()
            )

            if algorithm not in self.ciphers:
                raise ValueError(
                    "Unsupported algorithm: "
                    + algorithm
                )

            reason = (
                "Algoritma dipilih manual "
                "untuk pengujian atau demonstrasi."
            )

        if key is None:
            key = self._generate_key(
                algorithm,
                plaintext,
            )

        cipher = self.ciphers[
            algorithm
        ]

        ciphertext = cipher.encrypt(
            plaintext,
            key,
        )

        normalized = plaintext
        notes = []

        if algorithm == "playfair":
            normalized = (
                PlayfairCipher
                ._prepare_plaintext(
                    plaintext
                )
            )

            notes.append(
                "Playfair menghapus spasi/tanda baca, "
                "menyatukan J→I, dan dapat menambah "
                "filler X."
            )

        elif algorithm == "hill":
            from .utils import letters_only

            normalized = letters_only(
                plaintext
            )

            if len(normalized) % 2:
                normalized += "X"

            notes.append(
                "Hill 2x2 bekerja pada A-Z dan "
                "dapat menambah padding X."
            )

        elif algorithm == "otp":
            notes.append(
                "Key OTP dibuat acak dan sama "
                "panjang dengan plaintext dalam byte; "
                "key tidak boleh digunakan ulang."
            )

        elif algorithm == "stream":
            notes.append(
                "Stream cipher di proyek ini adalah "
                "implementasi edukasional XOR dengan "
                "SHA-256 counter keystream."
            )

        return EncryptResult(
            algorithm=algorithm,
            ciphertext=ciphertext,
            key=key,
            normalized_plaintext=normalized,
            reason=reason,
            notes=notes,
        )

    def decrypt(
        self,
        algorithm: str,
        ciphertext: str,
        key,
    ):
        algorithm = (
            algorithm.lower().strip()
        )

        if algorithm not in self.ciphers:
            raise ValueError(
                "Unsupported algorithm: "
                + algorithm
            )

        return self.ciphers[
            algorithm
        ].decrypt(
            ciphertext,
            key,
        )

    def crack(
        self,
        ciphertext: str,
        algorithm_hint: str | None = None,
    ):
        return self.analyzer.analyze(
            ciphertext,
            algorithm_hint=algorithm_hint,
        )