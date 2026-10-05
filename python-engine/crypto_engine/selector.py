from dataclasses import dataclass
from .utils import letters_only


@dataclass
class Selection:
    algorithm: str
    reason: str


class CipherSelector:
    """Deterministic classroom heuristic for choosing among the six required ciphers.

    This is deliberately an educational policy, not a claim that one classical
    cipher is 'more secure' for a particular message.
    """

    def select(self, plaintext: str) -> Selection:
        text = plaintext.strip()
        if not text:
            raise ValueError("Plaintext cannot be empty.")

        n_bytes = len(text.encode("utf-8"))
        letters = letters_only(text)
        letter_ratio = len(letters) / max(1, len(text.replace(" ", "")))

        if n_bytes <= 12:
            return Selection(
                "caesar",
                "Pesan sangat pendek; Caesar dipilih untuk demo brute-force shift yang mudah dianalisis.",
            )
        if letter_ratio >= 0.90 and len(letters) <= 24:
            return Selection(
                "playfair",
                "Pesan dominan alfabet dan relatif pendek; cocok untuk demonstrasi enkripsi pasangan huruf Playfair.",
            )
        if letter_ratio >= 0.90 and len(letters) <= 40:
            return Selection(
                "hill",
                "Pesan dominan alfabet dengan panjang sedang; Hill 2x2 dipilih untuk demonstrasi transformasi blok matriks.",
            )
        if n_bytes <= 80:
            return Selection(
                "vigenere",
                "Pesan teks berukuran sedang; Vigenère dipilih untuk demonstrasi substitusi polialfabetik.",
            )
        if n_bytes <= 160:
            return Selection(
                "otp",
                "Pesan tidak terlalu panjang; OTP dipilih agar dapat didemonstrasikan key acak sepanjang pesan.",
            )
        return Selection(
            "stream",
            "Pesan panjang; Stream Cipher dipilih untuk demonstrasi pemrosesan keystream berbasis byte.",
        )
