import unittest

from crypto_engine.ciphers.hill import HillCipher
from crypto_engine.service import CryptoService


class HillKeyV1Tests(unittest.TestCase):
    def setUp(self):
        self.cipher = HillCipher()

    def test_multiple_valid_keys_round_trip(self):
        plaintext = "BELAJAR KRIPTOGRAFI"
        expected = "BELAJARKRIPTOGRAFI"

        valid_keys = [
            [3, 3, 2, 5],
            [5, 8, 17, 3],
            [7, 8, 19, 3],
            [11, 8, 3, 7],
        ]

        for key in valid_keys:
            with self.subTest(key=key):
                encrypted = self.cipher.encrypt(
                    plaintext,
                    key,
                )
                decrypted = self.cipher.decrypt(
                    encrypted,
                    key,
                )
                self.assertEqual(expected, decrypted)

    def test_flexible_string_formats(self):
        formats = [
            "7,8,19,3",
            "7;8;19;3",
            "7 8 19 3",
            "[7, 8, 19, 3]",
            "[[7,8],[19,3]]",
        ]

        outputs = [
            self.cipher.encrypt(
                "BELAJAR KRIPTOGRAFI",
                key,
            )
            for key in formats
        ]

        self.assertTrue(
            all(output == outputs[0] for output in outputs)
        )

    def test_invalid_matrix_has_clear_reason(self):
        with self.assertRaisesRegex(
            ValueError,
            r"not invertible modulo 26.*gcd\(det,26\)=2",
        ):
            self.cipher.encrypt(
                "BELAJAR",
                [1, 2, 3, 4],
            )

    def test_generated_keys_are_valid(self):
        generated = [
            HillCipher.generate_key()
            for _ in range(12)
        ]

        for key in generated:
            parsed = HillCipher._parse_key(key)
            self.assertEqual(4, len(parsed))

        # This also guards against accidentally returning the same old
        # hard-coded example every time.
        self.assertGreater(
            len({tuple(key) for key in generated}),
            1,
        )

    def test_service_generates_random_valid_hill_key(self):
        service = CryptoService()

        keys = [
            service._generate_key(
                "hill",
                "BELAJAR KRIPTOGRAFI",
            )
            for _ in range(8)
        ]

        for key in keys:
            HillCipher._parse_key(key)

        self.assertGreater(
            len({tuple(key) for key in keys}),
            1,
        )


if __name__ == "__main__":
    unittest.main()
