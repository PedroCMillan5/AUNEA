# [AUNEA-UAT-PG11-WINDOWS-298] START
# UAT con Ollama real en Windows. Exclusivamente datos sintéticos.
# Ejecución desde PowerShell: powershell -ExecutionPolicy Bypass -File .\3_SYSTEM\backend\scripts\pg11_block5_local_uat.ps1
# No lee registros reales, no guarda aprobaciones ni instala modelos.
param(
  [string]$Model = "aunea-qwen3-4b:latest",
  [int]$Context = 8192
)
$ErrorActionPreference = "Stop"
$backend = Split-Path -Parent $PSScriptRoot
Push-Location $backend
try {
  Write-Host "PG11 / BLOQUE 5 - PRUEBA LOCAL CON DATOS SINTETICOS" -ForegroundColor Cyan
  Write-Host "No se utilizan datos de clientes. No se aplican decisiones ni se modifica el TO-BE."
  $null = Get-Command ollama -ErrorAction Stop
  $null = Get-Command python -ErrorAction Stop
  $tags = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 5
  if (-not ($tags.models | Where-Object { $_.name -eq $Model })) {
    throw "El modelo '$Model' no esta instalado en Ollama. Comprueba con: ollama list"
  }
  $env:AUNEA_INTERNAL_AI_PROVIDER = "ollama"
  $env:AUNEA_INTERNAL_AI_ENABLED = "1"
  $env:AUNEA_INTERNAL_AI_DATA_AUTHORIZED = "1" # Datos sinteticos exclusivamente.
  $env:AUNEA_OLLAMA_MODEL = $Model
  $env:AUNEA_OLLAMA_NUM_CTX = "$Context"
  if (-not $env:AUNEA_OLLAMA_TIMEOUT_SECONDS) {
    $env:AUNEA_OLLAMA_TIMEOUT_SECONDS = "900"
  }
  $env:AUNEA_PG11_UAT_REPORT = "tests/pg11_live_ollama_report.json"
  Write-Host ("Motor: " + $env:AUNEA_OLLAMA_MODEL +
    " | Contexto: " + $env:AUNEA_OLLAMA_NUM_CTX)
  Write-Host "1/3 Pruebas frontend de la seccion 02 (jerarquia, navegacion, persistencia y errores)..."
  $frontend = Join-Path (Split-Path -Parent $backend) "frontend"
  $null = Get-Command node -ErrorAction Stop
  Push-Location $frontend
  try {
    node --test tests/pg11-global-overview.test.cjs tests/pg11-global-quality.test.cjs tests/internal-ai-pilot-review.test.cjs
    if ($LASTEXITCODE -ne 0) { throw "QA frontend PG11 FAIL" }
  }
  finally { Pop-Location }
  Write-Host "2/3 Pruebas deterministas backend PG11 y errores de protocolo..."
  python -m pytest -q tests/test_internal_ai_global.py
  if ($LASTEXITCODE -ne 0) { throw "QA determinista PG11 FAIL" }
  Write-Host "3/3 Inferencia Ollama real sobre facturas, intake y restriccion de aprobacion..."
  python tests/pg11_live_ollama_gate.py
  if ($LASTEXITCODE -ne 0) {
    throw "UAT de Ollama real FAIL. Revisa tests/pg11_live_ollama_report.json."
  }
  Write-Host "PASS con revision humana obligatoria." -ForegroundColor Green
  Write-Host ("Informe: " + (Join-Path $backend $env:AUNEA_PG11_UAT_REPORT))
}
finally { Pop-Location }
# [AUNEA-UAT-PG11-WINDOWS-298] END
