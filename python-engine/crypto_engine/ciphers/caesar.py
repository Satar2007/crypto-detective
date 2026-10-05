from .base import Cipher


class CaesarCipher(Cipher):
    name = "Caesar Cipher"

    @staticmethod
    def _shift_char(ch: str, shift: int) -> str:
        if "A" <= ch <= "Z":
            return chr((ord(ch) - 65 + shift) % 26 + 65)
        if "a" <= ch <= "z":
            return chr((ord(ch) - 97 + shift) % 26 + 97)
        return ch

    def encrypt(self, plaintext: str, key: int) -> str:
        shift = int(key) % 26
        return "".join(self._shift_char(ch, shift) for ch in plaintext)

    def decrypt(self, ciphertext: str, key: int) -> str:
        return self.encrypt(ciphertext, -int(key))
