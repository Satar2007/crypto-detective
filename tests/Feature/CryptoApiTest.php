<?php

namespace Tests\Feature;

use App\Models\CryptoOperation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CryptoApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Gunakan database SQLite in-memory selama testing.
     *
     * Dengan ini, test tidak akan menyentuh database
     * MySQL utama crypto_detective.
     */
    protected function defineEnvironment($app): void
    {
        $app['config']->set(
            'database.default',
            'sqlite'
        );

        $app['config']->set(
            'database.connections.sqlite.database',
            ':memory:'
        );

        $app['config']->set(
            'cache.default',
            'array'
        );

        $app['config']->set(
            'session.driver',
            'array'
        );

        $app['config']->set(
            'queue.default',
            'sync'
        );
    }

    protected function setUp(): void
    {
        parent::setUp();

        /*
         * Kalau ada request HTTP yang tidak kita fake,
         * test langsung gagal.
         *
         * Jadi test tidak akan diam-diam menghubungi
         * FastAPI asli.
         */
        Http::preventStrayRequests();
    }

    public function test_crypto_health_endpoint_works(): void
    {
        Http::fake([
            '*/health' => Http::response([
                'status' => 'ok',
                'engine' => 'crypto-detective',
                'algorithms' => [
                    'caesar',
                    'vigenere',
                    'playfair',
                    'hill',
                    'otp',
                    'stream',
                ],
            ], 200),
        ]);

        $response = $this->getJson(
            '/api/crypto/health'
        );

        $response
            ->assertOk()
            ->assertJsonPath(
                'success',
                true
            )
            ->assertJsonPath(
                'laravel',
                'ok'
            )
            ->assertJsonPath(
                'engine.status',
                'ok'
            )
            ->assertJsonPath(
                'engine.engine',
                'crypto-detective'
            );

        Http::assertSent(function (HttpRequest $request) {
            return str_ends_with(
                $request->url(),
                '/health'
            );
        });
    }

    public function test_encrypt_endpoint_saves_operation(): void
    {
        Http::fake([
            '*/encrypt' => Http::response([
                'success' => true,
                'algorithm' => 'caesar',
                'ciphertext' => 'EHODMDU NULSWRJUDIL',
                'key' => 3,
                'normalized_plaintext' =>
                    'BELAJAR KRIPTOGRAFI',
                'reason' =>
                    'Algoritma dipilih manual.',
                'notes' => [],
            ], 200),
        ]);

        $response = $this->postJson(
            '/api/crypto/encrypt',
            [
                'plaintext' =>
                    'BELAJAR KRIPTOGRAFI',

                'algorithm' =>
                    'caesar',

                'key' =>
                    3,
            ]
        );

        $response
            ->assertOk()
            ->assertJsonPath(
                'success',
                true
            )
            ->assertJsonPath(
                'data.algorithm',
                'caesar'
            )
            ->assertJsonPath(
                'data.ciphertext',
                'EHODMDU NULSWRJUDIL'
            )
            ->assertJsonPath(
                'data.key',
                3
            );

        $this->assertDatabaseHas(
            'crypto_operations',
            [
                'mode' =>
                    'encrypt',

                'algorithm' =>
                    'caesar',

                'input_text' =>
                    'BELAJAR KRIPTOGRAFI',

                'output_text' =>
                    'EHODMDU NULSWRJUDIL',

                'key_value' =>
                    '3',

                'status' =>
                    'success',
            ]
        );

        Http::assertSent(function (HttpRequest $request) {
            return str_ends_with(
                $request->url(),
                '/encrypt'
            )
                && $request['plaintext']
                    === 'BELAJAR KRIPTOGRAFI'
                && $request['algorithm']
                    === 'caesar'
                && $request['key']
                    === 3;
        });
    }

    public function test_decrypt_endpoint_saves_operation(): void
    {
        Http::fake([
            '*/decrypt' => Http::response([
                'success' => true,
                'algorithm' => 'caesar',
                'plaintext' =>
                    'BELAJAR KRIPTOGRAFI',
            ], 200),
        ]);

        $response = $this->postJson(
            '/api/crypto/decrypt',
            [
                'algorithm' =>
                    'caesar',

                'ciphertext' =>
                    'EHODMDU NULSWRJUDIL',

                'key' =>
                    3,
            ]
        );

        $response
            ->assertOk()
            ->assertJsonPath(
                'success',
                true
            )
            ->assertJsonPath(
                'data.algorithm',
                'caesar'
            )
            ->assertJsonPath(
                'data.plaintext',
                'BELAJAR KRIPTOGRAFI'
            );

        $this->assertDatabaseHas(
            'crypto_operations',
            [
                'mode' =>
                    'decrypt',

                'algorithm' =>
                    'caesar',

                'input_text' =>
                    'EHODMDU NULSWRJUDIL',

                'output_text' =>
                    'BELAJAR KRIPTOGRAFI',

                'key_value' =>
                    '3',

                'status' =>
                    'success',
            ]
        );

        Http::assertSent(function (HttpRequest $request) {
            return str_ends_with(
                $request->url(),
                '/decrypt'
            )
                && $request['algorithm']
                    === 'caesar'
                && $request['ciphertext']
                    === 'EHODMDU NULSWRJUDIL'
                && $request['key']
                    === 3;
        });
    }

    public function test_crack_endpoint_saves_analysis(): void
    {
        $ciphertext =
            'ILZVR RPAH ILYALTB KP RHTWBZ '
            . 'KHU ILSHQHY RYPWAVNYHMP';

        $plaintext =
            'BESOK KITA BERTEMU DI KAMPUS '
            . 'DAN BELAJAR KRIPTOGRAFI';

        Http::fake([
            '*/crack' => Http::response([
                'success' => true,
                'status' => 'cracked',

                'detected_algorithm' =>
                    'caesar',

                'confidence' =>
                    99.0,

                'plaintext' =>
                    $plaintext,

                'recovered_key' =>
                    7,

                'message' =>
                    'Cipher berhasil dianalisis.',

                'candidates' => [
                    [
                        'algorithm' =>
                            'caesar',

                        'confidence' =>
                            99.0,

                        'plaintext' =>
                            $plaintext,

                        'recovered_key' =>
                            7,

                        'status' =>
                            'cracked',
                    ],
                ],
            ], 200),
        ]);

        $response = $this->postJson(
            '/api/crypto/crack',
            [
                'ciphertext' =>
                    $ciphertext,
            ]
        );

        $response
            ->assertOk()
            ->assertJsonPath(
                'success',
                true
            )
            ->assertJsonPath(
                'data.status',
                'cracked'
            )
            ->assertJsonPath(
                'data.detected_algorithm',
                'caesar'
            )
            ->assertJsonPath(
   		 'data.confidence',
    		99
	    )
            ->assertJsonPath(
                'data.recovered_key',
                7
            )
            ->assertJsonPath(
                'data.plaintext',
                $plaintext
            );

        $this->assertDatabaseHas(
            'crypto_operations',
            [
                'mode' =>
                    'crack',

                'algorithm' =>
                    'caesar',

                'input_text' =>
                    $ciphertext,

                'output_text' =>
                    $plaintext,

                'key_value' =>
                    '7',

                'status' =>
                    'cracked',
            ]
        );

        Http::assertSent(function (HttpRequest $request) use (
            $ciphertext
        ) {
            return str_ends_with(
                $request->url(),
                '/crack'
            )
                && $request['ciphertext']
                    === $ciphertext;
        });
    }

    public function test_history_endpoint_returns_saved_operations(): void
    {
        CryptoOperation::create([
            'mode' =>
                'encrypt',

            'algorithm' =>
                'caesar',

            'input_text' =>
                'ABC',

            'output_text' =>
                'DEF',

            'key_value' =>
                '3',

            'confidence' =>
                null,

            'status' =>
                'success',

            'reason' =>
                'Feature test',

            'metadata' => [
                'source' =>
                    'test',
            ],
        ]);

        CryptoOperation::create([
            'mode' =>
                'decrypt',

            'algorithm' =>
                'caesar',

            'input_text' =>
                'DEF',

            'output_text' =>
                'ABC',

            'key_value' =>
                '3',

            'confidence' =>
                null,

            'status' =>
                'success',

            'reason' =>
                'Feature test',

            'metadata' => [
                'source' =>
                    'test',
            ],
        ]);

        $response = $this->getJson(
            '/api/crypto/history'
        );

        $response
            ->assertOk()
            ->assertJsonPath(
                'success',
                true
            )
            ->assertJsonPath(
                'count',
                2
            )
            ->assertJsonCount(
                2,
                'data'
            );
    }

    public function test_history_detail_endpoint_works(): void
    {
        $operation = CryptoOperation::create([
            'mode' =>
                'encrypt',

            'algorithm' =>
                'caesar',

            'input_text' =>
                'ABC',

            'output_text' =>
                'DEF',

            'key_value' =>
                '3',

            'confidence' =>
                null,

            'status' =>
                'success',

            'reason' =>
                'Feature test',

            'metadata' => [
                'source' =>
                    'test',
            ],
        ]);

        $response = $this->getJson(
            '/api/crypto/history/' . $operation->id
        );

        $response
            ->assertOk()
            ->assertJsonPath(
                'success',
                true
            )
            ->assertJsonPath(
                'data.id',
                $operation->id
            )
            ->assertJsonPath(
                'data.algorithm',
                'caesar'
            );
    }

    public function test_invalid_algorithm_is_rejected(): void
    {
        Http::fake();

        $response = $this->postJson(
            '/api/crypto/encrypt',
            [
                'plaintext' =>
                    'HELLO',

                'algorithm' =>
                    'algoritma_ngawur',

                'key' =>
                    3,
            ]
        );

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors([
                'algorithm',
            ]);

        $this->assertDatabaseCount(
            'crypto_operations',
            0
        );

        Http::assertNothingSent();
    }

    public function test_python_engine_error_is_handled(): void
    {
        Http::fake([
            '*/encrypt' => Http::response([
                'detail' =>
                    'Key tidak valid.',
            ], 422),
        ]);

        $response = $this->postJson(
            '/api/crypto/encrypt',
            [
                'plaintext' =>
                    'HELLO',

                'algorithm' =>
                    'caesar',

                'key' =>
                    'SALAH',
            ]
        );

        $response
            ->assertStatus(422)
            ->assertJsonPath(
                'success',
                false
            );

        $this->assertDatabaseCount(
            'crypto_operations',
            0
        );
    }
}
