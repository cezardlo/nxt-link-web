param(
  [string]$PromptPath = "",
  [string]$Models = "qwen2.5-coder:7b,codellama:13b",
  [switch]$Commit,
  [switch]$DryRun,
  [switch]$SkipPull,
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Test-CommandExists {
  param([Parameter(Mandatory = $true)][string]$Name)
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Resolve-PromptPath {
  param([string]$Value)

  if ($Value -and (Test-Path -LiteralPath $Value)) {
    return (Resolve-Path -LiteralPath $Value).Path
  }

  if ($env:NXT_LINK_MASTER_PROMPT_PATH -and (Test-Path -LiteralPath $env:NXT_LINK_MASTER_PROMPT_PATH)) {
    return (Resolve-Path -LiteralPath $env:NXT_LINK_MASTER_PROMPT_PATH).Path
  }

  $candidates = @(
    "MASTER_PROMPT.md",
    "NXT_LINK_MASTER_PROMPT.md",
    "NXTLINK_MASTER_PROMPT.md",
    "V:\downloads\NXT_LINK_MASTER_PROMPT.md",
    "V:\downloads\NXTLINK_MASTER_PROMPT.md"
  )

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }

  throw "Prompt file not found. Pass -PromptPath or set NXT_LINK_MASTER_PROMPT_PATH."
}

function Ensure-Ollama {
  if (Test-CommandExists -Name "ollama") {
    return
  }

  if ($SkipInstall) {
    throw "Ollama is missing and -SkipInstall was set."
  }

  Write-Host "Ollama not found. Trying install..." -ForegroundColor Yellow

  if (Test-CommandExists -Name "winget") {
    winget install --id Ollama.Ollama -e --silent --accept-package-agreements --accept-source-agreements
  } elseif (Test-CommandExists -Name "choco") {
    choco install ollama -y
  } else {
    throw "Neither winget nor choco is available to install Ollama automatically."
  }

  $possiblePath = "C:\Users\$env:USERNAME\AppData\Local\Programs\Ollama"
  if (Test-Path -LiteralPath $possiblePath) {
    $env:PATH = "$possiblePath;$env:PATH"
  }

  if (-not (Test-CommandExists -Name "ollama")) {
    throw "Ollama install attempted but command is still unavailable. Open a new terminal and retry."
  }
}

function Ensure-OllamaRunning {
  try {
    ollama list | Out-Null
    return
  } catch {
    Write-Host "Starting Ollama service..." -ForegroundColor Yellow
    Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden | Out-Null
    Start-Sleep -Seconds 3
    ollama list | Out-Null
  }
}

function Pull-Models {
  param([string]$Csv)
  if ($SkipPull) {
    Write-Host "Skipping model pull (-SkipPull)." -ForegroundColor Yellow
    return
  }
  $items = $Csv.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
  foreach ($model in $items) {
    Write-Host "Pulling model: $model"
    ollama pull $model
  }
}

if (-not (Test-CommandExists -Name "python")) {
  throw "Python is not installed or not in PATH."
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptRoot "..")
$autobuilderPath = Join-Path $repoRoot "autobuilder.py"

if (-not (Test-Path -LiteralPath $autobuilderPath)) {
  throw "autobuilder.py not found at $autobuilderPath"
}

$resolvedPrompt = Resolve-PromptPath -Value $PromptPath

Ensure-Ollama
Ensure-OllamaRunning
Pull-Models -Csv $Models

$args = @(
  $autobuilderPath,
  "--prompt", $resolvedPrompt,
  "--models", $Models
)

if ($Commit) {
  $args += "--commit"
}
if ($DryRun) {
  $args += "--dry-run"
}

Write-Host "Running autobuilder..." -ForegroundColor Cyan
Write-Host "Prompt: $resolvedPrompt"
Write-Host "Models: $Models"

Push-Location $repoRoot
try {
  & python @args
  if ($LASTEXITCODE -ne 0) {
    throw "autobuilder.py failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

Write-Host "Autobuilder completed." -ForegroundColor Green
