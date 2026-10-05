from __future__ import annotations

import statistics
import time
import tracemalloc
from typing import Any

from crypto_engine.service import CryptoService

ALGORITHMS = ("caesar", "vigenere", "playfair", "hill", "otp", "stream")

THEORY = {
    "caesar": {
        "encrypt": "O(n)", "decrypt": "O(n)",
        "memory": "O(n) output, O(1) auxiliary",
        "explanation": "Caesar menggeser setiap karakter dengan satu shift; enkripsi dan dekripsi linear terhadap panjang pesan.",
    },
    "vigenere": {
        "encrypt": "O(n)", "decrypt": "O(n)",
        "memory": "O(n) output + O(k) key",
        "explanation": "Vigenere menerapkan pergeseran berdasarkan key berulang sehingga beban utama linear terhadap panjang pesan.",
    },
    "playfair": {
        "encrypt": "O(n)", "decrypt": "O(n)",
        "memory": "O(n) output; key square 5x5 konstan",
        "explanation": "Playfair memproses digraph. Key square 5x5 berukuran tetap sehingga pemrosesan pesan tetap linear.",
    },
    "hill": {
        "encrypt": "O(n*m^2), m=2 => O(n)",
        "decrypt": "O(n*m^2) + inverse O(m^3), m=2 tetap => O(n)",
        "memory": "O(n) output; matriks 2x2 konstan",
        "explanation": "Hill 2x2 memakai perkalian matriks modulo 26. Karena ukuran matriks tetap 2x2, beban terhadap panjang pesan bersifat linear.",
    },
    "otp": {
        "encrypt": "O(n)", "decrypt": "O(n)",
        "memory": "O(n) output + O(n) one-time key",
        "explanation": "OTP memerlukan key acak sepanjang data. Waktu linear dan kebutuhan penyimpanan key juga linear.",
    },
    "stream": {
        "encrypt": "O(n)", "decrypt": "O(n)",
        "memory": "O(n) output + state generator/keystream",
        "explanation": "Stream cipher menghasilkan keystream lalu menggabungkannya dengan data; waktu bertambah linear terhadap panjang pesan.",
    },
}

def _get(value: Any, name: str) -> Any:
    if isinstance(value, dict):
        return value.get(name)
    if hasattr(value, name):
        return getattr(value, name)
    if hasattr(value, "model_dump"):
        return value.model_dump().get(name)
    raise AttributeError(name)

def _measure_peak(func) -> int:
    tracemalloc.start()
    try:
        func()
        _, peak = tracemalloc.get_traced_memory()
        return int(peak)
    finally:
        tracemalloc.stop()

def _mean_ms(samples_ns: list[int]) -> float:
    return statistics.fmean(samples_ns) / 1_000_000.0 if samples_ns else 0.0

def _throughput_mb_s(byte_count: int, ms: float) -> float:
    return (byte_count / (ms / 1000.0)) / 1_000_000.0 if ms > 0 else 0.0

def run_benchmark(payload: dict[str, Any]) -> dict[str, Any]:
    plaintext = str(payload.get("plaintext") or "")
    iterations = int(payload.get("iterations") or 10)
    if len(plaintext.strip()) < 10:
        raise ValueError("Plaintext benchmark minimal 10 karakter.")
    if iterations < 1 or iterations > 50:
        raise ValueError("Iterations harus berada pada rentang 1..50.")

    service = CryptoService()
    input_bytes = len(plaintext.encode("utf-8"))
    results = []

    for algorithm in ALGORITHMS:
        representative = service.encrypt(plaintext, algorithm)
        ciphertext = str(_get(representative, "ciphertext"))
        key = _get(representative, "key")
        enc_samples, dec_samples = [], []

        for _ in range(iterations):
            start = time.perf_counter_ns()
            service.encrypt(plaintext, algorithm)
            enc_samples.append(time.perf_counter_ns() - start)

        for _ in range(iterations):
            start = time.perf_counter_ns()
            service.decrypt(algorithm, ciphertext, key)
            dec_samples.append(time.perf_counter_ns() - start)

        enc_peak = _measure_peak(lambda: service.encrypt(plaintext, algorithm))
        dec_peak = _measure_peak(lambda: service.decrypt(algorithm, ciphertext, key))
        avg_enc = _mean_ms(enc_samples)
        avg_dec = _mean_ms(dec_samples)
        output_bytes = len(ciphertext.encode("utf-8"))
        theory = THEORY[algorithm]

        results.append({
            "algorithm": algorithm,
            "iterations": iterations,
            "input_characters": len(plaintext),
            "input_bytes": input_bytes,
            "output_bytes": output_bytes,
            "avg_encrypt_ms": round(avg_enc, 6),
            "avg_decrypt_ms": round(avg_dec, 6),
            "min_encrypt_ms": round(min(enc_samples) / 1_000_000.0, 6),
            "max_encrypt_ms": round(max(enc_samples) / 1_000_000.0, 6),
            "min_decrypt_ms": round(min(dec_samples) / 1_000_000.0, 6),
            "max_decrypt_ms": round(max(dec_samples) / 1_000_000.0, 6),
            "encrypt_peak_memory_bytes": enc_peak,
            "decrypt_peak_memory_bytes": dec_peak,
            "encrypt_peak_memory_kib": round(enc_peak / 1024.0, 3),
            "decrypt_peak_memory_kib": round(dec_peak / 1024.0, 3),
            "encrypt_throughput_mb_s": round(_throughput_mb_s(input_bytes, avg_enc), 6),
            "decrypt_throughput_mb_s": round(_throughput_mb_s(output_bytes, avg_dec), 6),
            "complexity_encrypt": theory["encrypt"],
            "complexity_decrypt": theory["decrypt"],
            "memory_complexity": theory["memory"],
            "explanation": theory["explanation"],
            "measurement_note": "Waktu diukur dengan time.perf_counter_ns pada engine Python. Peak memory diukur terpisah memakai tracemalloc agar tidak mencemari rata-rata waktu utama.",
        })

    return {
        "success": True,
        "engine": "crypto-detective",
        "measurement": "python-core",
        "iterations": iterations,
        "input_characters": len(plaintext),
        "input_bytes": input_bytes,
        "results": results,
        "disclaimer": "Angka waktu dan memori adalah hasil runtime aktual saat benchmark dijalankan pada mesin ini, bukan angka teoritis atau angka buatan.",
    }

if __name__ == "__main__":
    sample = {"plaintext": "BELAJAR KRIPTOGRAFI DI SANATA DHARMA", "iterations": 1}
    result = run_benchmark(sample)
    assert result["success"] is True and len(result["results"]) == 6
    print("COURSEWORK_BENCHMARK_SELF_TEST_PASS")
