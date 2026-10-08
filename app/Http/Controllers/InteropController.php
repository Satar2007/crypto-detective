<?php

namespace App\Http\Controllers;

use App\Models\CryptoOperation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Throwable;

class InteropController extends Controller
{
    private function text(string $encoded, string $field): string
    {
        $value = base64_decode($encoded, true);
        if ($value === false || !mb_check_encoding($value, 'UTF-8')) {
            throw ValidationException::withMessages([$field => 'Data harus Base64 dari teks UTF-8 yang valid.']);
        }
        return $value;
    }

    public function process(Request $request): JsonResponse
    {
        $data = $request->validate([
            'mode' => ['required', 'in:encrypt,decrypt'],
            'variant' => ['required', 'in:caesar,caesar-az,vigenere,vigenere-az,playfair,playfair-xq,hill,hill-matrix,otp-byte,otp-alpha,otp-text,stream-sha256,stream-rc4,stream-rc4-byte,stream-lcg'],
            'text_b64' => ['required', 'string', 'max:8388608'],
            'key_b64' => ['nullable', 'string', 'max:8388608'],
            'cipher_format' => ['required', 'in:hex,base64'],
            'key_format' => ['required', 'in:hex,base64'],
            'record' => ['nullable', 'boolean'],
        ]);
        $text = $this->text($data['text_b64'], 'text_b64');
        $key = isset($data['key_b64']) ? $this->text($data['key_b64'], 'key_b64') : '';
        if ($text === '' || strlen($text) > ($data['mode'] === 'encrypt' ? 2097152 : 6291456)) {
            throw ValidationException::withMessages(['text_b64' => 'Pesan kosong atau melebihi batas 2 MB plaintext / 6 MB ciphertext.']);
        }
        if ($data['mode'] === 'decrypt' && $key === '') {
            throw ValidationException::withMessages(['key_b64' => 'Dekripsi membutuhkan key.']);
        }
        try {
            $response = Http::timeout(120)->acceptJson()->post(
                rtrim((string) config('services.crypto_engine.url', 'http://127.0.0.1:8100'), '/') . '/coursework/interop',
                ['mode' => $data['mode'], 'variant' => $data['variant'], 'text' => $text, 'key' => $key,
                 'cipher_format' => $data['cipher_format'], 'key_format' => $data['key_format']]
            );
        } catch (Throwable $e) {
            report($e);
            return response()->json(['success' => false, 'message' => 'Python engine tidak terhubung.'], 503);
        }
        if (!$response->successful()) {
            return response()->json(['success' => false, 'message' => $response->json('detail') ?? 'Operasi gagal.'], $response->status());
        }
        $result = $response->json();
        $output = (string) ($result[$data['mode'] === 'encrypt' ? 'ciphertext' : 'plaintext'] ?? '');
        $resolvedKey = is_array($result['key'] ?? null) ? json_encode($result['key']) : (string) ($result['key'] ?? $key);
        $id = null;
        if ($request->boolean('record')) {
            $row = CryptoOperation::create([
                'mode' => $data['mode'], 'algorithm' => $result['algorithm'], 'input_text' => $text,
                'output_text' => $output, 'key_value' => $resolvedKey, 'status' => 'success',
                'reason' => 'Lab; varian ' . $data['variant'],
                'metadata' => ['variant' => $data['variant'], 'metrics' => $result['metrics'] ?? null,
                               'cipher_format' => $data['cipher_format'], 'key_format' => $data['key_format']],
            ]);
            $id = $row->id;
        }
        return response()->json(['success' => true, 'algorithm' => $result['algorithm'],
            'variant' => $data['variant'], 'output_b64' => base64_encode($output), 'key_b64' => base64_encode($resolvedKey),
            'metrics' => $result['metrics'] ?? null, 'notes' => $result['notes'] ?? [], 'operation_id' => $id]);
    }
}
