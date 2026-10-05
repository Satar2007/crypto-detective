from .base import Cipher
from ..utils import letters_only


class PlayfairCipher(Cipher):
    name = "Playfair Cipher"

    @staticmethod
    def _square(key: str):
        key = letters_only(str(key)).replace("J", "I")
        if not key:
            raise ValueError("Playfair key must contain letters.")
        seq = []
        seen = set()
        for ch in key + "ABCDEFGHIKLMNOPQRSTUVWXYZ":
            if ch not in seen:
                seen.add(ch)
                seq.append(ch)
        grid = [seq[i:i+5] for i in range(0, 25, 5)]
        pos = {grid[r][c]: (r, c) for r in range(5) for c in range(5)}
        return grid, pos

    @staticmethod
    def _prepare_plaintext(text: str) -> str:
        s = letters_only(text).replace("J", "I")
        out = []
        i = 0
        while i < len(s):
            a = s[i]
            if i + 1 >= len(s):
                out.extend([a, "X"])
                i += 1
            else:
                b = s[i + 1]
                if a == b:
                    out.extend([a, "X"])
                    i += 1
                else:
                    out.extend([a, b])
                    i += 2
        return "".join(out)

    def _transform_pair(self, a: str, b: str, grid, pos, direction: int):
        ra, ca = pos[a]
        rb, cb = pos[b]
        if ra == rb:
            return grid[ra][(ca + direction) % 5] + grid[rb][(cb + direction) % 5]
        if ca == cb:
            return grid[(ra + direction) % 5][ca] + grid[(rb + direction) % 5][cb]
        return grid[ra][cb] + grid[rb][ca]

    def encrypt(self, plaintext: str, key: str) -> str:
        grid, pos = self._square(key)
        prepared = self._prepare_plaintext(plaintext)
        return "".join(
            self._transform_pair(prepared[i], prepared[i+1], grid, pos, 1)
            for i in range(0, len(prepared), 2)
        )

    def decrypt(self, ciphertext: str, key: str) -> str:
        grid, pos = self._square(key)
        s = letters_only(ciphertext).replace("J", "I")
        if len(s) % 2:
            raise ValueError("Playfair ciphertext length must be even.")
        return "".join(
            self._transform_pair(s[i], s[i+1], grid, pos, -1)
            for i in range(0, len(s), 2)
        )
