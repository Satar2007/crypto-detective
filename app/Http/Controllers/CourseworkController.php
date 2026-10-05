<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Throwable;

class CourseworkController extends Controller
{
    private function engineUrl(): string
    {
        return rtrim((string) config(
            'services.crypto_engine.url',
            'http://127.0.0.1:8100'
        ), '/');
    }

    private function normalizeKey(string $algorithm, mixed $key): mixed
    {
        if ($key === null || $key === '') {
            return null;
        }

        $algorithm = strtolower(trim($algorithm));

        if ($algorithm === 'caesar') {
            if (!is_numeric($key)) {
                throw ValidationException::withMessages([
                    'key' => 'Key Caesar harus berupa angka shift.',
                ]);
            }
            return (int) $key;
        }

        if ($algorithm === 'hill') {
            if (is_array($key)) {
                $parts = $key;
            } else {
                preg_match_all('/-?\d+/', (string) $key, $matches);
                $parts = $matches[0] ?? [];
            }

            if (count($parts) !== 4) {
                throw ValidationException::withMessages([
                    'key' => 'Key Hill 2x2 harus tepat 4 integer, misalnya 7 8 19 3.',
                ]);
            }

            return array_map('intval', $parts);
        }

        return (string) $key;
    }

    private function engineError($response): JsonResponse
    {
        $detail = $response->json('detail');
        $message = is_string($detail) && $detail !== ''
            ? $detail
            : 'Python Crypto Engine menolak request.';

        return response()->json([
            'success' => false,
            'message' => $message,
            'engine_status' => $response->status(),
        ], $response->status() >= 400 ? $response->status() : 500);
    }

    public function fileProcess(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mode' => ['required', 'in:encrypt,decrypt'],
            'algorithm' => ['required', 'in:caesar,vigenere,playfair,hill,otp,stream'],
            'key' => ['nullable'],
            'file' => ['required', 'file', 'max:2048'],
        ]);

        $file = $request->file('file');
        if (strtolower((string) $file->getClientOriginalExtension()) !== 'txt') {
            throw ValidationException::withMessages([
                'file' => 'File harus berekstensi .txt.',
            ]);
        }

        $content = file_get_contents($file->getRealPath());
        if ($content === false || trim($content) === '') {
            throw ValidationException::withMessages([
                'file' => 'File .txt kosong atau tidak dapat dibaca.',
            ]);
        }

        $mode = $validated['mode'];
        $algorithm = $validated['algorithm'];
        $key = $this->normalizeKey($algorithm, $validated['key'] ?? null);

        if ($mode === 'decrypt' && ($key === null || $key === '')) {
            throw ValidationException::withMessages([
                'key' => 'Decrypt membutuhkan secret key.',
            ]);
        }

        $payload = ['algorithm' => $algorithm];
        $payload[$mode === 'encrypt' ? 'plaintext' : 'ciphertext'] = $content;
        if ($key !== null && $key !== '') {
            $payload['key'] = $key;
        }

        try {
            $response = Http::timeout(120)
                ->acceptJson()
                ->asJson()
                ->post(
                    $this->engineUrl() . ($mode === 'encrypt' ? '/encrypt' : '/decrypt'),
                    $payload
                );
        } catch (Throwable $e) {
            report($e);
            return response()->json([
                'success' => false,
                'message' => 'Tidak dapat terhubung ke Python Crypto Engine.',
            ], 503);
        }

        if (!$response->successful()) {
            return $this->engineError($response);
        }

        $result = $response->json();
        $outputText = $mode === 'encrypt'
            ? (string) ($result['ciphertext'] ?? '')
            : (string) ($result['plaintext'] ?? '');

        $basename = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $safeBasename = preg_replace('/[^A-Za-z0-9_-]+/', '-', $basename) ?: 'crypto-file';

        return response()->json([
            'success' => true,
            'mode' => $mode,
            'algorithm' => $algorithm,
            'input_name' => $file->getClientOriginalName(),
            'input_bytes' => strlen($content),
            'output_bytes' => strlen($outputText),
            'output_text' => $outputText,
            'key' => $result['key'] ?? $key,
            'normalized_plaintext' => $result['normalized_plaintext'] ?? null,
            'reason' => $result['reason'] ?? null,
            'notes' => $result['notes'] ?? [],
            'download_name' => $safeBasename
                . ($mode === 'encrypt' ? '-encrypted' : '-decrypted')
                . '.txt',
        ]);
    }

    public function benchmark(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plaintext' => ['required', 'string', 'min:10', 'max:20000'],
            'iterations' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        try {
            $response = Http::timeout(180)
                ->acceptJson()
                ->asJson()
                ->post($this->engineUrl() . '/coursework/benchmark', [
                    'plaintext' => $validated['plaintext'],
                    'iterations' => $validated['iterations'] ?? 10,
                ]);
        } catch (Throwable $e) {
            report($e);
            return response()->json([
                'success' => false,
                'message' => 'Tidak dapat terhubung ke endpoint benchmark Python.',
            ], 503);
        }

        if (!$response->successful()) {
            return $this->engineError($response);
        }

        return response()->json($response->json());
    }
}
