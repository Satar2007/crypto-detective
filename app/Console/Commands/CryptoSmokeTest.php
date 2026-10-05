<?php

namespace App\Console\Commands;

use App\Models\CryptoOperation;
use App\Services\CryptoEngineService;
use Illuminate\Console\Command;
use Throwable;

class CryptoSmokeTest extends Command
{
    /**
     * Nama command.
     */
    protected $signature = 'crypto:smoke';

    /**
     * Deskripsi command.
     */
    protected $description = 'Smoke test Crypto Detective: Laravel, FastAPI, cipher engine, dan database';

    /**
     * Jalankan smoke test.
     */
    public function handle(CryptoEngineService $engine): int
    {
        try {
            $this->newLine();
            $this->info('==========================================');
            $this->info('      CRYPTO DETECTIVE SMOKE TEST');
            $this->info('==========================================');

            /*
            |--------------------------------------------------------------------------
            | 1. HEALTH CHECK
            |--------------------------------------------------------------------------
            */

            $this->newLine();
            $this->info('[1/5] Python Crypto Engine health check...');

            $health = $engine->health();

            if (($health['status'] ?? null) !== 'ok') {
                throw new \RuntimeException(
                    'Python Crypto Engine tidak mengembalikan status ok.'
                );
            }

            $algorithms = $health['algorithms'] ?? [];

            $this->info('PASS');
            $this->line(
                'Engine     : ' . ($health['engine'] ?? 'unknown')
            );
            $this->line(
                'Algorithms : ' . implode(', ', $algorithms)
            );

            /*
            |--------------------------------------------------------------------------
            | 2. ENCRYPT TEST
            |--------------------------------------------------------------------------
            */

            $this->newLine();
            $this->info('[2/5] Caesar encryption test...');

            $plaintext = 'BELAJAR KRIPTOGRAFI';

            $encrypt = $engine->encrypt(
                $plaintext,
                'caesar',
                3
            );

            $expectedCiphertext = 'EHODMDU NULSWRJUDIL';

            if (($encrypt['ciphertext'] ?? null) !== $expectedCiphertext) {
                throw new \RuntimeException(
                    'Hasil Caesar encryption tidak sesuai. '
                    . 'Expected: '
                    . $expectedCiphertext
                    . ' | Actual: '
                    . ($encrypt['ciphertext'] ?? 'null')
                );
            }

            $this->info('PASS');
            $this->line(
                'Plaintext  : ' . $plaintext
            );
            $this->line(
                'Ciphertext : ' . $encrypt['ciphertext']
            );
            $this->line(
                'Key        : ' . $encrypt['key']
            );

            /*
            |--------------------------------------------------------------------------
            | 3. DECRYPT TEST
            |--------------------------------------------------------------------------
            */

            $this->newLine();
            $this->info('[3/5] Caesar decryption test...');

            $decrypt = $engine->decrypt(
                'caesar',
                $encrypt['ciphertext'],
                3
            );

            if (($decrypt['plaintext'] ?? null) !== $plaintext) {
                throw new \RuntimeException(
                    'Hasil Caesar decryption tidak sesuai.'
                );
            }

            $this->info('PASS');
            $this->line(
                'Recovered plaintext : ' . $decrypt['plaintext']
            );

            /*
            |--------------------------------------------------------------------------
            | 4. CRACK TEST
            |--------------------------------------------------------------------------
            */

            $this->newLine();
            $this->info('[4/5] Automatic cipher crack test...');

            $crackCiphertext =
                'ILZVR RPAH ILYALTB KP RHTWBZ KHU ILSHQHY RYPWAVNYHMP';

            $expectedCrackPlaintext =
                'BESOK KITA BERTEMU DI KAMPUS DAN BELAJAR KRIPTOGRAFI';

            $crack = $engine->crack(
                $crackCiphertext
            );

            if (
                ($crack['detected_algorithm'] ?? null) !== 'caesar'
            ) {
                throw new \RuntimeException(
                    'Crack gagal mendeteksi Caesar.'
                );
            }

            if (
                (int) ($crack['recovered_key'] ?? -1) !== 7
            ) {
                throw new \RuntimeException(
                    'Recovered key seharusnya 7.'
                );
            }

            if (
                ($crack['plaintext'] ?? null)
                !== $expectedCrackPlaintext
            ) {
                throw new \RuntimeException(
                    'Recovered plaintext tidak sesuai.'
                );
            }

            $this->info('PASS');
            $this->line(
                'Detected algorithm : '
                . $crack['detected_algorithm']
            );
            $this->line(
                'Recovered key      : '
                . $crack['recovered_key']
            );
            $this->line(
                'Confidence         : '
                . $crack['confidence']
            );
            $this->line(
                'Plaintext          : '
                . $crack['plaintext']
            );

            /*
            |--------------------------------------------------------------------------
            | 5. DATABASE PERSISTENCE
            |--------------------------------------------------------------------------
            */

            $this->newLine();
            $this->info('[5/5] MySQL persistence test...');

            $operation = CryptoOperation::create([
                'mode' => 'encrypt',
                'algorithm' => $encrypt['algorithm'] ?? 'caesar',
                'input_text' => $plaintext,
                'output_text' => $encrypt['ciphertext'],
                'key_value' => (string) ($encrypt['key'] ?? 3),
                'confidence' => 100,
                'status' => 'success',
                'reason' => 'Laravel-FastAPI integration smoke test',
                'metadata' => [
                    'test' => true,
                    'source' => 'crypto:smoke',
                    'engine' => $health['engine'] ?? null,
                    'response' => $encrypt,
                ],
            ]);

            if (! $operation->exists) {
                throw new \RuntimeException(
                    'CryptoOperation gagal disimpan ke database.'
                );
            }

            $freshOperation = CryptoOperation::find(
                $operation->id
            );

            if ($freshOperation === null) {
                throw new \RuntimeException(
                    'Record tidak ditemukan kembali setelah disimpan.'
                );
            }

            $this->info('PASS');
            $this->line(
                'Database record ID : '
                . $freshOperation->id
            );
            $this->line(
                'Algorithm          : '
                . $freshOperation->algorithm
            );
            $this->line(
                'Status             : '
                . $freshOperation->status
            );

            /*
            |--------------------------------------------------------------------------
            | SUCCESS
            |--------------------------------------------------------------------------
            */

            $this->newLine();
            $this->info('==========================================');
            $this->info(' ALL CRYPTO DETECTIVE SMOKE TESTS PASSED');
            $this->info('==========================================');

            $this->newLine();

            return self::SUCCESS;
        } catch (Throwable $exception) {
            $this->newLine();
            $this->error('==========================================');
            $this->error(' CRYPTO DETECTIVE SMOKE TEST FAILED');
            $this->error('==========================================');

            $this->newLine();

            $this->error(
                $exception->getMessage()
            );

            $this->newLine();

            return self::FAILURE;
        }
    }
}