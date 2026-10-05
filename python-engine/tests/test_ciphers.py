import unittest

from crypto_engine.ciphers import (
    CaesarCipher,
    VigenereCipher,
    PlayfairCipher,
    HillCipher,
    OneTimePadCipher,
    StreamCipher,
)


class CipherRoundTripTests(unittest.TestCase):
    def test_caesar_round_trip(self):
        c = CaesarCipher()
        text = "Belajar Kriptografi 2026!"
        enc = c.encrypt(text, 7)
        self.assertNotEqual(enc, text)
        self.assertEqual(c.decrypt(enc, 7), text)

    def test_vigenere_round_trip(self):
        c = VigenereCipher()
        text = "Belajar kriptografi dengan aman."
        key = "KUNCI"
        enc = c.encrypt(text, key)
        self.assertEqual(c.decrypt(enc, key), text)

    def test_playfair_round_trip_normalized(self):
        c = PlayfairCipher()
        text = "BELAJAR KRIPTOGRAFI"
        key = "SATAR"
        prepared = c._prepare_plaintext(text)
        enc = c.encrypt(text, key)
        dec = c.decrypt(enc, key)
        self.assertEqual(dec, prepared)

    def test_hill_round_trip_normalized(self):
        c = HillCipher()
        text = "BELAJAR KRIPTOGRAFI"
        key = [3, 3, 2, 5]
        normalized = "BELAJARKRIPTOGRAFI"
        if len(normalized) % 2:
            normalized += "X"
        enc = c.encrypt(text, key)
        dec = c.decrypt(enc, key)
        self.assertEqual(dec, normalized)

    def test_otp_round_trip_unicode(self):
        c = OneTimePadCipher()
        text = "Pesan rahasia: jam 8 malam."
        key = c.generate_key_for_text(text)
        enc = c.encrypt(text, key)
        self.assertEqual(c.decrypt(enc, key), text)

    def test_stream_round_trip_unicode(self):
        c = StreamCipher()
        text = "Pesan rahasia antara Alice dan Bob."
        key = c.generate_key()
        enc = c.encrypt(text, key)
        self.assertEqual(c.decrypt(enc, key), text)


if __name__ == "__main__":
    unittest.main()
