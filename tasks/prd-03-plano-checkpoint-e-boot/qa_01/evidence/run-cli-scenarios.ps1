$ErrorActionPreference = 'Stop'
$Repo = 'D:\MyProjects\ContextBrake'
$Evidence = Join-Path $Repo 'tasks\prd-03-plano-checkpoint-e-boot\qa_01\evidence'
$Probe = Join-Path $Evidence 'probe.mjs'
$WriteConfig = Join-Path $Evidence 'write-config.mjs'
$Validator = Join-Path $Evidence 'validate-plan-status.mjs'
$CliScript = Join-Path $Repo 'dist\src\cli\main.js'
$TmpRoot = Join-Path $env:TEMP 'cb-qa-01-cli'
if (Test-Path $TmpRoot) { Remove-Item -Recurse -Force $TmpRoot }
New-Item -ItemType Directory -Path $TmpRoot | Out-Null
$log = New-Object System.Collections.Generic.List[string]
$script:failures = 0
$script:log = $log
$log.Add("QA CLI scenarios - $(Get-Date -Format o)")
$log.Add("node $(node --version) - $([System.Environment]::OSVersion.VersionString) - repo $Repo - tmp $TmpRoot")

function Contains([string]$text, [string]$needle) {
  if ($null -eq $text) { return $false }
  return $text.IndexOf($needle, [System.StringComparison]::Ordinal) -ge 0
}
function Assert([string]$id, [string]$name, [bool]$ok, [string]$detail) {
  $status = 'FAILED'
  if ($ok) { $status = 'PASSED' } else { $script:failures += 1 }
  $script:log.Add("[$id] $status - $name :: $detail")
}
function Invoke-Cli([string]$workDir, [string[]]$cliArgs) {
  $raw = node $Probe $workDir none none $CliScript $cliArgs
  $result = $raw | ConvertFrom-Json
  $script:log.Add("CMD: context-brake $($cliArgs -join ' ')  (cwd $workDir)")
  $script:log.Add("EXIT: $($result.code)")
  $script:log.Add("STDOUT: $($result.stdout)")
  $script:log.Add("STDERR: $($result.stderr)")
  return $result
}

$plan5 = @'
{"schemaVersion":1,"taskId":"qa-status","title":"QA Status Task","currentStepId":3,"steps":[{"id":1,"title":"Prepare","description":"d","status":"COMPLETED","validationCommand":"npm test","artifactsProduced":[]},{"id":2,"title":"Design","description":"d","status":"COMPLETED","validationCommand":"npm test","artifactsProduced":[]},{"id":3,"title":"Build","description":"d","status":"IN_PROGRESS","validationCommand":"npm run check","artifactsProduced":[]},{"id":4,"title":"Verify","description":"d","status":"PENDING","validationCommand":"npm test","artifactsProduced":[]},{"id":5,"title":"Ship","description":"d","status":"PENDING","validationCommand":null,"artifactsProduced":[]}]}
'@
$ckpt5 = @'
{"schemaVersion":1,"taskId":"qa-status","activeStepId":3,"gitState":{"branch":"main","lastCommitHash":null,"cleanWorkingTree":null},"workingMemory":{"discoveredConstraints":["c-one","c-two"],"decisionsMade":["d-one","d-two","d-three"],"blockedItems":[],"breakingChanges":[]},"modifiedFiles":["src/a.ts"],"timestamp":"2026-09-23T12:00:00.000Z"}
'@
$planBad = @'
{"schemaVersion":1,"taskId":"qa-bad","title":"QA Bad Task","currentStepId":1,"steps":[{"id":1,"title":"One","description":"d","status":"IN_PROGRESS","validationCommand":"npm test","artifactsProduced":[]},{"id":2,"title":"Two","description":"d","status":"IN_PROGRESS","validationCommand":"npm test","artifactsProduced":[]}]}
'@
$ckptOld = @'
{"schemaVersion":2,"taskId":"qa-status","activeStepId":3,"gitState":{"branch":"main","lastCommitHash":null,"cleanWorkingTree":null},"workingMemory":{"discoveredConstraints":[],"decisionsMade":[],"blockedItems":[],"breakingChanges":[]},"modifiedFiles":[],"timestamp":"2026-09-23T12:00:00.000Z"}
'@

$fx = Join-Path $TmpRoot 'fx-init'
New-Item -ItemType Directory -Path $fx | Out-Null
$r = Invoke-Cli $fx @('plan', 'init', '--task=refactor-auth')
$planPath = Join-Path $fx 'task_plan.json'
$ckptPath = Join-Path $fx 'state_checkpoint.json'
$plan = $null
$ckpt = $null
if (Test-Path $planPath) { $plan = Get-Content $planPath -Raw | ConvertFrom-Json }
if (Test-Path $ckptPath) { $ckpt = Get-Content $ckptPath -Raw | ConvertFrom-Json }
Assert 'CA-01' 'plan init creates plan and checkpoint' (($r.code -eq 0) -and ($null -ne $plan) -and ($null -ne $ckpt)) "exit=$($r.code)"
Assert 'CA-01' 'example step carries status and validation command' (($null -ne $plan) -and ($plan.taskId -eq 'refactor-auth') -and (@($plan.steps).Count -ge 1) -and ($null -ne @($plan.steps)[0].status) -and (Contains @($plan.steps)[0].validationCommand 'npm')) "taskId=$($plan.taskId) step1status=$(@($plan.steps)[0].status) cmd=$(@($plan.steps)[0].validationCommand)"
Assert 'CA-01' 'checkpoint records git state and working memory' (($null -ne $ckpt) -and ($null -ne $ckpt.gitState) -and ($null -ne $ckpt.workingMemory) -and ($null -ne $ckpt.timestamp)) "activeStepId=$($ckpt.activeStepId) timestamp=$($ckpt.timestamp)"

$planHashBefore = (Get-FileHash $planPath -Algorithm SHA256).Hash
$ckptHashBefore = (Get-FileHash $ckptPath -Algorithm SHA256).Hash
$r2 = Invoke-Cli $fx @('plan', 'init', '--task=second')
$planHashAfter = (Get-FileHash $planPath -Algorithm SHA256).Hash
$ckptHashAfter = (Get-FileHash $ckptPath -Algorithm SHA256).Hash
$messageText = "$($r2.stdout) $($r2.stderr)"
Assert 'CA-02' 'refused init without confirmation leaves files identical' (($r2.code -ne 0) -and ($planHashBefore -eq $planHashAfter) -and ($ckptHashBefore -eq $ckptHashAfter)) "exit=$($r2.code) planHash=$($planHashBefore -eq $planHashAfter) ckptHash=$($ckptHashBefore -eq $ckptHashAfter)"
Assert 'CA-02' 'refusal explains the missing confirmation' ((Contains $messageText 'CONFIRMATION_REQUIRED') -or (Contains $messageText 'onfirm')) "message=$messageText"
$r2b = Invoke-Cli $fx @('plan', 'init', '--task=second', '--yes')
$plan2 = Get-Content $planPath -Raw | ConvertFrom-Json
Assert 'CA-02' 'explicit --yes allows overwrite' (($r2b.code -eq 0) -and ($plan2.taskId -eq 'second')) "exit=$($r2b.code) taskId=$($plan2.taskId)"

$fx3 = Join-Path $TmpRoot 'fx-status'
New-Item -ItemType Directory -Path $fx3 | Out-Null
node $WriteConfig $fx3 $Repo | Out-Null
Set-Content -Path (Join-Path $fx3 'task_plan.json') -Value $plan5 -Encoding utf8 -NoNewline
Set-Content -Path (Join-Path $fx3 'state_checkpoint.json') -Value $ckpt5 -Encoding utf8 -NoNewline
$env:NO_COLOR = '1'
$r3 = Invoke-Cli $fx3 @('plan', 'status', '--json')
$r3t = Invoke-Cli $fx3 @('plan', 'status')
Remove-Item Env:\NO_COLOR -ErrorAction SilentlyContinue
$statusJsonPath = Join-Path $TmpRoot 'status.json'
Set-Content -Path $statusJsonPath -Value $r3.stdout -Encoding utf8 -NoNewline
$schemaResult = node $Validator $statusJsonPath $Repo
$log.Add("SCHEMA: $schemaResult")
$parsed = $null
try { $parsed = $r3.stdout | ConvertFrom-Json } catch { }
Assert 'CA-15' 'plan status --json emits one valid document (exit 0)' (($r3.code -eq 0) -and ($null -ne $parsed)) "exit=$($r3.code)"
Assert 'CA-15' 'JSON carries 5 steps, active step, and file validity' (($null -ne $parsed) -and (@($parsed.plan.steps).Count -eq 5) -and ($parsed.plan.activeStep.id -eq 3) -and ($parsed.files.plan.valid -eq $true) -and ($parsed.files.checkpoint.valid -eq $true)) "steps=$(@($parsed.plan.steps).Count) active=$($parsed.plan.activeStep.id) planValid=$($parsed.files.plan.valid) ckptValid=$($parsed.files.checkpoint.valid)"
Assert 'CA-15' 'JSON matches the shipped planStatusReportSchema' (Contains $schemaResult 'VALID') "schema=$schemaResult"
Assert 'CA-15' 'text status shows steps and statuses without color' (($r3t.code -eq 0) -and (Contains $r3t.stdout 'QA Status Task') -and (Contains $r3t.stdout 'IN_PROGRESS') -and (Contains $r3t.stdout 'COMPLETED')) "text=$($r3t.stdout)"

$fx4 = Join-Path $TmpRoot 'fx-bad'
New-Item -ItemType Directory -Path $fx4 | Out-Null
node $WriteConfig $fx4 $Repo | Out-Null
Set-Content -Path (Join-Path $fx4 'task_plan.json') -Value $planBad -Encoding utf8 -NoNewline
Set-Content -Path (Join-Path $fx4 'state_checkpoint.json') -Value $ckpt5 -Encoding utf8 -NoNewline
$r4 = Invoke-Cli $fx4 @('plan', 'status')
Assert 'CA-03' 'two IN_PROGRESS steps rejected naming the rule' (($r4.code -eq 2) -and ((Contains $r4.stdout 'more than one IN_PROGRESS') -or (Contains $r4.stderr 'more than one IN_PROGRESS'))) "exit=$($r4.code) out=$($r4.stdout) err=$($r4.stderr)"

$fx5 = Join-Path $TmpRoot 'fx-old'
New-Item -ItemType Directory -Path $fx5 | Out-Null
node $WriteConfig $fx5 $Repo | Out-Null
Set-Content -Path (Join-Path $fx5 'task_plan.json') -Value $plan5 -Encoding utf8 -NoNewline
Set-Content -Path (Join-Path $fx5 'state_checkpoint.json') -Value $ckptOld -Encoding utf8 -NoNewline
$r5 = Invoke-Cli $fx5 @('plan', 'status')
$oldText = "$($r5.stdout) $($r5.stderr)"
Assert 'CA-16' 'earlier schema version names the required migration' (($r5.code -eq 2) -and (Contains $oldText 'migrate the file to schema version 1')) "exit=$($r5.code) out=$oldText"

$fx6 = Join-Path $TmpRoot 'fx-protocol'
New-Item -ItemType Directory -Path (Join-Path $fx6 '.claude') -Force | Out-Null
$r6 = Invoke-Cli $fx6 @('init', '--yes')
$protocolPath = Join-Path $fx6 'docs\context-brake-protocol.md'
$protocol = ''
if (Test-Path $protocolPath) { $protocol = Get-Content $protocolPath -Raw }
$redLine = ($protocol -split "`n") | Where-Object { $_.StartsWith('| `RED`') } | Select-Object -First 1
Assert 'CA-13' 'protocol file carries the complete boot routine' (($r6.code -eq 0) -and (Contains $protocol '## Starting a new session') -and (Contains $protocol 'Run the validation command of the active step, or of the last completed step') -and (Contains $protocol 'Check that the recorded commit exists in the current branch history') -and (Contains $protocol 'Continue the active step.')) "exit=$($r6.code) red=$redLine"
Assert 'CA-14' 'default red-zone routine instructs the checkpoint: commit' (Contains $redLine 'commit with `checkpoint: <step title>`') "red=$redLine"
$cfgPath = Join-Path $fx6 'context-brake.config.json'
$cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
$cfg.stateStorage.instructCheckpointCommit = $false
$cfg | ConvertTo-Json -Depth 12 | Set-Content $cfgPath -Encoding utf8
$r6b = Invoke-Cli $fx6 @('init', '--yes')
$protocol2 = Get-Content $protocolPath -Raw
$redLine2 = ($protocol2 -split "`n") | Where-Object { $_.StartsWith('| `RED`') } | Select-Object -First 1
Assert 'CA-14' 'switch off removes the commit instruction from the red routine' (($r6b.code -eq 0) -and (-not (Contains $redLine2 'commit'))) "exit=$($r6b.code) red=$redLine2"

$log.Add("SUMMARY failures=$($script:failures)")
$log | Set-Content -Path (Join-Path $Evidence 'cli-scenarios.txt') -Encoding utf8
Write-Output "FAILURES=$($script:failures)"
