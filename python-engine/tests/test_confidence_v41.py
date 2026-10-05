import unittest

from crypto_engine import CryptoService


class ConfidenceCalibrationV41Tests(unittest.TestCase):
    def setUp(self):
        self.crypto = CryptoService()

    def test_short_auto_caesar_keeps_correct_result(self):
        result = self.crypto.crack("kdor")

        self.assertEqual("caesar", result.detected_algorithm)
        self.assertEqual("halo", result.plaintext)
        self.assertEqual(3, result.recovered_key)
        self.assertEqual(78.0, result.recovery_confidence)

    def test_auto_mode_calibrates_nonwinning_families(self):
        result = self.crypto.crack("kdor")

        vigenere = [
            candidate
            for candidate in result.candidates
            if candidate.algorithm == "vigenere"
            and candidate.plaintext
        ]

        hill = [
            candidate
            for candidate in result.candidates
            if candidate.algorithm == "hill"
            and candidate.plaintext
        ]

        self.assertTrue(vigenere)
        self.assertTrue(hill)

        self.assertGreater(vigenere[0].confidence, 0.0)
        self.assertNotEqual(35.0, hill[0].confidence)

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
