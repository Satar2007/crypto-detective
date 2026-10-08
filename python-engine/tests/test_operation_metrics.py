import threading,time,tracemalloc,unittest
from unittest.mock import patch
from crypto_engine import CryptoService
from operation_metrics import measure_operation,alphabet_operation

class OperationMetricsTests(unittest.TestCase):
    def test_six_algorithms_round_trip_metrics(self):
        service=CryptoService();text='BELAJAR KRIPTOGRAFI DI KAMPUS'
        for algorithm in service.ciphers:
            with self.subTest(algorithm=algorithm):
                result=measure_operation(lambda:{'success':True,**service.encrypt(text,algorithm).to_dict()},mode='encrypt',input_text=text)
                cipher=result['ciphertext']
                answer=measure_operation(lambda:{'algorithm':algorithm,'plaintext':service.decrypt(algorithm,cipher,result['key'])},mode='decrypt',input_text=cipher)
                self.assertEqual(answer['plaintext'],result['normalized_plaintext'])
                for a,value in [(result,text),(answer,cipher)]:
                    m=a['metrics'];self.assertEqual(m['operation_count'],1);self.assertGreater(m['runtime_ns'],0)
                    self.assertEqual(m['input_bytes'],len(value.encode()));self.assertGreaterEqual(m['peak_memory_bytes'],0)
                    self.assertGreater(m['throughput_mb_s'],0);self.assertIn('O(',m['complexity'])
    def test_actual_clock_and_one_call(self):
        calls=[]
        def op():calls.append(1);return {'algorithm':'caesar','ciphertext':'B'}
        with patch('operation_metrics.time.perf_counter_ns',side_effect=[100,1100]):r=measure_operation(op,mode='encrypt',input_text='A')
        self.assertEqual(calls,[1]);self.assertEqual(r['metrics']['runtime_ns'],1000);self.assertEqual(r['metrics']['throughput_mb_s'],1)
    def test_utf8_byte_sizes(self):
        r=measure_operation(lambda:{'algorithm':'stream','plaintext':'é😀'},mode='decrypt',input_text='QUJD')
        self.assertEqual(r['metrics']['output_bytes'],6);self.assertEqual(r['metrics']['input_bytes'],4)
    def test_errors_stop_trace_without_retry(self):
        calls=[]
        def op():calls.append(1);raise ValueError('invalid key')
        with self.assertRaises(ValueError):measure_operation(op,mode='encrypt',input_text='A')
        self.assertEqual(calls,[1]);self.assertFalse(tracemalloc.is_tracing())
    def test_parallel_scopes_are_serialized(self):
        active=0;maximum=0;errors=[]
        def op():
            nonlocal active,maximum
            active+=1;maximum=max(maximum,active);time.sleep(.01);active-=1
            return {'algorithm':'caesar','ciphertext':'B'}
        def run():
            try:measure_operation(op,mode='encrypt',input_text='A')
            except Exception as e:errors.append(e)
        threads=[threading.Thread(target=run) for _ in range(3)]
        for t in threads:t.start()
        for t in threads:t.join()
        self.assertEqual(errors,[]);self.assertEqual(maximum,1)
    def test_alphabet_known_vector_and_random_roundtrip(self):
        r=measure_operation(lambda:alphabet_operation('encrypt','HALO','XMCK'),mode='encrypt',input_text='HALO')
        self.assertEqual(r['ciphertext'],'EMNY');self.assertEqual(alphabet_operation('decrypt','EMNY','XMCK')['plaintext'],'HALO')
        r=alphabet_operation('encrypt','HALO DUNIA',None);self.assertEqual(len(r['key']),9)
        self.assertEqual(alphabet_operation('decrypt',r['ciphertext'],r['key'])['plaintext'],'HALODUNIA')
    def test_alphabet_validation(self):
        with self.assertRaises(ValueError):alphabet_operation('encrypt','HALO','ABC')
        with self.assertRaises(ValueError):alphabet_operation('encrypt','HALO!','ABCDE')
    def test_existing_trace_is_not_stopped(self):
        tracemalloc.start()
        try:
            with self.assertRaises(RuntimeError):measure_operation(lambda:{},mode='encrypt',input_text='A')
            self.assertTrue(tracemalloc.is_tracing())
        finally:tracemalloc.stop()
