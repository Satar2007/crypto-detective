import base64
import hashlib
import secrets
from .base import Cipher


class StreamCipher(Cipher):
    """Educational XOR stream cipher using a SHA-256 counter keystream.

    This demonstrates the stream-cipher mechanism for coursework. It is not a
    replacement for a vetted modern cipher such as ChaCha20 or AES-CTR.
    """

    name = "Stream Cipher"

    @staticmethod
    def generate_key() -> str:
        return secrets.token_hex(16)

    @staticmethod
    def _keystream(key: str, n: int) -> bytes:
        key_bytes = str(key).encode("utf-8")
        out = bytearray()
        counter = 0
        while len(out) < n:
            block = hashlib.sha256(key_bytes + counter.to_bytes(8, "big")).digest()
            out.extend(block)
            counter += 1
        return bytes(out[:n])

    def encrypt(self, plaintext: str, key: str) -> str:
        data = plaintext.encode("utf-8")
        ks = self._keystream(key, len(data))
        cipher = bytes(a ^ b for a, b in zip(data, ks))
        return base64.b64encode(cipher).decode("ascii")

    def decrypt(self, ciphertext: str, key: str) -> str:
        try:
            data = base64.b64decode(ciphertext, validate=True)
        except Exception as exc:
            raise ValueError("Stream ciphertext must be valid Base64.") from exc
        ks = self._keystream(key, len(data))
        plain = bytes(a ^ b for a, b in zip(data, ks))
        return plain.decode("utf-8")
