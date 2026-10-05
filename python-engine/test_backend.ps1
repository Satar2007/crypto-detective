$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$cnnPython = "$env:USERPROFILE\CNN-Praktikum\.venv\Scripts\python.exe"
if (Test-Path $cnnPython) {
    $python = $cnnPython
} else {
    $python = 'py'
}

Write-Host "=== CRYPTO DETECTIVE BACKEND TEST ===" -ForegroundColor Cyan
& $python run_tests.py
if ($LASTEXITCODE -ne 0) { throw 'Backend tests failed.' }

Write-Host "`n=== DEMO ===" -ForegroundColor Cyan
& $python demo.py
if ($LASTEXITCODE -ne 0) { throw 'Backend demo failed.' }
