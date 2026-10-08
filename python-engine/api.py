from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from crypto_engine import CryptoService
from operation_metrics import measure_operation, alphabet_operation, MEASUREMENT_LOCK


app = FastAPI(
    title="Crypto Detective Engine",
    description=(
        "Backend cryptography engine "
        "for Crypto Detective"
    ),
    version="2.1.0",
)

crypto = CryptoService()


class EncryptRequest(BaseModel):
    plaintext: str = Field(
        min_length=1
    )

    algorithm: str = "auto"

    key: Any | None = None


class DecryptRequest(BaseModel):
    algorithm: str

    ciphertext: str = Field(
        min_length=1
    )

    key: Any


class CrackRequest(BaseModel):
    ciphertext: str = Field(
        min_length=1
    )

    algorithm_hint: str | None = None


@app.get("/")
def root():
    return {
        "name":
            "Crypto Detective Engine",

        "version":
            "2.1.0",

        "status":
            "online",
    }


@app.get("/health")
def health():
    return {
        "status":
            "ok",

        "engine":
            "crypto-detective",

        "version":
            "2.1.0",

        "algorithms":
            list(
                crypto.ciphers.keys()
            ),
    }


@app.post("/encrypt")
def encrypt(
    request: EncryptRequest,
):
    try:
        return measure_operation(
            lambda: {"success": True, **crypto.encrypt(
                plaintext=request.plaintext, algorithm=request.algorithm, key=request.key
            ).to_dict()}, mode="encrypt", input_text=request.plaintext
        )

    except (
        ValueError,
        TypeError,
    ) as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc


@app.post("/decrypt")
def decrypt(
    request: DecryptRequest,
):
    try:
        return measure_operation(
            lambda: {"success": True, "algorithm": request.algorithm.lower(),
                     "plaintext": crypto.decrypt(algorithm=request.algorithm,
                        ciphertext=request.ciphertext, key=request.key)},
            mode="decrypt", input_text=request.ciphertext
        )

    except (
        ValueError,
        TypeError,
    ) as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc


@app.post("/crack")
def crack(
    request: CrackRequest,
):
    try:
        result = crypto.crack(
            ciphertext=request.ciphertext,
            algorithm_hint=(
                request.algorithm_hint
            ),
        )

        return {
            "success": True,
            **result.to_dict(),
        }

    except (
        ValueError,
        TypeError,
    ) as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

# COURSEWORK_UI_V1_BENCHMARK_START
from fastapi import HTTPException as _CourseworkHTTPException
from coursework_benchmark import run_benchmark as _run_coursework_benchmark

@app.post("/coursework/benchmark")
def coursework_benchmark(payload: dict):
    try:
        with MEASUREMENT_LOCK:
            return _run_coursework_benchmark(payload)
    except ValueError as exc:
        raise _CourseworkHTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise _CourseworkHTTPException(status_code=500, detail=f"Benchmark engine error: {exc}") from exc
# COURSEWORK_UI_V1_BENCHMARK_END


class AlphabetRequest(BaseModel):
    mode: str
    text: str = Field(min_length=1)
    key: str | None = None

@app.post("/coursework/otp-alpha")
def otp_alpha(request: AlphabetRequest):
    try:
        return measure_operation(
            lambda: alphabet_operation(request.mode, request.text, request.key),
            mode=request.mode, input_text=request.text
        )
    except (ValueError, TypeError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


class CryptoZarRequest(BaseModel):
    mode: str
    algorithm: str
    text: str = Field(min_length=1, max_length=3145728)
    key: Any | None = None

@app.post("/coursework/cryptozar")
def cryptozar_profile(request: CryptoZarRequest):
    from cryptozar_compat import operation
    try:
        result = measure_operation(
            lambda: operation(request.mode, request.algorithm, request.text, request.key),
            mode=request.mode, input_text=request.text
        )
        result['metrics']['profile'] = 'cryptozar-dika'
        result['metrics']['measurement_note'] += ' Profil Dika: ciphertext byte berupa Hex; Stream menggunakan LCG, Hill dapat 2×2 atau 3×3.'
        if request.algorithm == 'stream':
            result['metrics']['explanation'] = 'LCG menghasilkan satu byte per iterasi x=(5*x+1)%256, kemudian XOR. Waktu O(n), memori O(n); hanya 256 seed.'
        if request.algorithm == 'hill':
            result['metrics']['explanation'] = 'Perkalian matriks 2×2/3×3 dengan vektor kolom modulo 26. Untuk ukuran matriks tetap, waktu O(n), memori O(n); invers key juga dihitung saat decrypt.'
        return result
    except (ValueError, TypeError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


class InteropRequest(BaseModel):
    mode: str
    variant: str
    text: str = Field(min_length=1, max_length=6291456)
    key: Any | None = None
    cipher_format: str = 'base64'
    key_format: str = 'base64'

@app.post('/coursework/interop')
def interop_operation(request: InteropRequest):
    from interop import operation
    try:
        result = measure_operation(lambda: operation(request.mode, request.variant, request.text,
            request.key, request.cipher_format, request.key_format), mode=request.mode, input_text=request.text)
        result['metrics']['variant'] = request.variant
        if result['algorithm'] in ('otp','stream'):
            result['metrics']['explanation'] = 'Pemrosesan linear terhadap panjang pesan. Varian: ' + request.variant + '; termasuk konversi format dan pembangkitan key bila key kosong saat enkripsi.'
        elif request.variant == 'hill-matrix':
            result['metrics']['explanation'] = 'Hill matriks 2×2/3×3, vektor kolom modulo 26; waktu linear untuk ukuran matriks tetap.'
        result['metrics']['measurement_note'] += ' Varian interop: teks mentah dihitung sebagai UTF-8; Hex/Base64 dihitung sebagai teks terenkode. Transport Base64 ke web tidak dihitung.'
        return result
    except (ValueError, TypeError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
