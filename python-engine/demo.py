import json
from crypto_engine import CryptoService

service = CryptoService()

print("=== MODE 1: SMART ENCRYPT ===")
enc = service.encrypt("BELAJAR KRIPTOGRAFI")
print(json.dumps(enc.to_dict(), indent=2, ensure_ascii=False))

print("\n=== MODE 2: CRACK / ANALYZE ===")
example = service.encrypt(
    "BESOK KITA BERTEMU DI KAMPUS DAN BELAJAR KRIPTOGRAFI",
    algorithm="caesar",
    key=7,
)
print("Ciphertext:", example.ciphertext)
cracked = service.crack(example.ciphertext)
print(json.dumps(cracked.to_dict(), indent=2, ensure_ascii=False))
