import json,unittest,base64
from pathlib import Path
from interop import operation,rc4_values,byte_data
from operation_metrics import measure_operation

class InteroperabilityTests(unittest.TestCase):
    def test_empty_web_key_generates_for_every_variant(self):
        for v in ['caesar','caesar-az','vigenere','vigenere-az','playfair','playfair-xq','hill','hill-matrix','otp-byte','otp-alpha','otp-text','stream-sha256','stream-rc4','stream-rc4-byte','stream-lcg']:
            with self.subTest(variant=v):
                r=operation('encrypt',v,'HALO BOB','')
                self.assertNotEqual(r['key'],'')
                self.assertTrue(operation('decrypt',v,r['ciphertext'],r['key'])['plaintext'].startswith('HALO'))
    def test_actual_rafael_received_files(self):
        rows=json.loads((Path(__file__).parent/'fixtures/rafael_vectors.json').read_text(encoding='utf-8'))['vectors']
        for v in rows:
            with self.subTest(variant=v['variant']):
                self.assertEqual(operation('decrypt',v['variant'],v['ciphertext'],v['key'])['plaintext'],v['plaintext'])
                self.assertEqual(operation('encrypt',v['variant'],v['plaintext'],v['key'])['ciphertext'],v['ciphertext'])
    def test_classical_normalized_dika_vectors(self):
        rows=json.loads((Path(__file__).parent/'fixtures/cryptozar_vectors.json').read_text(encoding='utf-8'))['vectors']
        for v in rows:
            variant={'caesar':'caesar-az','vigenere':'vigenere-az','playfair':'playfair-xq','hill':'hill-matrix','otp':'otp-byte','stream':'stream-lcg'}[v['algorithm']]
            with self.subTest(variant=variant,key=v['key'],text=v['text']):
                r=operation('encrypt',variant,v['text'],v['key'],'hex','hex')
                self.assertEqual(r['ciphertext'],v['ciphertext'])
                self.assertEqual(operation('decrypt',variant,v['ciphertext'],v['key'],'hex','hex')['plaintext'],v['plaintext'])
    def test_rc4_standard_known_vector(self):
        # Published RC4 example: Key / Plaintext -> BBF316E8D940AF0AD3.
        self.assertEqual(bytes(rc4_values(b'Plaintext',list(b'Key'))).hex(),'bbf316e8d940af0ad3')
        r=operation('encrypt','stream-rc4-byte','Plaintext','Key','hex')
        self.assertEqual(r['ciphertext'],'bbf316e8d940af0ad3')
    def test_all_variants_round_trip_and_key_generation(self):
        for v in ['caesar','caesar-az','vigenere','vigenere-az','playfair','playfair-xq','hill','hill-matrix','otp-byte','otp-text','otp-alpha','stream-sha256','stream-rc4','stream-rc4-byte','stream-lcg']:
            with self.subTest(variant=v):
                r=operation('encrypt',v,'HALO BOB')
                d=operation('decrypt',v,r['ciphertext'],r['key'])['plaintext']
                expected='HALOBOBX' if v in ('playfair','playfair-xq','hill','hill-matrix') else 'HALOBOB' if v in ('caesar-az','vigenere-az','otp-alpha') else 'HALO BOB'
                self.assertEqual(d,expected)
    def test_raw_cipher_and_key_are_not_trimmed(self):
        for v in ['otp-text','stream-rc4','stream-rc4-byte','stream-sha256']:
            t='\ufeffHalo\r\nBob\x00 ';k=' KEY WITH SPACE ' if v!='otp-text' else 'Q'*len(t)
            with self.subTest(variant=v):
                r=operation('encrypt',v,t,k);self.assertEqual(operation('decrypt',v,r['ciphertext'],k)['plaintext'],t)
        self.assertEqual(operation('encrypt','otp-text','A','A')['ciphertext'],'\x00')
        self.assertEqual(operation('decrypt','otp-text','\x00','A')['plaintext'],'A')
    def test_rc4_unicode_character_and_byte_are_distinct(self):
        t='é😀';key='KUNCI'
        a=operation('encrypt','stream-rc4',t,key);b=operation('encrypt','stream-rc4-byte',t,key,'hex')
        self.assertEqual(operation('decrypt','stream-rc4',a['ciphertext'],key)['plaintext'],t)
        self.assertEqual(operation('decrypt','stream-rc4-byte',b['ciphertext'],key,'hex')['plaintext'],t)
        self.assertNotEqual(a['ciphertext'].encode().hex(),b['ciphertext'])
    def test_invalid_keys_do_not_silently_repeat(self):
        for args in [('encrypt','otp-text','HALO','A'),('encrypt','otp-byte','HALO','QQ=='),('decrypt','stream-lcg','ab','KUNCI','hex'),('encrypt','hill-matrix','HALO','1 2 3 4')]:
            with self.subTest(args=args):
                with self.assertRaises(ValueError):operation(*args)
    def test_byte_formats_and_actual_memory_metrics(self):
        r=measure_operation(lambda:operation('encrypt','otp-text','A','A'),mode='encrypt',input_text='A')
        self.assertEqual(r['metrics']['output_bytes'],1);self.assertEqual(r['metrics']['operation_count'],1)
        self.assertEqual(byte_data('4 8 6 1','hex'),b'Ha')
        for fmt in ('hex','base64'):
            e=operation('encrypt','otp-byte','é😀',None,fmt,fmt)
            self.assertEqual(operation('decrypt','otp-byte',e['ciphertext'],e['key'],fmt,fmt)['plaintext'],'é😀')
