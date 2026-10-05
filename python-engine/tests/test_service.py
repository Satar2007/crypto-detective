import unittest

from crypto_engine import CryptoService


class ServiceTests(unittest.TestCase):
    def setUp(self):
        self.service = CryptoService()

    def test_all_manual_algorithms_encrypt_and_decrypt(self):
        cases = [
            ("caesar", "BELAJAR KRIPTOGRAFI", 5),
            ("vigenere", "BELAJAR KRIPTOGRAFI", "KUNCI"),
            ("playfair", "BELAJAR KRIPTOGRAFI", "SATAR"),
            ("hill", "BELAJAR KRIPTOGRAFI", [3, 3, 2, 5]),
            ("otp", "BELAJAR KRIPTOGRAFI", None),
            ("stream", "BELAJAR KRIPTOGRAFI", None),
        ]
        for algorithm, text, key in cases:
            with self.subTest(algorithm=algorithm):
                result = self.service.encrypt(text, algorithm=algorithm, key=key)
                decrypted = self.service.decrypt(algorithm, result.ciphertext, result.key)
                self.assertEqual(decrypted, result.normalized_plaintext)

    def test_auto_selector_returns_supported_algorithm(self):
        result = self.service.encrypt("BELAJAR KRIPTOGRAFI")
        self.assertIn(result.algorithm, self.service.ciphers)
        self.assertTrue(result.ciphertext)
        self.assertTrue(result.reason)

    def test_caesar_auto_crack(self):
        plaintext = "BESOK KITA BERTEMU DI KAMPUS DAN BELAJAR KRIPTOGRAFI"
        ciphertext = self.service.encrypt(plaintext, algorithm="caesar", key=7).ciphertext
        result = self.service.crack(ciphertext)
        self.assertEqual(result.detected_algorithm, "caesar")
        self.assertEqual(result.recovered_key, 7)
        self.assertEqual(result.plaintext, plaintext)

    def test_otp_requires_key_for_exact_decryption(self):
        plaintext = "RAHASIA ANTARA ALICE DAN BOB"
        enc = self.service.encrypt(plaintext, algorithm="otp")
        self.assertEqual(self.service.decrypt("otp", enc.ciphertext, enc.key), plaintext)

    def test_vigenere_auto_crack_on_long_text(self):
        plaintext = (
            "BESOK KITA BERTEMU DI KAMPUS DAN BELAJAR KRIPTOGRAFI DENGAN TEMAN "
            "KITA MEMBAHAS PESAN RAHASIA DAN KEAMANAN INFORMASI DI KAMPUS BESOK "
        ) * 4
        ciphertext = self.service.encrypt(plaintext, algorithm="vigenere", key="KUNCI").ciphertext
        result = self.service.crack(ciphertext)
        self.assertEqual(result.detected_algorithm, "vigenere")
        self.assertEqual(result.recovered_key, "KUNCI")
        self.assertEqual(result.plaintext, plaintext)


if __name__ == "__main__":
    unittest.main()
