import json,unittest
from pathlib import Path
from cryptozar_compat import operation,normalisasi
from operation_metrics import measure_operation

class CryptoZarCompatibilityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.vectors=json.loads((Path(__file__).parent/'fixtures/cryptozar_vectors.json').read_text(encoding='utf-8'))['vectors']
    def test_encrypt_matches_original_dika_vectors(self):
        for v in self.vectors:
            with self.subTest(algorithm=v['algorithm'],text=v['text'],key=v['key']):
                self.assertEqual(operation('encrypt',v['algorithm'],v['text'],v['key'])['ciphertext'],v['ciphertext'])
    def test_decrypt_original_dika_vectors(self):
        for v in self.vectors:
            with self.subTest(algorithm=v['algorithm'],text=v['text'],key=v['key']):
                self.assertEqual(operation('decrypt',v['algorithm'],v['ciphertext'],v['key'])['plaintext'],v['plaintext'])
    def test_playfair_x_filler_and_hill_3x3_known_answer(self):
        self.assertEqual(operation('encrypt','playfair','XX','RAHASIA')['ciphertext'],'HXHX')
        self.assertEqual(operation('encrypt','hill','ACT','6 24 1 13 16 10 20 17 15')['ciphertext'],'POH')
        self.assertEqual(operation('decrypt','hill','POH','6 24 1 13 16 10 20 17 15')['plaintext'],'ACT')
    def test_auto_keys_and_resolved_key_round_trip(self):
        for a in ('caesar','vigenere','playfair','hill','otp','stream'):
            with self.subTest(algorithm=a):
                r=operation('encrypt',a,'HALO BOB!')
                d=operation('decrypt',a,r['ciphertext'],r['key'])['plaintext']
                self.assertEqual(d,'HALO BOB!' if a in ('otp','stream') else 'HALOBOBX' if a in ('hill','playfair') else 'HALOBOB')
    def test_invalid_keys_and_formats(self):
        for mode,a,t,k in [('encrypt','hill','HALO','2 4 2 4'),('encrypt','hill','HALO','1 2 3'),('encrypt','hill','HALO','3.3 2 5'),('encrypt','otp','é','00'),('decrypt','otp','GG','00'),('decrypt','stream','A','77'),('encrypt','stream','HALO','KUNCI'),('encrypt','caesar','HALO','3.2'),('decrypt','caesar','HALO',None),('encrypt','auto','HALO','3'),('encrypt','otp-alpha','HALO','KUNCI')]:
            with self.subTest(algorithm=a,key=k):
                with self.assertRaises(ValueError):operation(mode,a,t,k)
    def test_seed_modulo_and_flexible_hill(self):
        self.assertEqual(operation('encrypt','stream','HALO','-1')['ciphertext'],operation('encrypt','stream','HALO','255')['ciphertext'])
        self.assertEqual(operation('encrypt','hill','HALO','[[3,3];[2,5]]')['ciphertext'],operation('encrypt','hill','HALO','3 3 2 5')['ciphertext'])
    def test_hex_whitespace_case_and_bom(self):
        self.assertEqual(operation('decrypt','otp','\ufeff4 8 6 1','0 0 0 0')['plaintext'],'Ha')
        self.assertEqual(operation('decrypt','otp','4861','0000')['plaintext'],'Ha')
    def test_wrong_key_invalid_utf8_is_not_replaced(self):
        with self.assertRaises(ValueError):operation('decrypt','otp','FF','00')
    def test_profile_operation_metrics_actual_text_bytes(self):
        r=measure_operation(lambda:operation('encrypt','stream','é😀','77'),mode='encrypt',input_text='é😀')
        self.assertEqual(r['metrics']['input_bytes'],6);self.assertEqual(r['metrics']['output_bytes'],12)
        self.assertEqual(r['metrics']['operation_count'],1);self.assertGreater(r['metrics']['runtime_ns'],0)
