import unittest

from crypto_engine import CryptoService


class ConfidenceCalibrationV42Tests(unittest.TestCase):
    def setUp(self):
        self.crypto = CryptoService()

    def test_short_caesar_semantics_stay_conservative(self):
        result = self.crypto.crack("kdor")

        self.assertEqual("caesar", result.detected_algorithm)
        self.assertEqual("halo", result.plaintext)
        self.assertEqual(3, result.recovered_key)
        self.assertEqual(78.0, result.recovery_confidence)
        self.assertEqual(result.recovery_confidence, result.confidence)
        self.assertEqual(78.0, result.algorithm_confidence)

    def test_long_caesar_recovery_is_not_capped_by_family_detection(self):
        plaintext = "BESOK KITA BERTEMU DI KAMPUS DAN BELAJAR KRIPTOGRAFI"
        encrypted = self.crypto.encrypt(
            plaintext,
            algorithm="caesar",
            key=7,
        )

        result = self.crypto.crack(encrypted.ciphertext)

        self.assertEqual("caesar", result.detected_algorithm)
        self.assertEqual(plaintext, result.plaintext)
        self.assertEqual(7, result.recovered_key)

        self.assertGreaterEqual(result.recovery_confidence, 90.0)
        self.assertEqual(result.recovery_confidence, result.confidence)

        # The cipher-family identification remains a separate score and can
        # legitimately be lower than plaintext/key recovery evidence.
        self.assertGreaterEqual(result.algorithm_confidence, 50.0)
        self.assertGreater(
            result.recovery_confidence,
            result.algorithm_confidence,
        )

    def test_known_hill_stays_very_high(self):
        ciphertext = (
            "PWSCEUFKSYJGQFTHPWEZWQRDCOKIBAKGSRMMWSNDVJCMFYCK"
            "MHVJCMYQDBRNVERTPZPB"
        )

        result = self.crypto.crack(
            ciphertext,
            algorithm_hint="hill",
        )

        self.assertEqual("hill", result.detected_algorithm)
        self.assertEqual([3, 3, 2, 5], result.recovered_key)
        self.assertEqual(100.0, result.algorithm_confidence)
        self.assertGreaterEqual(result.recovery_confidence, 90.0)
        self.assertEqual("VERY HIGH", result.evidence_strength)


if __name__ == "__main__":
    unittest.main()
