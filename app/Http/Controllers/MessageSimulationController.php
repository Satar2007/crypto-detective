<?php

namespace App\Http\Controllers;

use App\Models\MessageSimulation;
use App\Services\CryptoEngineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use RuntimeException;
use Throwable;

class MessageSimulationController extends Controller
{
    public function __construct(
        private readonly CryptoEngineService $engine
    ) {
    }

    /**
     * Menjalankan simulasi:
     *
     * Alice:
     * - memiliki plaintext
     * - mengenkripsi pesan
     *
     * Bob:
     * - menerima ciphertext
     * - memiliki secret key
     * - melakukan dekripsi
     *
     * Trudy:
     * - hanya menerima ciphertext
     * - TIDAK diberikan secret key
     * - mencoba melakukan cryptanalysis
     */
    public function simulate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plaintext' => [
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
                'nullable',
            ],
        ]);

        try {
            $plaintext = $validated['plaintext'];
            $algorithm = $validated['algorithm'];
            $requestedKey = $validated['key'] ?? null;

            /*
            |--------------------------------------------------------------------------
            | ALICE - ENCRYPT
            |--------------------------------------------------------------------------
            */

            $encrypt = $this->engine->encrypt(
                $plaintext,
                $algorithm,
                $requestedKey
            );

            $resolvedAlgorithm = (string) (
                $encrypt['algorithm']
                ?? $algorithm
            );

            $ciphertext = (string) (
                $encrypt['ciphertext']
                ?? ''
            );

            if ($ciphertext === '') {
                throw new RuntimeException(
                    'Crypto Engine tidak menghasilkan ciphertext.'
                );
            }

            $resolvedKey =
                $encrypt['key']
                ?? $requestedKey;

            if (
                $resolvedKey === null
                || $resolvedKey === ''
            ) {
                throw new RuntimeException(
                    'Crypto Engine tidak menghasilkan secret key.'
                );
            }

            /*
            |--------------------------------------------------------------------------
            | BOB - DECRYPT WITH SECRET KEY
            |--------------------------------------------------------------------------
            */

            $bob = $this->engine->decrypt(
                $resolvedAlgorithm,
                $ciphertext,
                $resolvedKey
            );

            $expectedBobPlaintext = (string) (
                $encrypt['normalized_plaintext']
                ?? $plaintext
            );

            $bobPlaintext = (string) (
                $bob['plaintext']
                ?? ''
            );

            $bobStatus =
                $this->canonicalize($bobPlaintext)
                ===
                $this->canonicalize($expectedBobPlaintext)
                    ? 'success'
                    : 'mismatch';

            /*
            |--------------------------------------------------------------------------
            | TRUDY - ATTACK WITHOUT SECRET KEY
            |--------------------------------------------------------------------------
            */

            try {
                $trudy = $this->engine->crack(
                    $ciphertext,
                    $resolvedAlgorithm
                );
            } catch (Throwable $trudyException) {
                $trudy = [
                    'success' => false,
                    'status' => 'attack_failed',
                    'message' =>
                        $trudyException->getMessage(),
                ];
            }

            $trudyPlaintext = isset(
                $trudy['plaintext']
            )
                ? (string) $trudy['plaintext']
                : null;

            $trudyRecoveredCorrectPlaintext =
                $trudyPlaintext !== null
                && $this->canonicalize(
                    $trudyPlaintext
                )
                === $this->canonicalize(
                    $expectedBobPlaintext
                );

            if ($trudyRecoveredCorrectPlaintext) {
                $trudyStatus = 'compromised';
            } elseif (
                $trudyPlaintext !== null
                && trim($trudyPlaintext) !== ''
            ) {
                $trudyStatus = 'candidate_found';
            } else {
                $trudyStatus = 'protected';
            }

            /*
            |--------------------------------------------------------------------------
            | DATABASE
            |--------------------------------------------------------------------------
            */

            $simulation = MessageSimulation::create([
                'sender' => 'Alice',
                'receiver' => 'Bob',
                'attacker' => 'Trudy',

                'plaintext' => $plaintext,
                'ciphertext' => $ciphertext,

                'algorithm' => $resolvedAlgorithm,

                'key_value' =>
                    $this->stringifyKey(
                        $resolvedKey
                    ),

                'bob_result' =>
                    $bobPlaintext,

                'trudy_result' =>
                    $trudyPlaintext
                    ?? ($trudy['message'] ?? null),

                'bob_status' =>
                    $bobStatus,

                'trudy_status' =>
                    $trudyStatus,

                /*
                 * Secret key asli TIDAK dimasukkan
                 * ke metadata Trudy.
                 */
                'metadata' => [
                    'normalized_plaintext' =>
                        $expectedBobPlaintext,

                    'encryption_reason' =>
                        $encrypt['reason'] ?? null,

                    'encryption_notes' =>
                        $encrypt['notes'] ?? [],

                    'trudy_analysis' => [
                        'success' =>
                            $trudy['success'] ?? false,

                        'status' =>
                            $trudy['status'] ?? null,

                        'detected_algorithm' =>
                            $trudy['detected_algorithm']
                            ?? null,

                        'confidence' =>
                            $trudy['confidence']
                            ?? null,

                        /*
                         * Ini bukan secret key yang
                         * dibocorkan Alice/Bob.
                         *
                         * Kalau ada, ini adalah key
                         * yang BERHASIL ditemukan
                         * oleh cryptanalysis Trudy.
                         */
                        'recovered_key' =>
                            $trudy['recovered_key']
                            ?? null,

                        'message' =>
                            $trudy['message']
                            ?? null,

                        'candidates' =>
                            $trudy['candidates']
                            ?? [],
                    ],
                ],
            ]);

            /*
            |--------------------------------------------------------------------------
            | RESPONSE
            |--------------------------------------------------------------------------
            */

            return response()->json([
                'success' => true,

                'simulation_id' =>
                    $simulation->id,

                'data' => [
                    /*
                     * ALICE VIEW
                     */
                    'alice' => [
                        'name' =>
                            'Alice',

                        'plaintext' =>
                            $plaintext,

                        'algorithm' =>
                            $resolvedAlgorithm,

                        'ciphertext' =>
                            $ciphertext,

                        'reason' =>
                            $encrypt['reason']
                            ?? null,

                        'notes' =>
                            $encrypt['notes']
                            ?? [],
                    ],

                    /*
                     * BOB VIEW
                     *
                     * Bob adalah penerima yang sah,
                     * sehingga dia memiliki key.
                     */
                    'bob' => [
                        'name' =>
                            'Bob',

                        'has_secret_key' =>
                            true,

                        'key' =>
                            $resolvedKey,

                        'status' =>
                            $bobStatus,

                        'plaintext' =>
                            $bobPlaintext,
                    ],

                    /*
                     * TRUDY VIEW
                     *
                     * Secret key Alice/Bob sengaja
                     * TIDAK diberikan ke bagian ini.
                     */
                    'trudy' => [
                        'name' =>
                            'Trudy',

                        'has_secret_key' =>
                            false,

                        'status' =>
                            $trudyStatus,

                        'detected_algorithm' =>
                            $trudy['detected_algorithm']
                            ?? null,

                        'confidence' =>
                            $trudy['confidence']
                            ?? null,

                        'recovered_plaintext' =>
                            $trudyPlaintext,

                        'recovered_key' =>
                            $trudy['recovered_key']
                            ?? null,

                        'message' =>
                            $trudy['message']
                            ?? null,

                        'candidates' =>
                            $trudy['candidates']
                            ?? [],
                    ],
                ],
            ]);
        } catch (Throwable $exception) {
            return response()->json([
                'success' => false,

                'message' =>
                    $exception->getMessage(),
            ], 422);
        }
    }

    /**
     * History simulasi.
     *
     * Ini nantinya digunakan untuk halaman
     * laporan/admin, bukan attacker view.
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

        $simulations = MessageSimulation::query()
            ->latest()
            ->limit($limit)
            ->get();

        return response()->json([
            'success' => true,
            'count' => $simulations->count(),
            'data' => $simulations,
        ]);
    }

    /**
     * Detail lengkap simulasi untuk laporan.
     */
    public function show(
        MessageSimulation $messageSimulation
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'data' => $messageSimulation,
        ]);
    }

    /**
     * Endpoint khusus "Trudy View".
     *
     * Endpoint ini sengaja TIDAK mengirim:
     * - plaintext Alice
     * - secret key Alice/Bob
     * - Bob result
     */
    public function trudyView(
        MessageSimulation $messageSimulation
    ): JsonResponse {
        $metadata =
            $messageSimulation->metadata ?? [];

        return response()->json([
            'success' => true,

            'data' => [
                'attacker' =>
                    $messageSimulation->attacker,

                'ciphertext' =>
                    $messageSimulation->ciphertext,

                'algorithm' =>
                    $messageSimulation->algorithm,

                'has_secret_key' =>
                    false,

                'status' =>
                    $messageSimulation->trudy_status,

                'recovered_result' =>
                    $messageSimulation->trudy_result,

                'analysis' =>
                    $metadata['trudy_analysis']
                    ?? null,
            ],
        ]);
    }

    /**
     * Simpan key ke format string.
     */
    private function stringifyKey(
        mixed $key
    ): ?string {
        if (
            $key === null
            || $key === ''
        ) {
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

    /**
     * Normalisasi hanya untuk membandingkan
     * apakah hasil dekripsi/attack sama.
     *
     * Penting untuk Playfair/Hill yang dapat
     * mengubah spasi, J/I, atau padding.
     */
    private function canonicalize(
        string $value
    ): string {
        $value = mb_strtoupper(
            $value,
            'UTF-8'
        );

        return preg_replace(
            '/[^\p{L}\p{N}]+/u',
            '',
            $value
        ) ?? '';
    }
}