$ErrorActionPreference = 'Stop'
$Repo = 'D:\MyProjects\ContextBrake'
$Evidence = Join-Path $Repo 'tasks\prd-03-plano-checkpoint-e-boot\qa_01\evidence'
$Probe = Join-Path $Evidence 'probe.mjs'
$WriteConfig = Join-Path $Evidence 'write-config.mjs'
$InProcessProbe = Join-Path $Evidence 'in-process-probe.mjs'
$AssetDir = Join-Path $Repo 'dist\assets\runtime'
$TmpRoot = Join-Path $env:TEMP 'cb-qa-01-boot'
if (Test-Path $TmpRoot) { Remove-Item -Recurse -Force $TmpRoot }
New-Item -ItemType Directory -Path $TmpRoot | Out-Null
$log = New-Object System.Collections.Generic.List[string]
$script:failures = 0
$script:log = $log
$log.Add("QA boot delivery scenarios - $(Get-Date -Format o)")
$log.Add("node $(node --version) - $([System.Environment]::OSVersion.VersionString) - repo $Repo - tmp $TmpRoot")

$HookTargets = @{
  'claude-code' = '.claude/hooks/context-brake.mjs'
  'codex-cli' = '.codex/hooks/context-brake.mjs'
  'cursor' = '.cursor/hooks/context-brake.mjs'
  'github-copilot-cli' = '.github/hooks/context-brake.mjs'
  'antigravity-cli' = '.agents/hooks/context-brake.mjs'
  'pi' = '.pi/extensions/context-brake.js'
  'oh-my-pi' = '.omp/extensions/context-brake.js'
}
$HookAssets = @{
  'claude-code' = 'claude-code-hook.mjs'
  'codex-cli' = 'codex-cli-hook.mjs'
  'cursor' = 'cursor-hook.mjs'
  'github-copilot-cli' = 'github-copilot-cli-hook.mjs'
  'antigravity-cli' = 'antigravity-cli-hook.mjs'
  'pi' = 'pi-extension.js'
  'oh-my-pi' = 'omp-extension.js'
}

function Contains([string]$text, [string]$needle) {
  if ($null -eq $text) { return $false }
  return $text.IndexOf($needle, [System.StringComparison]::Ordinal) -ge 0
}
function Assert([string]$id, [string]$name, [bool]$ok, [string]$detail) {
  $status = 'FAILED'
  if ($ok) { $status = 'PASSED' } else { $script:failures += 1 }
  $script:log.Add("[$id] $status - $name :: $detail")
}
function Install-Hook([string]$root, [string]$harness) {
  $target = Join-Path $root ($HookTargets[$harness] -replace '/', '\')
  New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force | Out-Null
  Copy-Item (Join-Path $AssetDir $HookAssets[$harness]) $target -Force
}
function New-BootFixture([string]$name, [string]$planJson, [string]$ckptJson, [string[]]$harnesses) {
  $root = Join-Path $TmpRoot $name
  New-Item -ItemType Directory -Path $root -Force | Out-Null
  Set-Content -Path (Join-Path $root 'task_plan.json') -Value $planJson -Encoding utf8 -NoNewline
  Set-Content -Path (Join-Path $root 'state_checkpoint.json') -Value $ckptJson -Encoding utf8 -NoNewline
  node $WriteConfig $root $Repo | Out-Null
  foreach ($h in $harnesses) { Install-Hook $root $h }
  return $root
}
function Invoke-Hook([string]$root, [string]$harness, [string]$event, [string]$payload, [string]$clearPath = 'none') {
  $payloadFile = Join-Path $TmpRoot 'payload.tmp'
  Set-Content -Path $payloadFile -Value $payload -Encoding utf8 -NoNewline
  $hook = Join-Path $root ($HookTargets[$harness] -replace '/', '\')
  $cwd = Split-Path $hook -Parent
  $raw = node $Probe $cwd $payloadFile $clearPath $hook $event
  $result = $raw | ConvertFrom-Json
  $script:log.Add("CMD: node $hook $event (cwd $cwd) stdin=$payload clear=$clearPath")
  $script:log.Add("EXIT: $($result.code) STDOUT: $($result.stdout) STDERR: $($result.stderr)")
  return $result
}
function Invoke-Extension([string]$root, [string]$harness, [string]$mode) {
  $ext = Join-Path $root (($HookTargets[$harness] -replace '/', '\'))
  $raw = node $Probe $root none none $InProcessProbe $ext $root $mode
  $result = $raw | ConvertFrom-Json
  $script:log.Add("CMD: in-process probe $harness $mode (root $root)")
  $script:log.Add("EXIT: $($result.code) STDOUT: $($result.stdout) STDERR: $($result.stderr)")
  return $result
}
function Assert-BootContent([string]$id, [string]$name, [string]$text) {
  $ok = (Contains $text '[ContextBrake boot v1]') -and (Contains $text 'Alpha Task') -and (Contains $text '3: Implement core (IN_PROGRESS)') -and (Contains $text '4: Add tests (PENDING)') -and (Contains $text 'Must not exceed token budget') -and (Contains $text 'No UI or server components') -and (Contains $text 'run `npm run check`') -and (Contains $text 'Before any edit')
  Assert $id $name $ok "bootLength=$($text.Length)"
}
function Message-Of([string]$stdout) {
  try { return ($stdout | ConvertFrom-Json).first.message } catch { return $stdout }
}
function Context-Of([string]$stdout) {
  try { return ($stdout | ConvertFrom-Json).additionalContext } catch { return $stdout }
}

$ValidPlan = @'
{"schemaVersion":1,"taskId":"task-alpha","title":"Alpha Task","currentStepId":3,"steps":[{"id":1,"title":"Setup","description":"d","status":"COMPLETED","validationCommand":"npm test","artifactsProduced":[]},{"id":2,"title":"Scaffold","description":"d","status":"COMPLETED","validationCommand":"npm test","artifactsProduced":[]},{"id":3,"title":"Implement core","description":"d","status":"IN_PROGRESS","validationCommand":"npm run check","artifactsProduced":[]},{"id":4,"title":"Add tests","description":"d","status":"PENDING","validationCommand":"npm test","artifactsProduced":[]}]}
'@
$ValidCkpt = @'
{"schemaVersion":1,"taskId":"task-alpha","activeStepId":3,"gitState":{"branch":"main","lastCommitHash":null,"cleanWorkingTree":null},"workingMemory":{"discoveredConstraints":["Must not exceed token budget","No UI or server components"],"decisionsMade":["Use hexagonal ports"],"blockedItems":[],"breakingChanges":[]},"modifiedFiles":["src/core/a.ts"],"timestamp":"2026-09-23T12:00:00.000Z"}
'@
$CompletedPlan = @'
{"schemaVersion":1,"taskId":"task-alpha","title":"Alpha Task","currentStepId":null,"steps":[{"id":1,"title":"Setup","description":"d","status":"COMPLETED","validationCommand":"npm test","artifactsProduced":[]},{"id":2,"title":"Scaffold","description":"d","status":"COMPLETED","validationCommand":"npm test","artifactsProduced":[]}]}
'@
$MalformedCkpt = '{"schemaVersion": 1, SECRET CHECKPOINT INVALID JSON'
$OldVersionCkpt = @'
{"schemaVersion":2,"taskId":"task-alpha","activeStepId":3,"gitState":{"branch":"main","lastCommitHash":null,"cleanWorkingTree":null},"workingMemory":{"discoveredConstraints":[],"decisionsMade":[],"blockedItems":[],"breakingChanges":[]},"modifiedFiles":[],"timestamp":"2026-09-23T12:00:00.000Z"}
'@
$ClaudeNew = '{"session_id":"qa-1","cwd":"C:/repo","hook_event_name":"SessionStart","source":"startup"}'
$ClaudeCompact = '{"session_id":"qa-1","cwd":"C:/repo","hook_event_name":"SessionStart","source":"compact"}'
$CodexNew = '{"session_id":"qa-2","hook_event_name":"SessionStart","source":"startup"}'
$CodexCompact = '{"session_id":"qa-2","hook_event_name":"SessionStart","source":"compact"}'
$CursorNew = '{"conversation_id":"qa-3","hook_event_name":"sessionStart"}'
$CursorCompact = '{"conversation_id":"qa-3","hook_event_name":"preCompact","trigger":"auto","context_usage_percent":72,"context_tokens":92000,"context_window_size":128000,"is_first_compaction":false}'
$CopilotNew = '{"sessionId":"qa-4","timestamp":1757937600000,"cwd":"C:/repo","source":"new","initialPrompt":"status"}'
$CopilotCompact = '{"sessionId":"qa-4","timestamp":1757937600000,"cwd":"C:/repo","hookName":"preCompact"}'
$Antigravity = '{"conversationId":"qa-5"}'

$main = New-BootFixture 'fx-main' $ValidPlan $ValidCkpt @('claude-code', 'codex-cli', 'cursor', 'github-copilot-cli', 'antigravity-cli', 'pi', 'oh-my-pi')
Assert-BootContent 'CA-05' 'claude-code SessionStart delivers the boot' (Invoke-Hook $main 'claude-code' 'SessionStart' $ClaudeNew).stdout
Assert-BootContent 'CA-05' 'codex-cli SessionStart delivers the boot' (Invoke-Hook $main 'codex-cli' 'SessionStart' $CodexNew).stdout
Assert-BootContent 'CA-05' 'cursor sessionStart delivers the boot' (Invoke-Hook $main 'cursor' 'sessionStart' $CursorNew).stdout
Assert-BootContent 'CA-05' 'github-copilot-cli sessionStart delivers the boot' (Invoke-Hook $main 'github-copilot-cli' 'sessionStart' $CopilotNew).stdout
$piRes = Invoke-Extension $main 'pi' 'new'
Assert-BootContent 'CA-05' 'pi delivers the boot once via before_agent_start' (Message-Of $piRes.stdout)
Assert 'CA-05' 'pi delivers the boot only once' ($null -eq ($piRes.stdout | ConvertFrom-Json).second) "second=$(($piRes.stdout | ConvertFrom-Json).second)"
$ompRes = Invoke-Extension $main 'oh-my-pi' 'new'
Assert-BootContent 'CA-05' 'oh-my-pi delivers the boot once via before_agent_start' (Message-Of $ompRes.stdout)
Assert-BootContent 'CA-05' 'claude-code compaction reinjects the boot' (Invoke-Hook $main 'claude-code' 'SessionStart' $ClaudeCompact).stdout
Assert-BootContent 'CA-05' 'codex-cli compaction reinjects the boot' (Invoke-Hook $main 'codex-cli' 'SessionStart' $CodexCompact).stdout
$piCompact = Invoke-Extension $main 'pi' 'compact'
Assert-BootContent 'CA-05' 'pi reinjects the boot after compaction' (Message-Of $piCompact.stdout)
$ompCompact = Invoke-Extension $main 'oh-my-pi' 'autocompact'
Assert-BootContent 'CA-05' 'oh-my-pi reinjects the boot after auto compaction' (Message-Of $ompCompact.stdout)
$cursorPre = Invoke-Hook $main 'cursor' 'preCompact' $CursorCompact
Assert 'CA-05' 'cursor preCompact stays silent (no documented channel)' ([string]::IsNullOrWhiteSpace($cursorPre.stdout)) "stdout='$($cursorPre.stdout)'"
$copilotPre = Invoke-Hook $main 'github-copilot-cli' 'preCompact' $CopilotCompact
Assert 'CA-05' 'github-copilot-cli preCompact stays silent (no documented channel)' ([string]::IsNullOrWhiteSpace($copilotPre.stdout)) "stdout='$($copilotPre.stdout)'"
$ag = Invoke-Hook $main 'antigravity-cli' 'sessionStart' $Antigravity
Assert 'DEC-05' 'antigravity-cli receives no boot (protocol fallback)' ([string]::IsNullOrWhiteSpace($ag.stdout)) "stdout='$($ag.stdout)'"

$bad = New-BootFixture 'fx-bad' $ValidPlan $MalformedCkpt @('claude-code')
$badRes = Invoke-Hook $bad 'claude-code' 'SessionStart' $ClaudeNew
Assert 'CA-04' 'invalid checkpoint yields only the repair instruction' ((Contains $badRes.stdout 'Repair') -and (Contains $badRes.stdout 'state_checkpoint.json') -and (Contains $badRes.stdout 'Validate the file before continuing.') -and (-not (Contains $badRes.stdout 'Must not exceed token budget')) -and (-not (Contains $badRes.stdout 'SECRET CHECKPOINT'))) "stdout=$($badRes.stdout)"

$done = New-BootFixture 'fx-done' $CompletedPlan $ValidCkpt @('claude-code', 'github-copilot-cli')
$doneClaude = Invoke-Hook $done 'claude-code' 'SessionStart' $ClaudeNew
$doneCopilot = Invoke-Hook $done 'github-copilot-cli' 'sessionStart' $CopilotNew
Assert 'CA-06' 'all-complete plan yields no boot' (([string]::IsNullOrWhiteSpace($doneClaude.stdout)) -and ([string]::IsNullOrWhiteSpace($doneCopilot.stdout))) "claude='$($doneClaude.stdout)' copilot='$($doneCopilot.stdout)'"

$padding = 'x' * 70
$budgetCkptObj = @{
  schemaVersion = 1; taskId = 'task-alpha'; activeStepId = 3
  gitState = @{ branch = 'main'; lastCommitHash = $null; cleanWorkingTree = $null }
  workingMemory = @{
    discoveredConstraints = @('QA-CONSTRAINT-ONE ' + $padding, 'QA-CONSTRAINT-TWO ' + $padding, 'QA-CONSTRAINT-THREE ' + $padding)
    decisionsMade = @(1..40 | ForEach-Object { "QA-DECISION-$_ $padding" })
    blockedItems = @(); breakingChanges = @()
  }
  modifiedFiles = @(1..60 | ForEach-Object { "src/generated/module-$_ $padding" })
  timestamp = '2026-09-23T12:00:00.000Z'
}
$budgetCkpt = $budgetCkptObj | ConvertTo-Json -Depth 6
$budget = New-BootFixture 'fx-budget' $ValidPlan $budgetCkpt @('github-copilot-cli')
$budgetRes = Invoke-Hook $budget 'github-copilot-cli' 'sessionStart' $CopilotNew
$budgetCtx = Context-Of $budgetRes.stdout
Assert 'CA-07' 'over-budget boot keeps every constraint and points to the checkpoint' ((Contains $budgetCtx 'QA-CONSTRAINT-ONE') -and (Contains $budgetCtx 'QA-CONSTRAINT-TWO') -and (Contains $budgetCtx 'QA-CONSTRAINT-THREE') -and (Contains $budgetCtx 'Full checkpoint: state_checkpoint.json')) "length=$($budgetCtx.Length)"
Assert 'CA-07' 'over-budget boot stays within the configured budget' ($budgetCtx.Length -le 1000) "length=$($budgetCtx.Length)"

$twentyPlanObj = @{
  schemaVersion = 1; taskId = 'task-twenty'; title = 'Twenty Steps Task'; currentStepId = 10
  steps = @(1..20 | ForEach-Object {
    $status = 'PENDING'
    if ($_ -lt 10) { $status = 'COMPLETED' }
    if ($_ -eq 10) { $status = 'IN_PROGRESS' }
    @{ id = $_; title = "Step $_"; description = 'd'; status = $status; validationCommand = 'npm test'; artifactsProduced = @() }
  })
}
$twentyCkptObj = @{
  schemaVersion = 1; taskId = 'task-twenty'; activeStepId = 10
  gitState = @{ branch = 'main'; lastCommitHash = $null; cleanWorkingTree = $null }
  workingMemory = @{
    discoveredConstraints = @(1..20 | ForEach-Object { "qa-constraint-$_ padding" })
    decisionsMade = @(1..20 | ForEach-Object { "qa-decision-$_ padding" })
    blockedItems = @(); breakingChanges = @()
  }
  modifiedFiles = @(); timestamp = '2026-09-23T12:00:00.000Z'
}
$twentyPlan = $twentyPlanObj | ConvertTo-Json -Depth 6
$twentyCkpt = $twentyCkptObj | ConvertTo-Json -Depth 6
$twenty = New-BootFixture 'fx-twenty' $twentyPlan $twentyCkpt @('github-copilot-cli')
$twentyRes = Invoke-Hook $twenty 'github-copilot-cli' 'sessionStart' $CopilotNew
$twentyCtx = Context-Of $twentyRes.stdout
Assert 'CA-08' '20 steps / 20 constraints / 20 decisions boot within 1000 (byte upper bound)' (($twentyCtx.Length -le 1000) -and (Contains $twentyCtx 'Twenty Steps Task')) "length=$($twentyCtx.Length)"

$gitRoot = Join-Path $TmpRoot 'fx-git'
New-Item -ItemType Directory -Path $gitRoot -Force | Out-Null
git -C $gitRoot init -b main | Out-Null
git -C $gitRoot config user.email 'qa@example.com'
git -C $gitRoot config user.name 'QA'
Set-Content -Path (Join-Path $gitRoot 'notes.txt') -Value 'hello' -Encoding utf8
git -C $gitRoot add notes.txt | Out-Null
git -C $gitRoot commit -m base | Out-Null
$baseHash = (git -C $gitRoot rev-parse HEAD).Trim()
git -C $gitRoot checkout -b side | Out-Null
Set-Content -Path (Join-Path $gitRoot 'side.txt') -Value 'x' -Encoding utf8
git -C $gitRoot add side.txt | Out-Null
git -C $gitRoot commit -m side | Out-Null
$sideHash = (git -C $gitRoot rev-parse HEAD).Trim()
git -C $gitRoot checkout main | Out-Null
git -C $gitRoot branch -D side | Out-Null
node $WriteConfig $gitRoot $Repo | Out-Null
Set-Content -Path (Join-Path $gitRoot 'task_plan.json') -Value $ValidPlan -Encoding utf8 -NoNewline
Install-Hook $gitRoot 'claude-code'
$log.Add("GIT: base=$baseHash side=$sideHash")

$ckptOutside = $ValidCkpt.Replace('"lastCommitHash":null', ('"lastCommitHash":"' + $sideHash + '"'))
Set-Content -Path (Join-Path $gitRoot 'state_checkpoint.json') -Value $ckptOutside -Encoding utf8 -NoNewline
$outsideRes = Invoke-Hook $gitRoot 'claude-code' 'SessionStart' $ClaudeNew
Assert 'CA-09' 'boot names the recorded commit and the current head when outside history' ((Contains $outsideRes.stdout 'is outside current history at') -and (Contains $outsideRes.stdout $sideHash) -and (Contains $outsideRes.stdout $baseHash)) "stdout=$($outsideRes.stdout)"

$ckptDirty = $ValidCkpt.Replace('"lastCommitHash":null', ('"lastCommitHash":"' + $baseHash + '"'))
Set-Content -Path (Join-Path $gitRoot 'state_checkpoint.json') -Value $ckptDirty -Encoding utf8 -NoNewline
Add-Content -Path (Join-Path $gitRoot 'notes.txt') -Value 'pending edit' -Encoding utf8
$dirtyRes = Invoke-Hook $gitRoot 'claude-code' 'SessionStart' $ClaudeNew
Assert 'CA-10' 'boot warns about uncommitted changes' ((Contains $dirtyRes.stdout 'Working tree has uncommitted changes.') -and (Contains $dirtyRes.stdout 'Alpha Task')) "stdout=$($dirtyRes.stdout)"
git -C $gitRoot checkout -- notes.txt | Out-Null

$plain = New-BootFixture 'fx-plain' $ValidPlan $ValidCkpt @('claude-code')
$noRepoRes = Invoke-Hook $plain 'claude-code' 'SessionStart' $ClaudeNew
Assert 'CA-12' 'non-repository reports omitted checks and keeps boot content' ((Contains $noRepoRes.stdout 'Repository checks omitted: not_repository.') -and (Contains $noRepoRes.stdout 'Alpha Task') -and (-not (Contains $noRepoRes.stdout 'Checkpoint commit'))) "stdout=$($noRepoRes.stdout)"
$noGitRes = Invoke-Hook $plain 'claude-code' 'SessionStart' $ClaudeNew 'clear-path'
Assert 'CA-12' 'missing git reports omitted checks and keeps boot content' ((Contains $noGitRes.stdout 'Repository checks omitted: git_missing.') -and (Contains $noGitRes.stdout 'Alpha Task')) "stdout=$($noGitRes.stdout)"

$old = New-BootFixture 'fx-oldboot' $ValidPlan $OldVersionCkpt @('claude-code')
$oldRes = Invoke-Hook $old 'claude-code' 'SessionStart' $ClaudeNew
Assert 'CA-16' 'earlier schema version names the migration in the boot path' ((Contains $oldRes.stdout 'migrate the file to schema version 1') -and (Contains $oldRes.stdout 'state_checkpoint.json')) "stdout=$($oldRes.stdout)"

$log.Add("SUMMARY failures=$($script:failures)")
$log | Set-Content -Path (Join-Path $Evidence 'boot-scenarios.txt') -Encoding utf8
Write-Output "FAILURES=$($script:failures)"
