from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from crypto_engine import CryptoService


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
        result = crypto.encrypt(
            plaintext=request.plaintext,
            algorithm=request.algorithm,
            key=request.key,
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


@app.post("/decrypt")
def decrypt(
    request: DecryptRequest,
):
    try:
        plaintext = crypto.decrypt(
            algorithm=request.algorithm,
            ciphertext=request.ciphertext,
            key=request.key,
        )

        return {
            "success": True,
            "algorithm":
                request.algorithm
                .lower(),

            "plaintext":
                plaintext,
        }

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
        return _run_coursework_benchmark(payload)
    except ValueError as exc:
        raise _CourseworkHTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise _CourseworkHTTPException(status_code=500, detail=f"Benchmark engine error: {exc}") from exc
# COURSEWORK_UI_V1_BENCHMARK_END

