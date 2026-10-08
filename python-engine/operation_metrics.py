"""Measure one operation once; tracing is process-wide, so serialize its scope."""
from __future__ import annotations
import secrets
import threading
import time
import tracemalloc
from typing import Callable
from coursework_benchmark import THEORY

MEASUREMENT_LOCK = threading.RLock()


def measure_operation(operation: Callable[[], dict], *, mode: str, input_text: str) -> dict:
    with MEASUREMENT_LOCK:
        if tracemalloc.is_tracing():
            raise RuntimeError('Memory tracer is already in use outside the operation scope.')
        tracemalloc.start()
        try:
            started = time.perf_counter_ns()
            result = operation()
            elapsed = max(1, time.perf_counter_ns() - started)
            _, peak = tracemalloc.get_traced_memory()
        finally:
            tracemalloc.stop()
    algorithm = str(result['algorithm']).lower()
    output = result['ciphertext' if mode == 'encrypt' else 'plaintext']
    input_bytes, output_bytes = len(input_text.encode('utf-8')), len(output.encode('utf-8'))
    theory = THEORY['otp' if algorithm == 'otp-alpha' else algorithm]
    result['metrics'] = {
        'mode': mode, 'algorithm': algorithm, 'operation_count': 1,
        'runtime_ns': elapsed, 'runtime_ms': elapsed / 1_000_000,
        'input_bytes': input_bytes, 'output_bytes': output_bytes,
        'peak_memory_bytes': peak, 'peak_memory_kib': peak / 1024,
        'throughput_mb_s': input_bytes / (elapsed / 1_000_000_000) / 1_000_000,
        'complexity': theory[mode], 'memory_complexity': theory['memory'],
        'explanation': theory['explanation'],
        'measurement_note': 'Satu operasi engine yang menghasilkan output ini; termasuk pembangkitan key saat encrypt dan overhead tracemalloc. Input/output dihitung sebagai UTF-8 dari teks API (ciphertext dapat berupa Base64). Puncak alokasi Python selama operasi, bukan RAM proses; aktivitas thread lain dapat ikut terukur. HTTP, upload, database, render dan antrean lock tidak dihitung.',
    }
    return result


def alphabet_operation(mode: str, text: str, key: str | None) -> dict:
    """Existing A=0 compatibility mode, moved from browser to measured boundary."""
    if mode not in ('encrypt', 'decrypt'):
        raise ValueError('Mode OTP alfabet tidak dikenal.')
    def clean(value: str) -> str:
        result = ''.join(str(value).split()).replace('\ufeff', '').upper()
        if not result or any(ch < 'A' or ch > 'Z' for ch in result):
            raise ValueError('OTP alfabet hanya menerima huruf A-Z dan spasi/baris baru.')
        return result
    data = clean(text)
    if not key and mode == 'encrypt':
        key = ''.join(chr(65 + secrets.randbelow(26)) for _ in data)
    pad = clean(key or '')
    if len(data) != len(pad):
        raise ValueError('OTP alfabet: jumlah huruf pesan dan key harus sama; key tidak diulang.')
    sign = -1 if mode == 'decrypt' else 1
    output = ''.join(chr(65 + (ord(a) - 65 + sign * (ord(b) - 65)) % 26) for a, b in zip(data, pad))
    return {'success': True, 'algorithm': 'otp-alpha', 'key': pad,
            'ciphertext' if mode == 'encrypt' else 'plaintext': output,
            'notes': ['OTP alfabet A=0, modulo 26; spasi dihapus. Gunakan key acak sekali saja.']}
