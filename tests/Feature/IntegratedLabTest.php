<?php
namespace Tests\Feature;
use App\Models\CryptoOperation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class IntegratedLabTest extends TestCase
{
    use RefreshDatabase;
    protected function defineEnvironment($app): void
    {
        $app['config']->set('database.default', 'sqlite');
        $app['config']->set('database.connections.sqlite.database', ':memory:');
        $app['config']->set('cache.default', 'array');
        $app['config']->set('session.driver', 'array');
    }
    protected function setUp(): void { parent::setUp(); Http::preventStrayRequests(); }
    private function fakeEngine(string $algorithm = 'caesar'): array
    {
        $r = ['success' => true, 'algorithm' => $algorithm, 'ciphertext' => 'KDO R', 'plaintext' => 'HAL O', 'key' => 3,
            'metrics' => ['operation_count' => 1, 'runtime_ms' => 0.12, 'input_bytes' => 5, 'output_bytes' => 5]];
        Http::fake(['*' => Http::response($r)]); return $r;
    }
    private function payload(array $extra = []): array
    {
        return array_merge(['mode' => 'encrypt', 'algorithm' => 'caesar', 'key' => 3,
            'file' => UploadedFile::fake()->createWithContent('pesan.txt', 'HAL O')], $extra);
    }
    public function test_manual_result_metrics_are_recorded(): void
    {
        $r = $this->fakeEngine();
        $this->postJson('/api/coursework/file-process', $this->payload(['record' => true]))
            ->assertOk()->assertJsonPath('metrics.runtime_ms', 0.12)->assertJsonPath('output_text', 'KDO R');
        $this->assertEquals($r['metrics'], CryptoOperation::sole()->metadata['metrics']); Http::assertSentCount(1);
    }
    public function test_candidate_requests_do_not_write_history(): void
    {
        $this->fakeEngine();
        $this->postJson('/api/coursework/file-process', $this->payload(['mode' => 'decrypt']))
            ->assertOk()->assertJsonPath('operation_id', null)->assertJsonPath('metrics.operation_count', 1);
        $this->assertDatabaseCount('crypto_operations', 0); Http::assertSentCount(1);
    }
    public function test_auto_encrypt_returns_resolved_algorithm(): void
    {
        $this->fakeEngine('vigenere');
        $this->postJson('/api/coursework/file-process', $this->payload(['algorithm' => 'auto', 'record' => true]))
            ->assertOk()->assertJsonPath('algorithm', 'vigenere');
        $this->assertSame('vigenere', CryptoOperation::sole()->algorithm); Http::assertSentCount(1);
    }
    public function test_invalid_utf8_is_rejected_before_engine(): void
    {
        $this->postJson('/api/coursework/file-process', $this->payload([
            'file' => UploadedFile::fake()->createWithContent('bad.txt', "\xff\xfe")]))
            ->assertUnprocessable()->assertJsonValidationErrors('file'); Http::assertNothingSent();
    }
    public function test_otp_alphabet_uses_measured_endpoint(): void
    {
        $this->fakeEngine('otp-alpha');
        $this->postJson('/api/coursework/file-process', $this->payload(['algorithm' => 'otp-alpha', 'key' => 'XMCK']))
            ->assertOk()->assertJsonPath('metrics.operation_count', 1);
        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/coursework/otp-alpha') && $request['mode'] === 'encrypt');
    }
    public function test_decrypt_auto_is_rejected_before_engine(): void
    {
        $this->postJson('/api/coursework/file-process', $this->payload(['mode' => 'decrypt', 'algorithm' => 'auto']))
            ->assertUnprocessable()->assertJsonValidationErrors('algorithm'); Http::assertNothingSent();
    }
    public function test_dika_hill_three_by_three_uses_profile_endpoint(): void
    {
        $this->fakeEngine('hill');
        $key = '6 24 1 13 16 10 20 17 15';
        $this->postJson('/api/coursework/file-process', $this->payload([
            'profile' => 'cryptozar-dika', 'algorithm' => 'hill', 'key' => $key, 'record' => true]))
            ->assertOk()->assertJsonPath('metrics.operation_count', 1);
        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/coursework/cryptozar')
            && $request['algorithm'] === 'hill' && $request['key'] === $key);
        $this->assertSame('cryptozar-dika', CryptoOperation::sole()->metadata['profile']);
    }
    public function test_dika_rejects_auto_and_unknown_profile(): void
    {
        foreach ([['profile' => 'cryptozar-dika', 'algorithm' => 'auto'],
                  ['profile' => 'cryptozar-dika', 'algorithm' => 'otp-alpha'],
                  ['profile' => 'unknown']] as $extra) {
            $this->postJson('/api/coursework/file-process', $this->payload($extra))->assertUnprocessable();
        }
        Http::assertNothingSent();
    }
    public function test_dika_file_preserves_utf8_bom_and_crlf(): void
    {
        $this->fakeEngine('stream');
        $text = "\xEF\xBB\xBFHalo\r\nBob";
        $this->postJson('/api/coursework/file-process', $this->payload([
            'profile' => 'cryptozar-dika', 'algorithm' => 'stream', 'key' => '77',
            'file' => UploadedFile::fake()->createWithContent('pesan.txt', $text)]))->assertOk();
        Http::assertSent(fn ($request) => $request['text'] === $text && $request['key'] === '77');
    }
}
