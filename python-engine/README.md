# Crypto Detective — Backend v1

Backend awal untuk tugas kriptografi dengan **satu engine** dan **dua mode**:

1. **Smart Encrypt** — menerima plaintext, memilih salah satu dari 6 cipher dengan heuristic selector, membuat key bila diperlukan, lalu mengenkripsi.
2. **Crack / Analyze** — menerima ciphertext, menganalisis kandidat cipher, melakukan brute-force/cryptanalysis jika layak, dan menyatakan `key_required` jika memang ciphertext tidak dapat dipecahkan secara andal tanpa key.

## Enam cipher

- Caesar Cipher
- Vigenère Cipher
- Playfair Cipher
- Hill Cipher (2×2)
- One-Time Pad (OTP)
- Stream Cipher edukasional (XOR + SHA-256 counter keystream)

> Catatan akademis: deteksi cipher dari ciphertext saja tidak selalu unik. OTP yang benar tidak bisa dipecahkan dari ciphertext saja. Stream cipher juga membutuhkan key/keystream. Karena itu backend tidak memalsukan hasil "crack" ketika bukti tidak cukup.

## Struktur

```text
crypto_detective_backend/
├── crypto_engine/
│   ├── analyzer.py
│   ├── models.py
│   ├── selector.py
│   ├── service.py
│   ├── utils.py
│   └── ciphers/
│       ├── caesar.py
│       ├── vigenere.py
│       ├── playfair.py
│       ├── hill.py
│       ├── otp.py
│       └── stream.py
├── tests/
├── demo.py
└── run_tests.py
```

## Menjalankan testing

Dari folder project:

```powershell
py run_tests.py
```

atau dengan environment CNN milikmu:

```powershell
& "$env:USERPROFILE\CNN-Praktikum\.venv\Scripts\python.exe" run_tests.py
```

## Menjalankan demo backend

```powershell
py demo.py
```

## API Python yang nanti dipakai web

```python
from crypto_engine import CryptoService

service = CryptoService()

# Mode 1
result = service.encrypt("BELAJAR KRIPTOGRAFI")
print(result.to_dict())

# Mode 2
result = service.crack("ILZVR RP...ciphertext...")
print(result.to_dict())

# Dekripsi dengan key yang diketahui
plaintext = service.decrypt("vigenere", ciphertext, "KUNCI")
```

## Batasan v1

- Caesar: automatic brute-force + language scoring.
- Vigenère: IC + frequency-analysis candidate recovery; lebih akurat pada ciphertext yang cukup panjang.
- Playfair/Hill: bisa encrypt/decrypt penuh dengan key, tetapi automatic key recovery belum dipaksakan karena satu ciphertext pendek sering tidak cukup.
- OTP/Stream: tidak mengklaim bisa di-crack tanpa key.

Tahap berikutnya setelah test backend lolos adalah membungkus `CryptoService` menjadi API web, lalu membuat UI dua mode: **Encrypt** dan **Crack**.
