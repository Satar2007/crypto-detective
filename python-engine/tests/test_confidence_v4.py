import unittest

from crypto_engine import CryptoService


class ConfidenceCalibrationV4Tests(unittest.TestCase):
    def setUp(self):
        self.crypto = CryptoService()

    def test_short_caesar_is_correct_but_not_overconfident(self):
        result = self.crypto.crack("kdor")

        self.assertEqual("caesar", result.detected_algorithm)
        self.assertEqual("halo", result.plaintext)
        self.assertEqual(3, result.recovered_key)
        self.assertGreaterEqual(result.recovery_confidence, 60.0)
        self.assertLessEqual(result.recovery_confidence, 85.0)
        self.assertFalse(result.algorithm_known)

    def test_known_hill_long_text_gets_high_recovery_evidence(self):
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
        self.assertEqual(
            "BESOKALICEDANBOBBERTEMUDIKAMPUSUNTUKMEMBAHASPESAN"
            "RAHASIAKRIPTOGRAFIX",
            result.plaintext,
        )
        self.assertEqual(100.0, result.algorithm_confidence)
        self.assertGreaterEqual(result.recovery_confidence, 90.0)
        self.assertEqual("VERY HIGH", result.evidence_strength)
        self.assertTrue(result.algorithm_known)

    def test_known_otp_has_zero_recovery_confidence(self):
        encrypted = self.crypto.encrypt(
            "PESAN RAHASIA",
            algorithm="otp",
        )

        result = self.crypto.crack(
            encrypted.ciphertext,
            algorithm_hint="otp",
        )

        self.assertEqual("key_required", result.status)
        self.assertEqual(100.0, result.algorithm_confidence)
        self.assertEqual(0.0, result.recovery_confidence)
        self.assertEqual(0.0, result.confidence)
        self.assertIsNone(result.plaintext)
        self.assertIsNone(result.recovered_key)


if __name__ == "__main__":
    unittest.main()
