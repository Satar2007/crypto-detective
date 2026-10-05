<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class CryptoEngineService
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = rtrim(
            (string) config(
                'services.crypto_engine.url',
                'http://127.0.0.1:8100'
            ),
            '/'
        );
    }

    /**
     * Mengecek apakah Python Crypto Engine sedang aktif.
     */
    public function health(): array
    {
        try {
            $response = Http::acceptJson()
                ->timeout(10)
                ->get($this->baseUrl . '/health');
        } catch (ConnectionException $exception) {
            throw new RuntimeException(
                'Tidak dapat terhubung ke Python Crypto Engine di '
                . $this->baseUrl,
                previous: $exception
            );
        }

        return $this->handleResponse($response);
    }

    /**
     * Melakukan enkripsi.
     *
     * Algorithm:
     * - auto
     * - caesar
     * - vigenere
     * - playfair
     * - hill
     * - otp
     * - stream
     */
    public function encrypt(
        string $plaintext,
        string $algorithm = 'auto',
        mixed $key = null
    ): array {
        $payload = [
            'plaintext' => $plaintext,
            'algorithm' => $algorithm,
        ];

        if ($key !== null && $key !== '') {
            $payload['key'] = $key;
        }

        return $this->post(
            '/encrypt',
            $payload
        );
    }

    /**
     * Melakukan dekripsi menggunakan algoritma dan key tertentu.
     */
    public function decrypt(
        string $algorithm,
        string $ciphertext,
        mixed $key
    ): array {
        return $this->post(
            '/decrypt',
            [
                'algorithm' => $algorithm,
                'ciphertext' => $ciphertext,
                'key' => $key,
            ]
        );
    }

    /**
     * Menganalisis ciphertext dan mencoba melakukan cracking.
     */
public function crack(
    string $ciphertext,
    ?string $algorithmHint = null
): array {
    $payload = [
        'ciphertext' => $ciphertext,
    ];

    if (
        $algorithmHint !== null
        && $algorithmHint !== ''
    ) {
        $payload['algorithm_hint'] =
            $algorithmHint;
    }

    return $this->post(
        '/crack',
        $payload
    );
}

    /**
     * Mengirim POST request JSON ke Python Crypto Engine.
     */
    private function post(
        string $endpoint,
        array $payload
    ): array {
        try {
            $response = Http::acceptJson()
                ->asJson()
                ->timeout(120)
                ->post(
                    $this->baseUrl . $endpoint,
                    $payload
                );
        } catch (ConnectionException $exception) {
            throw new RuntimeException(
                'Tidak dapat terhubung ke Python Crypto Engine di '
                . $this->baseUrl,
                previous: $exception
            );
        }

        return $this->handleResponse($response);
    }

    /**
     * Memvalidasi response FastAPI.
     */
    private function handleResponse(
        Response $response
    ): array {
        if ($response->failed()) {
            $detail = $response->json('detail');

            if (is_array($detail)) {
                $detail = json_encode(
                    $detail,
                    JSON_UNESCAPED_UNICODE |
                    JSON_UNESCAPED_SLASHES
                );
            }

            if (! is_string($detail) || $detail === '') {
                $detail = $response->body();
            }

            throw new RuntimeException(
                'Crypto Engine HTTP '
                . $response->status()
                . ': '
                . $detail
            );
        }

        $data = $response->json();

        if (! is_array($data)) {
            throw new RuntimeException(
                'Crypto Engine mengembalikan response JSON yang tidak valid.'
            );
        }

        return $data;
    }
}