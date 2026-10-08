<?php
namespace Tests\Feature;

use App\Models\CryptoOperation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class InteropLabTest extends TestCase
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
    private function payload(array $extra = []): array
    {
        return array_merge(['mode'=>'encrypt','variant'=>'otp-text','text_b64'=>base64_encode('A'),
            'key_b64'=>base64_encode('A'),'cipher_format'=>'base64','key_format'=>'base64','record'=>false],$extra);
    }
    private function fake(): void
    {
        Http::fake(['*'=>Http::response(['success'=>true,'algorithm'=>'otp','variant'=>'otp-text',
            'ciphertext'=>"\0",'plaintext'=>'A','key'=>'A', 'notes'=>[],
            'metrics'=>['operation_count'=>1,'runtime_ms'=>0.1]])]);
    }
    public function test_raw_null_output_is_preserved_in_response_and_history(): void
    {
        $this->fake();
        $this->postJson('/api/coursework/interop',$this->payload(['record'=>true]))->assertOk()
            ->assertJsonPath('output_b64',base64_encode("\0"))->assertJsonPath('metrics.operation_count',1);
        $this->assertSame("\0",CryptoOperation::sole()->output_text);
        $this->assertSame('otp-text',CryptoOperation::sole()->metadata['variant']);
    }
    public function test_crlf_bom_null_and_key_spaces_reach_engine_unmodified(): void
    {
        $this->fake();$text="\xEF\xBB\xBFHalo\r\n\0 ";$key=' KEY ';
        $this->postJson('/api/coursework/interop',$this->payload(['text_b64'=>base64_encode($text),'key_b64'=>base64_encode($key)]))->assertOk();
        Http::assertSent(fn($request)=>$request['text']===$text&&$request['key']===$key&&str_ends_with($request->url(),'/coursework/interop'));
    }
    public function test_candidate_attempts_do_not_write_history(): void
    {
        $this->fake();$this->postJson('/api/coursework/interop',$this->payload(['mode'=>'decrypt']))->assertOk()->assertJsonPath('operation_id',null);
        $this->assertDatabaseCount('crypto_operations',0);
    }
    public function test_invalid_encoding_and_variant_are_rejected_before_engine(): void
    {
        foreach([['text_b64'=>'!bad'],['text_b64'=>base64_encode("\xff")],['variant'=>'unknown'],['mode'=>'decrypt','key_b64'=>'']] as $extra){
            $this->postJson('/api/coursework/interop',$this->payload($extra))->assertUnprocessable();
        }
        Http::assertNothingSent();
    }
    public function test_engine_validation_error_is_forwarded(): void
    {
        Http::fake(['*'=>Http::response(['detail'=>'Panjang key salah.'],422)]);
        $this->postJson('/api/coursework/interop',$this->payload())->assertUnprocessable()->assertJsonPath('message','Panjang key salah.');
    }
}
