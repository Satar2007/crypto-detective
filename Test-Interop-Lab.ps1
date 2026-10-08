param([string]$ProjectDir = 'C:\laragon\www\crypto-detective', [string]$BaseUrl = 'http://crypto-detective.test')
$ErrorActionPreference = 'Stop'
$project = (Resolve-Path -LiteralPath $ProjectDir).Path
$baseUrl = $BaseUrl.TrimEnd('/')
Write-Host 'Tes lengkap: Python minimum 54; Laravel minimum 29. Regression smoke/simulasi menambah record uji.'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $project 'Test-CryptoZar-Compatibility.ps1') -ProjectDir $project -BaseUrl $baseUrl
if ($LASTEXITCODE -ne 0) { throw 'Regression baseline gagal. Tes interop dihentikan.' }
function Encode-Text([string]$Text) { [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Text)) }
function Decode-Text([string]$Text) { [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($Text)) }
function Process-Interop([string]$Mode,[string]$Variant,[string]$Text,[string]$Key='', [string]$Format='base64',[string]$KeyFormat='base64') {
    $body = @{mode=$Mode;variant=$Variant;text_b64=(Encode-Text $Text);key_b64=(Encode-Text $Key);cipher_format=$Format;key_format=$KeyFormat;record=$false} | ConvertTo-Json -Compress
    $r = Invoke-RestMethod "$baseUrl/api/coursework/interop" -Method Post -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body))
    if (-not $r.success -or $r.metrics.operation_count -ne 1 -or $r.metrics.runtime_ns -le 0) { throw 'Operasi/metrik interop tidak valid. Restart engine Python setelah install.' }
    return @{output=(Decode-Text $r.output_b64);key=(Decode-Text $r.key_b64);metrics=$r.metrics}
}
Write-Host "`n=== ENAM FILE NYATA RAFAEL: ENCRYPT + DECRYPT ===" -ForegroundColor Cyan
$fixtures = Get-Content -LiteralPath (Join-Path $project 'python-engine\tests\fixtures\rafael_vectors.json') -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($v in $fixtures.vectors) {
    $enc=Process-Interop 'encrypt' $v.variant $v.plaintext $v.key
    $dec=Process-Interop 'decrypt' $v.variant $v.ciphertext $v.key
    if ($enc.output -cne $v.ciphertext -or $dec.output -cne $v.plaintext) { throw "File Rafael mismatch: $($v.variant)" }
    Write-Host "PASS actual file: $($v.variant)"
}
Write-Host "`n=== REFERENSI NORMALISASI / HILL 3X3 / BYTE HEX / LCG ===" -ForegroundColor Cyan
$fixtures = Get-Content -LiteralPath (Join-Path $project 'python-engine\tests\fixtures\cryptozar_vectors.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$variants=@{caesar='caesar-az';vigenere='vigenere-az';playfair='playfair-xq';hill='hill-matrix';otp='otp-byte';stream='stream-lcg'}
foreach ($v in $fixtures.vectors) {
    $variant=$variants[$v.algorithm]
    $enc=Process-Interop 'encrypt' $variant $v.text $v.key 'hex' 'hex'
    $dec=Process-Interop 'decrypt' $variant $v.ciphertext $v.key 'hex' 'hex'
    if ($enc.output -cne $v.ciphertext -or $dec.output -cne $v.plaintext) { throw "Interop reference mismatch: $variant" }
}
Write-Host 'PASS 35 encrypt + 35 decrypt referensi.'
Write-Host "`n=== GENERATE KEY ENGINE + ROUND TRIP SEMUA VARIAN ===" -ForegroundColor Cyan
foreach ($variant in @('caesar','caesar-az','vigenere','vigenere-az','playfair','playfair-xq','hill','hill-matrix','otp-byte','otp-alpha','otp-text','stream-sha256','stream-rc4','stream-rc4-byte','stream-lcg')) {
    Write-Host "Testing generated key: $variant"
    $enc=Process-Interop 'encrypt' $variant 'HALO BOB'
    $dec=Process-Interop 'decrypt' $variant $enc.output $enc.key
    $expected=if ($variant -in @('playfair','playfair-xq','hill','hill-matrix')) {'HALOBOBX'} elseif ($variant -in @('caesar-az','vigenere-az','otp-alpha')) {'HALOBOB'} else {'HALO BOB'}
    if ($dec.output -cne $expected) { throw "Round-trip mismatch: $variant" }
    Write-Host "PASS generated key: $variant"
}
$nullCipher=Process-Interop 'encrypt' 'otp-text' 'A' 'A'
if ($nullCipher.output.Length -ne 1 -or [int][char]$nullCipher.output[0] -ne 0) { throw 'NULL ciphertext berubah.' }
$raw=([string][char]0xFEFF)+'Halo'+"`r`n"+'Bob'+([string][char]0)+' '
$enc=Process-Interop 'encrypt' 'otp-text' $raw ('Q' * $raw.Length)
$dec=Process-Interop 'decrypt' 'otp-text' $enc.output $enc.key
if ($dec.output -cne $raw) { throw 'BOM/CRLF/NULL/spasi berubah.' }
Write-Host "`nALL INTEROP GATES PASS. Browser manual checks remain required." -ForegroundColor Green
Write-Host 'Browser Ctrl+F5: enam metode; tidak ada profil teman; varian saat encrypt; Generate; kandidat saat decrypt; exact .txt download; metrik; History; Crack tetap merah; desktop 100% dan mobile.'
