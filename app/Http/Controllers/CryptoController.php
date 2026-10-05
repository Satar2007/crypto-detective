<?php

namespace App\Http\Controllers;

use App\Models\CryptoOperation;
use App\Services\CryptoEngineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Throwable;

class CryptoController extends Controller
{
    public function __construct(
        private readonly CryptoEngineService $engine
    ) {
    }

    /**
     * Health check Laravel -> Python.
     */
    public function health(): JsonResponse
    {
        try {
            $engine = $this->engine->health();

            return response()->json([
                'success' => true,
                'laravel' => 'ok',
                'engine' => $engine,
            ]);
        } catch (Throwable $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 503);
        }
    }

    /**
     * Encrypt plaintext.
     */
    public function encrypt(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plaintext' => [
                'required',
                'string',
                'max:20000',
            ],
            'algorithm' => [
                'nullable',
                'string',
                Rule::in([
                    'auto',
                    'caesar',
                    'vigenere',
                    'playfair',
                    'hill',
                    'otp',
                    'stream',
                ]),
            ],
            'key' => [
                'nullable',
            ],
        ]);

        try {
            $plaintext = $validated['plaintext'];
            $algorithm = $validated['algorithm'] ?? 'auto';
            $key = $validated['key'] ?? null;

            $result = $this->engine->encrypt(
                $plaintext,
                $algorithm,
                $key
            );

            $operation = CryptoOperation::create([
                'mode' => 'encrypt',

                'algorithm' => $result['algorithm']
                    ?? $algorithm,

                'input_text' => $plaintext,

                'output_text' => $result['ciphertext']
                    ?? null,

                'key_value' => array_key_exists('key', $result)
                    ? $this->stringifyKey($result['key'])
                    : $this->stringifyKey($key),

                'confidence' => null,

                'status' => ($result['success'] ?? false)
                    ? 'success'
                    : 'failed',

                'reason' => $result['reason']
                    ?? null,

                'metadata' => [
                    'normalized_plaintext' =>
                        $result['normalized_plaintext'] ?? null,

                    'notes' =>
                        $result['notes'] ?? [],

                    'engine_response' =>
                        $result,
                ],
            ]);

            return response()->json([
                'success' => true,
                'operation_id' => $operation->id,
                'data' => $result,
            ]);
        } catch (Throwable $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }
    }

    /**
     * Decrypt ciphertext menggunakan algorithm + key.
     */
    public function decrypt(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ciphertext' => [
                'required',
                'string',
                'max:20000',
            ],
            'algorithm' => [
                'required',
                'string',
                Rule::in([
                    'caesar',
                    'vigenere',
                    'playfair',
                    'hill',
                    'otp',
                    'stream',
                ]),
            ],
            'key' => [
                'required',
            ],
        ]);

        try {
            $ciphertext = $validated['ciphertext'];
            $algorithm = $validated['algorithm'];
            $key = $validated['key'];

            $result = $this->engine->decrypt(
                $algorithm,
                $ciphertext,
                $key
            );

            $operation = CryptoOperation::create([
                'mode' => 'decrypt',

                'algorithm' => $result['algorithm']
                    ?? $algorithm,

                'input_text' => $ciphertext,

                'output_text' => $result['plaintext']
                    ?? null,

                'key_value' => $this->stringifyKey($key),

                'confidence' => null,

                'status' => ($result['success'] ?? false)
                    ? 'success'
                    : 'failed',

                'reason' => 'Dekripsi menggunakan algoritma dan key yang diberikan user.',

                'metadata' => [
                    'engine_response' => $result,
                ],
            ]);

            return response()->json([
                'success' => true,
                'operation_id' => $operation->id,
                'data' => $result,
            ]);
        } catch (Throwable $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }
    }

    /**
     * Analyze / crack ciphertext.
     */
    public function crack(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ciphertext' => [
                'required',
                'string',
                'max:20000',
            ],
        ]);

        try {
            $ciphertext = $validated['ciphertext'];

            $result = $this->engine->crack(
                $ciphertext
            );

            $algorithm = $result['detected_algorithm']
                ?? 'unknown';

            $status = $result['status']
                ?? 'unknown';

            $operation = CryptoOperation::create([
                'mode' => 'crack',

                'algorithm' => $algorithm,

                'input_text' => $ciphertext,

                'output_text' => $result['plaintext']
                    ?? null,

                'key_value' =>
                    $this->stringifyKey(
                        $result['recovered_key'] ?? null
                    ),

                'confidence' =>
                    $result['confidence'] ?? null,

                'status' => $status,

                'reason' => $result['message']
                    ?? null,

                'metadata' => [
                    'candidates' =>
                        $result['candidates'] ?? [],

                    'engine_response' =>
                        $result,
                ],
            ]);

            return response()->json([
                'success' => true,
                'operation_id' => $operation->id,
                'data' => $result,
            ]);
        } catch (Throwable $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }
    }

    /**
     * Menampilkan history terbaru.
     */
    public function history(Request $request): JsonResponse
    {
        $limit = (int) $request->query(
            'limit',
            20
        );

        $limit = max(
            1,
            min($limit, 100)
        );

        $operations = CryptoOperation::query()
            ->latest()
            ->limit($limit)
            ->get();

        return response()->json([
            'success' => true,
            'count' => $operations->count(),
            'data' => $operations,
        ]);
    }

    /**
     * Detail satu operation.
     */
    public function show(
        CryptoOperation $cryptoOperation
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'data' => $cryptoOperation,
        ]);
    }

    /**
     * Ubah key berbagai tipe menjadi string untuk database.
     */
    private function stringifyKey(
        mixed $key
    ): ?string {
        if ($key === null || $key === '') {
            return null;
        }

        if (
            is_array($key)
            || is_object($key)
        ) {
            return json_encode(
                $key,
                JSON_UNESCAPED_UNICODE
                | JSON_UNESCAPED_SLASHES
            );
        }

        return (string) $key;
    }
}