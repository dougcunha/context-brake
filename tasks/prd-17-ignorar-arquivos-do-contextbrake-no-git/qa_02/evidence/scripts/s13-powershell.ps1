# S13 (qa_02): NFR-03 and TC-11 under PowerShell 7 with a CRLF .gitignore, plus a junction layout.
$ErrorActionPreference = 'Stop'
$Cli = 'D:/MyProjects/ContextBrake/dist/src/cli/main.js'
$Runs = 'C:/Users/Admin/AppData/Local/Temp/claude/D--MyProjects-ContextBrake/c30cb916-4ed9-4032-b3fa-d81dfd756e24/scratchpad/qa02-runs'
$Out = 'D:/MyProjects/ContextBrake/tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/qa_02/evidence'
$FakeHome = Join-Path $Runs 'fake-home-ps'
New-Item -ItemType Directory -Force $FakeHome | Out-Null
$env:NO_COLOR = '1'; $env:HOME = $FakeHome; $env:USERPROFILE = $FakeHome; $env:GIT_CONFIG_GLOBAL = (Join-Path $FakeHome '.gitconfig')
Remove-Item Env:FORCE_COLOR -ErrorAction SilentlyContinue
$log = New-Object System.Collections.Generic.List[string]
foreach ($layout in @('plain', 'junction')) {
  $dir = Join-Path $Runs ("ps-$layout-" + [guid]::NewGuid().ToString('N').Substring(0, 8))
  New-Item -ItemType Directory $dir | Out-Null
  Push-Location $dir
  git init -q -b main
  $original = [byte[]][System.Text.Encoding]::UTF8.GetBytes("node_modules/`r`n")
  [System.IO.File]::WriteAllBytes((Join-Path $dir '.gitignore'), $original)
  if ($layout -eq 'plain') {
    New-Item -ItemType Directory '.claude' | Out-Null
    [System.IO.File]::WriteAllText((Join-Path $dir '.claude/settings.json'), "{`n  `"hooks`": {}`n}`n")
  } else {
    New-Item -ItemType Directory '.agents' | Out-Null
    [System.IO.File]::WriteAllText((Join-Path $dir '.agents/settings.json'), "{`n  `"hooks`": {}`n}`n")
    New-Item -ItemType Junction -Path '.claude' -Target (Join-Path $dir '.agents') | Out-Null
  }
  $log.Add("=== layout=$layout fixture=$dir (PowerShell $($PSVersionTable.PSVersion), .gitignore = 'node_modules/\r\n')")
  $dry = node $Cli init --dry-run --json
  $log.Add("dry-run --json exit=$LASTEXITCODE")
  if ($layout -eq 'plain') { $dry | Set-Content -Encoding utf8 (Join-Path $Out 'S13-dry-run.json') }
  $init = node $Cli init --yes
  $log.Add("init --yes exit=$LASTEXITCODE"); $log.Add('--- init stdout ---'); $log.AddRange([string[]]$init)
  $log.Add('--- git status --porcelain -uall ---'); $log.AddRange([string[]](git status --porcelain -uall))
  $log.Add('--- .gitignore ---'); $log.Add([System.IO.File]::ReadAllText((Join-Path $dir '.gitignore')))
  $crlfBlock = [System.IO.File]::ReadAllText((Join-Path $dir '.gitignore')).Contains("# <<< context-brake <<<`r`n")
  $log.Add("block written with CRLF: $crlfBlock")
  $second = node $Cli init --yes --dry-run --json | ConvertFrom-Json
  $log.Add("second run planned changes: $($second.plan.changes.Count)")
  $rm = node $Cli remove --yes
  $log.Add("--- remove --yes exit=$LASTEXITCODE ---")
  $after = [System.IO.File]::ReadAllBytes((Join-Path $dir '.gitignore'))
  $equal = [System.Linq.Enumerable]::SequenceEqual($after, $original)
  $log.Add("after remove byte-equal to original: $equal")
  Pop-Location
}
$log | Set-Content -Encoding utf8 (Join-Path $Out 'S13-powershell-run.txt')
