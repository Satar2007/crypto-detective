$ErrorActionPreference = 'Stop'

$baseUrl = 'http://crypto-detective.test/api'

$plaintext = @'
BESOK ALICE DAN BOB BERTEMU DI KAMPUS UNTUK MEMBAHAS PESAN RAHASIA KRIPTOGRAFI
'@.Trim()

$algorithms = @(
    'caesar',
    'vigenere',
    'playfair',
    'hill',
    'otp',
    'stream'
)

$results = @()
$details = @{}

Write-Host ''
Write-Host '============================================================'
Write-Host '       CRYPTO DETECTIVE - SIX ALGORITHM REAL TEST'
Write-Host '============================================================'
Write-Host ''
Write-Host "Plaintext:"
Write-Host $plaintext
Write-Host ''

foreach ($algorithm in $algorithms) {

    Write-Host '------------------------------------------------------------'
    Write-Host "TEST: $($algorithm.ToUpper())"
    Write-Host '------------------------------------------------------------'

    try {

        #
        # Sengaja tidak mengirim key.
        #
        # Kita ingin menguji kemampuan Crypto Engine
        # menghasilkan key yang sesuai untuk tiap algoritma.
        #
        $payload = @{
            plaintext = $plaintext
            algorithm = $algorithm
        } | ConvertTo-Json -Depth 20

        $response = Invoke-RestMethod `
            -Uri "$baseUrl/simulation/run" `
            -Method Post `
            -ContentType 'application/json' `
            -Headers @{
                Accept = 'application/json'
            } `
            -Body $payload

        if (-not $response.success) {
            throw 'API mengembalikan success=false.'
        }

        $simulationId = $response.simulation_id

        $alice = $response.data.alice
        $bob   = $response.data.bob
        $trudy = $response.data.trudy

        Write-Host "Simulation ID : $simulationId"
        Write-Host "Algorithm     : $($alice.algorithm)"
        Write-Host "Ciphertext    : $($alice.ciphertext)"
        Write-Host ''

        Write-Host 'BOB'
        Write-Host "  Has key     : $($bob.has_secret_key)"
        Write-Host "  Status      : $($bob.status)"
        Write-Host "  Plaintext   : $($bob.plaintext)"
        Write-Host ''

        Write-Host 'TRUDY'
        Write-Host "  Has key     : $($trudy.has_secret_key)"
        Write-Host "  Status      : $($trudy.status)"
        Write-Host "  Detection   : $($trudy.detected_algorithm)"
        Write-Host "  Confidence  : $($trudy.confidence)"
        Write-Host "  Recovered   : $($trudy.recovered_plaintext)"
        Write-Host "  Found key   : $($trudy.recovered_key)"
        Write-Host ''

        #
        # Ambil endpoint yang benar-benar hanya boleh
        # dilihat oleh Trudy.
        #
        $trudyView = Invoke-RestMethod `
            -Uri "$baseUrl/simulation/$simulationId/trudy" `
            -Method Get `
            -Headers @{
                Accept = 'application/json'
            }

        #
        # Cek field rahasia tidak bocor pada Trudy View.
        #
        $propertyNames = @(
            $trudyView.data.PSObject.Properties.Name
        )

        $forbiddenFields = @(
            'key_value',
            'key',
            'plaintext',
            'bob_result'
        )

        $leakedFields = @()

        foreach ($field in $forbiddenFields) {
            if ($propertyNames -contains $field) {
                $leakedFields += $field
            }
        }

        if ($leakedFields.Count -eq 0) {
            $secretIsolation = 'PASS'
        }
        else {
            $secretIsolation =
                'FAIL: ' + ($leakedFields -join ', ')
        }

        if ($bob.status -eq 'success') {
            $bobCheck = 'PASS'
        }
        else {
            $bobCheck = 'FAIL'
        }

        $results += [PSCustomObject]@{
            Algorithm       = $alice.algorithm
            SimulationID    = $simulationId
            Bob             = $bob.status
            Trudy           = $trudy.status
            Detection       = $trudy.detected_algorithm
            Confidence      = $trudy.confidence
            BobCheck        = $bobCheck
            SecretIsolation = $secretIsolation
        }

        $details[$algorithm] = $response

        Write-Host "Secret isolation : $secretIsolation"
        Write-Host ''

    }
    catch {

        Write-Host ''
        Write-Host "ERROR: $($_.Exception.Message)"
        Write-Host ''

        $results += [PSCustomObject]@{
            Algorithm       = $algorithm
            SimulationID    = '-'
            Bob             = 'ERROR'
            Trudy           = 'ERROR'
            Detection       = '-'
            Confidence      = '-'
            BobCheck        = 'FAIL'
            SecretIsolation = 'NOT TESTED'
        }
    }
}

Write-Host ''
Write-Host '============================================================'
Write-Host '                    FINAL SUMMARY'
Write-Host '============================================================'
Write-Host ''

$results |
    Format-Table `
        Algorithm,
        SimulationID,
        Bob,
        Trudy,
        Detection,
        Confidence,
        BobCheck,
        SecretIsolation `
        -AutoSize

Write-Host ''
Write-Host '============================================================'
Write-Host 'STATUS LEGEND'
Write-Host '============================================================'
Write-Host ''
Write-Host 'Bob success      = penerima sah berhasil decrypt.'
Write-Host 'Trudy compromised= attacker berhasil mendapatkan plaintext.'
Write-Host 'candidate_found  = attacker mendapatkan kandidat, belum pasti benar.'
Write-Host 'protected        = plaintext tidak berhasil dipulihkan.'
Write-Host ''

#
# Simpan hasil lengkap sebagai JSON untuk dokumentasi/laporan.
#

$outputDirectory = Join-Path $PSScriptRoot 'storage\app'

if (-not (Test-Path $outputDirectory)) {
    New-Item `
        -ItemType Directory `
        -Force `
        -Path $outputDirectory |
        Out-Null
}

$outputFile = Join-Path `
    $outputDirectory `
    'six-algorithm-simulation-results.json'

$report = @{
    generated_at = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    plaintext    = $plaintext
    summary      = $results
    details      = $details
}

$json = $report |
    ConvertTo-Json -Depth 50

[System.IO.File]::WriteAllText(
    $outputFile,
    $json,
    [System.Text.Encoding]::UTF8
)

Write-Host "Full JSON report:"
Write-Host $outputFile
Write-Host ''