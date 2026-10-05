<?php

namespace Tests\Feature;

use App\Models\MessageSimulation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MessageSimulationApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Gunakan SQLite in-memory.
     *
     * Database MySQL crypto_detective asli
     * tidak akan disentuh oleh feature test.
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
         * Jangan izinkan feature test menghubungi
         * FastAPI asli secara tidak sengaja.
         */
        Http::preventStrayRequests();
    }

    public function test_caesar_simulation_can_be_compromised_by_trudy(): void
    {
        $plaintext =
            'BESOK KITA BERTEMU DI KAMPUS '
            . 'DAN BELAJAR KRIPTOGRAFI';

        $ciphertext =
            'ILZVR RPAH ILYALTB KP RHTWBZ '
            . 'KHU ILSHQHY RYPWAVNYHMP';

        Http::fake([
            '*/encrypt' => Http::response([
                'success' => true,
                'algorithm' => 'caesar',
                'ciphertext' => $ciphertext,
                'key' => 7,
                'normalized_plaintext' => $plaintext,
                'reason' =>
                    'Algoritma dipilih manual untuk demonstrasi.',
                'notes' => [],
            ], 200),

            '*/decrypt' => Http::response([
                'success' => true,
                'algorithm' => 'caesar',
                'plaintext' => $plaintext,
            ], 200),

            '*/crack' => Http::response([
                'success' => true,
                'status' => 'cracked',
                'detected_algorithm' => 'caesar',
                'confidence' => 99,
                'plaintext' => $plaintext,
                'recovered_key' => 7,
                'message' =>
                    'Cipher kandidat berhasil dianalisis.',
                'candidates' => [
                    [
                        'algorithm' => 'caesar',
                        'confidence' => 99,
                        'plaintext' => $plaintext,
                        'recovered_key' => 7,
                        'status' => 'cracked',
                    ],
                ],
            ], 200),
        ]);

        $response = $this->postJson(
            '/api/simulation/run',
            [
                'plaintext' => $plaintext,
                'algorithm' => 'caesar',
                'key' => 7,
            ]
        );

        $response
            ->assertOk()
            ->assertJsonPath(
                'success',
                true
            )
            ->assertJsonPath(
                'data.alice.algorithm',
                'caesar'
            )
            ->assertJsonPath(
                'data.alice.ciphertext',
                $ciphertext
            )
            ->assertJsonPath(
                'data.bob.has_secret_key',
                true
            )
            ->assertJsonPath(
                'data.bob.status',
                'success'
            )
            ->assertJsonPath(
                'data.bob.plaintext',
                $plaintext
            )
            ->assertJsonPath(
                'data.trudy.has_secret_key',
                false
            )
            ->assertJsonPath(
                'data.trudy.status',
                'compromised'
            )
            ->assertJsonPath(
                'data.trudy.detected_algorithm',
                'caesar'
            )
            ->assertJsonPath(
                'data.trudy.recovered_key',
                7
            )
            ->assertJsonPath(
                'data.trudy.recovered_plaintext',
                $plaintext
            );

        $this->assertDatabaseHas(
            'message_simulations',
            [
                'sender' => 'Alice',
                'receiver' => 'Bob',
                'attacker' => 'Trudy',
                'algorithm' => 'caesar',
                'plaintext' => $plaintext,
                'ciphertext' => $ciphertext,
                'key_value' => '7',
                'bob_status' => 'success',
                'trudy_status' => 'compromised',
            ]
        );

        Http::assertSentCount(3);

        Http::assertSent(
            function (HttpRequest $request) use (
                $plaintext
            ) {
                return str_ends_with(
                    $request->url(),
                    '/encrypt'
                )
                    && $request['plaintext']
                        === $plaintext
                    && $request['algorithm']
                        === 'caesar'
                    && $request['key']
                        === 7;
            }
        );

        Http::assertSent(
            function (HttpRequest $request) use (
                $ciphertext
            ) {
                return str_ends_with(
                    $request->url(),
                    '/decrypt'
                )
                    && $request['ciphertext']
                        === $ciphertext
                    && $request['key']
                        === 7;
            }
        );

        /*
         * Perhatikan:
         *
         * Request ke /crack hanya membawa ciphertext.
         * Secret key TIDAK dikirim ke Trudy.
         */
        Http::assertSent(
            function (HttpRequest $request) use (
                $ciphertext
            ) {
                if (! str_ends_with(
                    $request->url(),
                    '/crack'
                )) {
                    return false;
                }

                return $request['ciphertext']
                    === $ciphertext
                    && ! isset($request['key']);
            }
        );
    }

    public function test_trudy_view_does_not_expose_original_secret(): void
    {
        $simulation = MessageSimulation::create([
            'sender' => 'Alice',
            'receiver' => 'Bob',
            'attacker' => 'Trudy',

            'plaintext' =>
                'PESAN SANGAT RAHASIA',

            'ciphertext' =>
                'WLZHU ZHUNHW UHOHZPH',

            'algorithm' =>
                'caesar',

            /*
             * Secret asli memang tersimpan
             * untuk kebutuhan laporan internal.
             */
            'key_value' =>
                '7',

            'bob_result' =>
                'PESAN SANGAT RAHASIA',

            'trudy_result' =>
                'PESAN SANGAT RAHASIA',

            'bob_status' =>
                'success',

            'trudy_status' =>
                'compromised',

            'metadata' => [
                'trudy_analysis' => [
                    'status' =>
                        'cracked',

                    /*
                     * Ini adalah key hasil recovery
                     * cryptanalysis Trudy.
                     */
                    'recovered_key' =>
                        7,

                    'confidence' =>
                        99,
                ],
            ],
        ]);

        $response = $this->getJson(
            '/api/simulation/'
            . $simulation->id
            . '/trudy'
        );

        $response
            ->assertOk()
            ->assertJsonPath(
                'success',
                true
            )
            ->assertJsonPath(
                'data.attacker',
                'Trudy'
            )
            ->assertJsonPath(
                'data.has_secret_key',
                false
            )
            ->assertJsonPath(
                'data.status',
                'compromised'
            )
            ->assertJsonPath(
                'data.analysis.recovered_key',
                7
            );

        $data = $response->json('data');

        /*
         * Pastikan API Trudy tidak memberikan
         * data rahasia Alice/Bob.
         */
        $this->assertArrayNotHasKey(
            'key_value',
            $data
        );

        $this->assertArrayNotHasKey(
            'key',
            $data
        );

        $this->assertArrayNotHasKey(
            'plaintext',
            $data
        );

        $this->assertArrayNotHasKey(
            'bob_result',
            $data
        );
    }

    public function test_trudy_is_protected_when_attack_cannot_recover_plaintext(): void
    {
        $plaintext =
            'RAHASIA ANTARA ALICE DAN BOB';

        $ciphertext =
            '7f91a32b0c4f-example-ciphertext';

        $otpKey =
            'SECRET-OTP-KEY-ONLY-FOR-ALICE-BOB';

        Http::fake([
            '*/encrypt' => Http::response([
                'success' => true,
                'algorithm' => 'otp',
                'ciphertext' => $ciphertext,
                'key' => $otpKey,
                'normalized_plaintext' => $plaintext,
                'reason' =>
                    'OTP dipilih untuk simulasi.',
                'notes' => [
                    'Secret key diperlukan untuk dekripsi.',
                ],
            ], 200),

            '*/decrypt' => Http::response([
                'success' => true,
                'algorithm' => 'otp',
                'plaintext' => $plaintext,
            ], 200),

            '*/crack' => Http::response([
                'success' => true,
                'status' => 'key_required',
                'detected_algorithm' => 'otp',
                'confidence' => 40,
                'plaintext' => null,
                'recovered_key' => null,
                'message' =>
                    'OTP tidak dapat didekripsi secara pasti tanpa key.',
                'candidates' => [],
            ], 200),
        ]);

        $response = $this->postJson(
            '/api/simulation/run',
            [
                'plaintext' => $plaintext,
                'algorithm' => 'otp',
                'key' => $otpKey,
            ]
        );

        $response
            ->assertOk()
            ->assertJsonPath(
                'data.bob.status',
                'success'
            )
            ->assertJsonPath(
                'data.bob.plaintext',
                $plaintext
            )
            ->assertJsonPath(
                'data.trudy.has_secret_key',
                false
            )
            ->assertJsonPath(
                'data.trudy.status',
                'protected'
            )
            ->assertJsonPath(
                'data.trudy.recovered_plaintext',
                null
            )
            ->assertJsonPath(
                'data.trudy.recovered_key',
                null
            );

        $this->assertDatabaseHas(
            'message_simulations',
            [
                'algorithm' =>
                    'otp',

                'bob_status' =>
                    'success',

                'trudy_status' =>
                    'protected',
            ]
        );

        /*
         * Sangat penting:
         * request cryptanalysis tidak boleh
         * membawa OTP key.
         */
        Http::assertSent(
            function (HttpRequest $request) use (
                $ciphertext
            ) {
                if (! str_ends_with(
                    $request->url(),
                    '/crack'
                )) {
                    return false;
                }

                return $request['ciphertext']
                    === $ciphertext
                    && ! isset($request['key']);
            }
        );
    }

    public function test_simulation_history_endpoint_works(): void
    {
        MessageSimulation::create([
            'sender' => 'Alice',
            'receiver' => 'Bob',
            'attacker' => 'Trudy',
            'plaintext' => 'HELLO',
            'ciphertext' => 'KHOOR',
            'algorithm' => 'caesar',
            'key_value' => '3',
            'bob_result' => 'HELLO',
            'trudy_result' => null,
            'bob_status' => 'success',
            'trudy_status' => 'protected',
            'metadata' => [],
        ]);

        $response = $this->getJson(
            '/api/simulation/history'
        );

        $response
            ->assertOk()
            ->assertJsonPath(
                'success',
                true
            )
            ->assertJsonPath(
                'count',
                1
            )
            ->assertJsonCount(
                1,
                'data'
            );
    }

    public function test_invalid_simulation_algorithm_is_rejected(): void
    {
        Http::fake();

        $response = $this->postJson(
            '/api/simulation/run',
            [
                'plaintext' =>
                    'RAHASIA',

                'algorithm' =>
                    'super_cipher_ngawur',

                'key' =>
                    '123',
            ]
        );

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors([
                'algorithm',
            ]);

        $this->assertDatabaseCount(
            'message_simulations',
            0
        );

        Http::assertNothingSent();
    }
}