import math
import re
import secrets

from .base import Cipher
from ..utils import letters_only


class HillCipher(Cipher):
    name = "Hill Cipher"

    @staticmethod
    def _mod_inverse(a: int, m: int):
        a %= m
        for x in range(1, m):
            if (a * x) % m == 1:
                return x
        return None

    @classmethod
    def _parse_key(cls, key):
        """
        Parse a Hill 2x2 key into (a, b, c, d).

        Accepted examples:
        - [3, 3, 2, 5]
        - [[3, 3], [2, 5]]
        - "3,3,2,5"
        - "3;3;2;5"
        - "3 3 2 5"
        - "[3, 3, 2, 5]"
        """
        if isinstance(key, str):
            # Flexible educational input: accept commas, semicolons, spaces,
            # brackets, and other harmless separators.
            raw_numbers = re.findall(r"-?\d+", key)

            if len(raw_numbers) != 4:
                raise ValueError(
                    "Hill 2x2 key must contain exactly 4 integers. "
                    "Examples: 3,3,2,5 or 3 3 2 5."
                )

            a, b, c, d = [int(x) for x in raw_numbers]

        elif (
            isinstance(key, (list, tuple))
            and len(key) == 4
        ):
            try:
                a, b, c, d = [int(x) for x in key]
            except (TypeError, ValueError) as exc:
                raise ValueError(
                    "Hill 2x2 key must contain exactly 4 integers."
                ) from exc

        elif (
            isinstance(key, (list, tuple))
            and len(key) == 2
            and all(
                isinstance(row, (list, tuple))
                and len(row) == 2
                for row in key
            )
        ):
            try:
                a, b = map(int, key[0])
                c, d = map(int, key[1])
            except (TypeError, ValueError) as exc:
                raise ValueError(
                    "Hill 2x2 matrix entries must be integers."
                ) from exc

        else:
            raise ValueError(
                "Hill 2x2 key format invalid. "
                "Use 4 integers, for example 3,3,2,5."
            )

        determinant_raw = a * d - b * c
        determinant_mod = determinant_raw % 26
        gcd_value = math.gcd(determinant_mod, 26)

        if cls._mod_inverse(determinant_mod, 26) is None:
            raise ValueError(
                "Hill key matrix is not invertible modulo 26. "
                f"Matrix=[[{a},{b}],[{c},{d}]], "
                f"det={determinant_raw}, "
                f"det mod 26={determinant_mod}, "
                f"gcd(det,26)={gcd_value}. "
                "Choose a key whose determinant is relatively prime to 26."
            )

        return (
            a % 26,
            b % 26,
            c % 26,
            d % 26,
        )

    @classmethod
    def generate_key(cls) -> list[int]:
        """
        Generate a random valid/invertible Hill 2x2 matrix modulo 26.
        """
        while True:
            candidate = [
                secrets.randbelow(26),
                secrets.randbelow(26),
                secrets.randbelow(26),
                secrets.randbelow(26),
            ]

            try:
                cls._parse_key(candidate)
                return candidate
            except ValueError:
                continue

    @classmethod
    def key_info(cls, key) -> dict:
        a, b, c, d = cls._parse_key(key)
        determinant_raw = a * d - b * c
        determinant_mod = determinant_raw % 26

        return {
            "matrix": [[a, b], [c, d]],
            "determinant": determinant_raw,
            "determinant_mod_26": determinant_mod,
            "gcd_with_26": math.gcd(determinant_mod, 26),
            "invertible": True,
        }

    @classmethod
    def _inverse_key(cls, key):
        a, b, c, d = cls._parse_key(key)
        det = (a * d - b * c) % 26
        inv_det = cls._mod_inverse(det, 26)

        return (
            (inv_det * d) % 26,
            (inv_det * (-b)) % 26,
            (inv_det * (-c)) % 26,
            (inv_det * a) % 26,
        )

    @staticmethod
    def _apply_pairs(s: str, matrix):
        a, b, c, d = matrix
        out = []

        for i in range(0, len(s), 2):
            x = ord(s[i]) - 65
            y = ord(s[i + 1]) - 65

            out.append(
                chr(
                    (
                        a * x
                        + b * y
                    ) % 26
                    + 65
                )
            )

            out.append(
                chr(
                    (
                        c * x
                        + d * y
                    ) % 26
                    + 65
                )
            )

        return "".join(out)

    def encrypt(self, plaintext: str, key) -> str:
        s = letters_only(plaintext)

        if len(s) % 2:
            s += "X"

        return self._apply_pairs(
            s,
            self._parse_key(key),
        )

    def decrypt(self, ciphertext: str, key) -> str:
        s = letters_only(ciphertext)

        if len(s) % 2:
            raise ValueError(
                "Hill ciphertext length must be even."
            )

        return self._apply_pairs(
            s,
            self._inverse_key(key),
        )
