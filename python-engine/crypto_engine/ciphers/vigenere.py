from .base import Cipher


class VigenereCipher(Cipher):
    name = "Vigenère Cipher"

    @staticmethod
    def _clean_key(key: str) -> str:
        key = "".join(ch for ch in str(key).upper() if "A" <= ch <= "Z")
        if not key:
            raise ValueError("Vigenère key must contain at least one letter A-Z.")
        return key

    def _transform(self, text: str, key: str, decrypt: bool = False) -> str:
        k = self._clean_key(key)
        out = []
        j = 0
        for ch in text:
            if ch.isalpha() and ch.upper() <= "Z" and ch.upper() >= "A":
                base = ord("A") if ch.isupper() else ord("a")
                shift = ord(k[j % len(k)]) - 65
                if decrypt:
                    shift = -shift
                out.append(chr((ord(ch) - base + shift) % 26 + base))
                j += 1
            else:
                out.append(ch)
        return "".join(out)

    def encrypt(self, plaintext: str, key: str) -> str:
        return self._transform(plaintext, key, False)

    def decrypt(self, ciphertext: str, key: str) -> str:
        return self._transform(ciphertext, key, True)
