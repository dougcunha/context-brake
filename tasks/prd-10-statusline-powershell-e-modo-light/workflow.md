# Workflow and Decisions — prd-10-statusline-powershell-e-modo-light

## Feature Summary

- Feature: `prd-10-statusline-powershell-e-modo-light` (post PRD-09 fixes: the Claude Code status line bridge works when Claude Code runs the status line through PowerShell; debug mode in light mode; light mode as the default; repeated `SessionStart` `DEADLINE_EXCEEDED`)
- Workspace: `D:/MyProjects/ContextBrake`
- Status: `paused`
- Git base: `b6a1309` (branch `master`), after the commits `02ea858` (SDD skills), `df62a46` (PRD-09), and `b6a1309` (this repository's ContextBrake reinstall) of 2026-09-29; confirm the resolved hash in the checkpoint
- Pre-existing changes: only the untracked per-developer `.agents/settings.local.json` (the Claude Code status line bridge, kept out of Git)
- Predecessors: `prd-07` (light mode), `prd-08` (debug mode), `prd-09` (trusted window, default status line bridge)
- jev mode: `active`

## Human Decisions Log

| Decision ID | Date | Scope | Decision & Summary | Status |
| --- | --- | --- | --- | --- |
| DEC-PD-00 | 2026-09-29 | Product direction (request) | After PRD-09 acceptance the user reported: the status line disappeared in this repository; debug mode does not work in light mode; light mode should be the default. Human text: "A feature de imprimir a telemetria mostrando o contexto não funciona no modo light? Alias, o modo light deveria ser o padrão também." and, after the diagnosis below, "Caramba, corrija tudo isso ai". | RECORDED |
| DEC-HIL-00 | 2026-09-29 | Triage (HIL 0) | Level `sdd-lean`; jev mode `active`. The rubric recommended `sdd-full` sliced through `sdd-orchestrate-prds` (four primary outcomes; S1, S2, S5 present); `jev_decide` also recommended `sdd-full` at 0.92. Human text: "sdd-lean", "active". Record: last line of `tasks/triage-log.jsonl`. | APPROVED |
| DEC-STOPS-01 | 2026-09-29 | Stops | As a consequence of `sdd-lean`: short PRD (problem, FR with acceptance, out of scope); HIL 1 and HIL 2 merged into one decision presented after TechSpec and plan; a plan of one or two tasks; independent review kept. With four outcomes, the PRD must still cover each one; open product decisions (below) go to the human before the PRD, as in PRD-09. | RECORDED |
| DEC-PAUSE-00 | 2026-09-29 | Session continuity | "Nova sessão (Recommended)": the PRD stage starts in a new session, after Claude Code restarts with `CLAUDE_CODE_GIT_BASH_PATH` set. | RECORDED |

## Diagnosis carried from the reporting session (evidence, not decisions)

1. **Status line empty.** `.claude/settings.local.json` (created by the default bridge of PRD-09) holds `node "D:/MyProjects/ContextBrake/.claude/hooks/context-brake-statusline.mjs" --pipe | ( ccstatusline\n)` (`src/infrastructure/harnesses/claude-code/statusline-settings.ts:74-78#bridgeCommand`). The user's `ccstatusline` is intact in `~/.claude/settings.json`; the bridge state (`.context-brake/runtime/claude-statusline.json`) records `previousSource: user`. Through Git Bash the command prints the same output as `ccstatusline`; through PowerShell it fails to parse ("Expressions are only allowed as the first element of a pipeline"), so the bar is empty with no warning. Claude Code fell back to PowerShell because Git is installed by scoop (`C:\Users\Admin\scoop\apps\git\current\bin\bash.exe`) and `CLAUDE_CODE_GIT_BASH_PATH` was unset; the session also lost its Bash tool. Machine workaround applied on 2026-09-29 at the user's request: user environment variable `CLAUDE_CODE_GIT_BASH_PATH` set to that path (takes effect after Claude Code restarts). README already said "Windows without Git Bash (PowerShell only) is not verified".
2. **Debug mode in light mode.** Rejected by design in PRD-08: debug relies on a line in the instruction-file reference block, and light mode writes no instruction files (`README.md:242,264`). Changing it is a product decision on the channel (for example, the telemetry block itself, or a minimal reference block written only for debug).
3. **Light mode as the default.** Today `init` defaults to full mode (`src/cli/commands/init.ts:68`, `isLightModeInEffect`); light mode never blocks a tool call (`README.md:243`) and skips the status line bridge (`init.ts:69`). Making it the default conflicts with PRD-09's direction (bridge by default so the brake can block with a trusted window) and needs decisions on existing full installations, the `--light`/`--no-light` flags, and `run` (which refuses light mode, `src/cli/commands/run-preflight.ts:33`).
4. **`SessionStart` `DEADLINE_EXCEEDED`.** `.context-brake/runtime/errors.jsonl` has five `SessionStart` `DEADLINE_EXCEEDED` lines on 2026-09-29 (11:28Z–11:40Z) and three `StatusLine` ones on 2026-09-28; the internal deadline is 1,500 ms (`src/core/services/failure-policy.ts:13`, `src/infrastructure/runtime/process-hook-host.ts:31`), and a boot deadline resolves through `failure-policy.ts:56#deadlineBootDecision`. Cause not measured (candidates: boot git inspection over a large uncommitted worktree, ledger reads, CPU load; `tests/integration/boot-git-delivery.test.ts` failed with `inspection_failed` under load during PRD-09).

## Milestone History

1. **Triage (2026-09-29)**: HIL 0 decided `sdd-lean` with jev `active` (`DEC-HIL-00`, `DEC-STOPS-01`). Feature folder and checkpoint opened. Next: in a new session, collect the open product decisions (light default scope and migration, debug channel in light mode, status line command shape across shells) with the user, then `sdd-create-prd`.
