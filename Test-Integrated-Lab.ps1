param([string]$ProjectDir = 'C:\laragon\www\crypto-detective', [string]$BaseUrl = 'http://crypto-detective.test')
$ErrorActionPreference = 'Stop'
$project = (Resolve-Path $ProjectDir).Path
$baseUrl = $BaseUrl.TrimEnd('/')
$python = Join-Path $project 'python-engine\.venv\Scripts\python.exe'
if (-not (Test-Path $python)) { throw "Python venv tidak ditemukan: $python" }
$phpCommand = Get-Command php -ErrorAction SilentlyContinue
if ($phpCommand) { $phpPath = $phpCommand.Source } else {
    $phpPath = Get-ChildItem -LiteralPath 'C:\laragon\bin\php' -Filter php.exe -Recurse -File | Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $phpPath) { throw 'PHP Laragon tidak ditemukan.' }
$env:PATH = (Split-Path $phpPath) + ';' + $env:PATH
Write-Host 'Regression smoke/simulasi menambah record percobaan ke database aplikasi.'
$failures = [System.Collections.Generic.List[string]]::new()
function Run-Gate([string]$Name, [scriptblock]$Action) {
    Write-Host "`n=== $Name ===" -ForegroundColor Cyan
    try { & $Action; Write-Host "PASS: $Name" -ForegroundColor Green }
    catch { $failures.Add("$Name : $($_.Exception.Message)"); Write-Host "FAIL: $Name : $($_.Exception.Message)" -ForegroundColor Red }
}
Push-Location $project
try {
    Run-Gate 'Python regression (expected 36 or more)' {
        Push-Location (Join-Path $project 'python-engine')
        try { & $python run_tests.py; if ($LASTEXITCODE -ne 0) { throw 'Python tests failed.' } }
        finally { Pop-Location }
    }
    Run-Gate 'Laravel regression (expected 15 / 91 assertions or more)' {
        php artisan test
        if ($LASTEXITCODE -ne 0) { throw 'Laravel tests failed.' }
    }
    Run-Gate 'Health: web application and Python engine' {
        $health = Invoke-RestMethod "$baseUrl/api/crypto/health"
        if (-not $health.success -or $health.engine.algorithms.Count -ne 6) { throw 'Engine health/algorithm count invalid.' }
    }
    Run-Gate 'crypto:smoke (writes one test record)' {
        php artisan crypto:smoke
        if ($LASTEXITCODE -ne 0) { throw 'Smoke failed.' }
    }
    Run-Gate 'Six-algorithm simulation + secret isolation (writes simulation records)' {
        powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $project 'Test-All-Crypto-Simulations.ps1')
        if ($LASTEXITCODE -ne 0) { throw 'Simulation script failed.' }
        $report = Get-Content (Join-Path $project 'storage\app\six-algorithm-simulation-results.json') -Raw | ConvertFrom-Json
        if ($report.summary.Count -ne 6) { throw 'Simulation report must contain six algorithms.' }
        foreach ($row in $report.summary) {
            if ($row.BobCheck -ne 'PASS' -or $row.SecretIsolation -ne 'PASS') { throw "Simulation failed for $($row.Algorithm)." }
        }
    }
    Add-Type -AssemblyName System.Net.Http
    $client = [System.Net.Http.HttpClient]::new()
    $client.Timeout = [TimeSpan]::FromSeconds(180)
    $client.DefaultRequestHeaders.Accept.Add([System.Net.Http.Headers.MediaTypeWithQualityHeaderValue]::new('application/json'))
    function Process-File([string]$Mode, [string]$Algorithm, [string]$Text, [string]$Key = '') {
        $form = [System.Net.Http.MultipartFormDataContent]::new()
        try {
            $form.Add([System.Net.Http.StringContent]::new($Mode), 'mode')
            $form.Add([System.Net.Http.StringContent]::new($Algorithm), 'algorithm')
            if ($Key -ne '') { $form.Add([System.Net.Http.StringContent]::new($Key), 'key') }
            $content = [System.Net.Http.ByteArrayContent]::new([System.Text.Encoding]::UTF8.GetBytes($Text))
            $content.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new('text/plain')
            $form.Add($content, 'file', 'regression.txt')
            $response = $client.PostAsync("$baseUrl/api/coursework/file-process", $form).GetAwaiter().GetResult()
            try { $body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult(); return @{status=[int]$response.StatusCode; data=($body | ConvertFrom-Json)} }
            finally { $response.Dispose() }
        } finally { $form.Dispose() }
    }
    Run-Gate 'File .txt encrypt/decrypt six algorithms + custom Hill/manual key' {
        $text = 'BELAJAR KRIPTOGRAFI'
        foreach ($algorithm in @('caesar','vigenere','playfair','hill','otp','stream')) {
            $manual = switch ($algorithm) { 'caesar' {'3'} 'vigenere' {'KUNCI'} 'playfair' {'SATAR'} 'hill' {'7 8 19 3'} 'stream' {'coursework-manual-key'} default {''} }
            $enc = Process-File 'encrypt' $algorithm $text $manual
            if ($enc.status -ne 200 -or -not $enc.data.success) { throw "Encrypt file failed: $algorithm" }
            $key = if ($enc.data.key -is [array]) { $enc.data.key | ConvertTo-Json -Compress } else { [string]$enc.data.key }
            $dec = Process-File 'decrypt' $algorithm $enc.data.output_text $key
            if ($dec.status -ne 200 -or -not $dec.data.success) { throw "Decrypt file failed: $algorithm" }
            $expected = if ($enc.data.normalized_plaintext) { [string]$enc.data.normalized_plaintext } else { $text }
            if ($dec.data.output_text -cne $expected) { throw "Round-trip mismatch: $algorithm" }
            if ($enc.data.output_bytes -ne [System.Text.Encoding]::UTF8.GetByteCount([string]$enc.data.output_text)) { throw "Output byte count invalid: $algorithm" }
            if (-not ([string]$enc.data.download_name).EndsWith('.txt')) { throw "Download name invalid: $algorithm" }
            if ($algorithm -eq 'otp') {
                $manualOtp = Process-File 'encrypt' 'otp' $text $key
                if ($manualOtp.status -ne 200) { throw 'Manual OTP key failed.' }
            }
            Write-Host "PASS File round-trip: $algorithm"
        }
    }
    Run-Gate 'File validation: invalid Hill, missing decrypt key, empty file' {
        $invalid = Process-File 'encrypt' 'hill' 'BELAJAR' '1 2 3 4'
        if ($invalid.status -ne 422) { throw 'Invalid Hill matrix must return 422.' }
        $missing = Process-File 'decrypt' 'caesar' 'KHOOR'
        if ($missing.status -ne 422) { throw 'Missing decrypt key must return 422.' }
        $empty = Process-File 'encrypt' 'caesar' '' '3'
        if ($empty.status -ne 422) { throw 'Empty file must return 422.' }
    }
    Run-Gate 'Benchmark: measured runtime and all metrics for six algorithms' {
        $payload = @{plaintext='BELAJAR KRIPTOGRAFI DI UNIVERSITAS SANATA DHARMA'; iterations=2} | ConvertTo-Json
        $bench = Invoke-RestMethod "$baseUrl/api/coursework/benchmark" -Method Post -ContentType 'application/json' -Body $payload
        if (-not $bench.success -or $bench.results.Count -ne 6 -or $bench.measurement -ne 'python-core') { throw 'Benchmark response invalid.' }
        foreach ($row in $bench.results) {
            foreach ($field in @('avg_encrypt_ms','avg_decrypt_ms','input_bytes','output_bytes','encrypt_peak_memory_kib','decrypt_peak_memory_kib','encrypt_throughput_mb_s','decrypt_throughput_mb_s')) {
                if ($null -eq $row.$field -or [double]$row.$field -lt 0) { throw "Missing/invalid benchmark metric: $field" }
            }
            if (-not $row.complexity_encrypt -or -not $row.complexity_decrypt -or -not $row.explanation) { throw 'Theory/explanation missing.' }
        }
    }
    Run-Gate 'Metrik operasi aktual: encrypt/decrypt enam algoritma dan OTP alfabet' {
        foreach ($algorithm in @('caesar','vigenere','playfair','hill','otp','stream','otp-alpha')) {
            $text = 'BELAJAR KRIPTOGRAFI'
            $key = if ($algorithm -eq 'hill') { '3 3 2 5' } else { '' }
            $enc = Process-File 'encrypt' $algorithm $text $key
            if ($enc.status -ne 200 -or -not $enc.data.success) { throw "Encrypt gagal: $algorithm" }
            $resolved = if ($enc.data.key -is [array]) { $enc.data.key | ConvertTo-Json -Compress } else { [string]$enc.data.key }
            $dec = Process-File 'decrypt' $algorithm $enc.data.output_text $resolved
            if ($dec.status -ne 200 -or -not $dec.data.success) { throw "Decrypt gagal: $algorithm" }
            foreach ($row in @($enc.data,$dec.data)) {
                $m = $row.metrics
                if (-not $m -or $m.operation_count -ne 1 -or $m.runtime_ns -le 0 -or $m.runtime_ms -le 0) { throw 'Metrik tidak tersedia; restart Python engine setelah install.' }
                foreach ($field in @('input_bytes','output_bytes','peak_memory_bytes','peak_memory_kib','throughput_mb_s')) {
                    if ($null -eq $m.$field -or [double]$m.$field -lt 0) { throw "Metrik tidak valid: $field" }
                }
                if ($m.output_bytes -ne [Text.Encoding]::UTF8.GetByteCount([string]$row.output_text)) { throw 'Jumlah byte output tidak sesuai.' }
                if (-not $m.complexity -or -not $m.memory_complexity -or -not $m.explanation -or -not $m.measurement_note) { throw 'Teori/catatan pengukuran tidak lengkap.' }
            }
            Write-Host "PASS measured single operation: $algorithm"
        }
        $known = Process-File 'encrypt' 'otp-alpha' 'HALO' 'XMCK'
        if ($known.status -ne 200 -or $known.data.output_text -cne 'EMNY') { throw 'Vektor OTP alfabet tidak cocok.' }
        $auto = Process-File 'encrypt' 'auto' 'BELAJAR KRIPTOGRAFI'
        if ($auto.status -ne 200 -or $auto.data.algorithm -notin @('caesar','vigenere','playfair','hill','otp','stream')) { throw 'Auto encrypt tidak mengembalikan metode konkret.' }
    }
    $client.Dispose()
} finally { Pop-Location }
if ($failures.Count) { Write-Host "`nFAILED GATES:" -ForegroundColor Red; $failures | ForEach-Object { Write-Host $_ }; exit 1 }
Write-Host "`nAUTOMATED GATES PASS. Browser manual checks are still required." -ForegroundColor Green
Write-Host 'Cek desktop dan mobile: tiga menu; Crack -> History -> Lab; Hill spasi/custom/invalid; upload/download pesan dan key .txt; metrik setiap operasi; kandidat Auto; Crack loading/filter/pagination; Chrome 100%.'
