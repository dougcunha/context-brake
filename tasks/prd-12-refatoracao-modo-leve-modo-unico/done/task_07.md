# Stable execution context

Load in this exact order:

1. `tasks/prd-12-refatoracao-modo-leve-modo-unico/prd.md`
2. `tasks/prd-12-refatoracao-modo-leve-modo-unico/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T07 — Documentation and dogfooding

## Outcome

- The README, `AGENTS.md`, `CLAUDE.md`, `.agents/rules/`, and the SDD skill texts describe only the single mode, with no ContextBrake deny.
- Acceptance mode is gone.
- This repository's config, `.gitignore`, instruction files, and Claude Code settings match a fresh install of the new build. `doctor` reports no error here.
- MA-01 passes in interactive Claude Code.

## Dependencies and boundaries

- Depends on: T05, T06
- Unblocks: —
- In scope (DEC-15, DEC-16):
  - **README:** rewrite the intro, Solution, zone table, init and removal, Configuration (with a `snapshot` example), CLI commands, and support table. Delete the "Brake Behavior & State-Saving Allowlist", "Delegated Snapshot Mode", and "State Files" sections. Drop the `run`, `wrap`, and `plan` rows. Update the roadmap rows.
  - **`AGENTS.md`:** lines 3, 11, 28, 48, and 57-61. Remove the acceptance command. Update the PRD list (plan and runner PRDs marked superseded by prd-12) and the Context protocol section.
  - **`CLAUDE.md`:** remove the protocol line and the ContextBrake block.
  - **`.gitignore`:** remove the ContextBrake block.
  - **Protocol file:** delete `docs/context-brake-protocol.md` and its `package.json` `files` entry.
  - **`.agents/rules/*`:** `tests.md`, `javascript-typescript.md`, `node.md`, `harness-adapters.md`, `file-changes.md`, `code-standards.md`. Replace the examples about the plan and checkpoint.
  - **Skill texts:**
    - `sdd-snapshot/SKILL.md` Failures;
    - `sdd-orchestrate-tasks/references/session-continuity.md`, "Measure the context";
    - `sdd-plan-refactoring/references/cli-and-adapters.md:7`;
    - `sdd-triage/SKILL.md:24`.

    Mirror each change in `.claude/skills/` and keep the two trees identical.
  - **`docs/research/harness-integrations.md`:** add one dated note to "Consequências para o desenho".
  - **Acceptance mode:** remove `test:acceptance`, the `--mode acceptance` in `release:check`, `TEST_MODE_VARIABLE` and its lane env in `vitest.config.ts`, and `tests/helpers/acceptance-scale.ts` if it still exists.
  - **This repository:**
    - Rewrite `context-brake.config.json` to the new shape, with `snapshot.command` and `resumeCommand` from the maintainer.
    - Remove the PreToolUse group from `.claude/settings.json`.
    - Run `npm run build`, then `node dist/src/cli/main.js init --yes` and `doctor`.
  - **Tests:** rewrite `readme-config-example`, `readme-light-example`, `readme-support-table`, `docs-auto-restart`, and `package-contents`.
- Out of scope:
  - Research notes other than the one dated note.
  - Historical PRDs under `tasks/`.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-11 | `prd.md#functional-requirements` | This repository on the single mode |
| FR-12 | `prd.md#functional-requirements` | Documentation and repository text |
| NFR-02 | `prd.md#non-functional-requirements` | Final quality gate |
| DEC-15, DEC-16 | `techspec.md#technical-decisions` | — |
| CMP-11, CMP-12 | `techspec.md#components-and-flow` | — |
| TC-15, TC-16, TC-17, MA-01 | `techspec.md#test-approach` | — |

## Context to recover on demand

- Applicable rules: the rules being edited, plus `cli-output.md` for README examples of output.
- Existing text: the line lists in `techspec.md`, Relevant files and DEC-15. Re-run the TC-16 `rg` to find what remains.
- The maintainer's snapshot and resume commands: ask the user before writing this repository's config.

## Work

- [x] T07.1 Rewrite the README and its tests.
- [x] T07.2 Update `AGENTS.md` and `CLAUDE.md`. Update the rules and the skill texts, mirrored in `.claude/skills/`. Add the research note.
- [x] T07.3 Remove acceptance mode from `package.json`, `vitest.config.ts`, and the helpers.
- [x] T07.4 Move this repository: config, `.gitignore`, protocol file, and `.claude/settings.json`. Then build, `init`, and `doctor`.
- [x] T07.5 Run the TC-16 `rg`, lint, typecheck, `schemas:check`, `npm run coverage`, and `npm run package:smoke`.
- [x] T07.6 MA-01 with the maintainer.

## Acceptance criteria

- The TC-16 `rg` command returns nothing.
- `diff -rq .agents/skills .claude/skills` reports no difference.
- `node dist/src/cli/main.js doctor` in this repository reports no error.
- `npm run package:smoke` passes, and the package no longer ships the protocol doc or the removed schemas.
- MA-01, recorded by the maintainer:
  - telemetry at `RED` names the snapshot command;
  - no tool call is denied;
  - a typed `/clear` injects the resume text;
  - a marker reply makes the mod run `/clear`, and the new session shows the resume text and the seed (TechSpec MA-01 step (d)).

## Verification

- Unit: `tests/unit/readme-*.test.ts` (TC-15).
- Integration: `tests/integration/{docs-auto-restart,package-contents}.test.ts`.
- End-to-end: none new.
- Manual: TC-16, TC-17, MA-01. The owner is the maintainer.
- Platforms: Windows (PowerShell) for MA-01.
- Commands: `npm run lint`, `npm run typecheck`, `npm run schemas:check`, `npm run build`, `npm run coverage`, `npm run package:smoke`.
- Environment dependency: interactive Claude Code in this repository for MA-01.
- Expected evidence: command outputs, `doctor` output, and the MA-01 result recorded in the handoff.

## Affected files

- Modify:
  - Repo docs and config: `README.md`, `AGENTS.md`, `CLAUDE.md`, `.gitignore`, `package.json`, `vitest.config.ts`, `context-brake.config.json`, `.claude/settings.json`.
  - Rules: `.agents/rules/{tests,javascript-typescript,node,harness-adapters,file-changes,code-standards}.md`.
  - Skill texts, mirrored under `.claude/skills/`: `.agents/skills/sdd-snapshot/SKILL.md`, `sdd-orchestrate-tasks/references/session-continuity.md`, `sdd-plan-refactoring/references/cli-and-adapters.md`, `sdd-triage/SKILL.md`.
  - Research note: `docs/research/harness-integrations.md`.
  - Tests: the README and docs tests.
- Delete: `docs/context-brake-protocol.md`, plus `tests/helpers/acceptance-scale.ts` if it remains.

## Observability and recovery

- Operational signal: `doctor` output for this repository.
- Recovery: `git revert`. The previous install is restored by checking out the previous commit and running its `init`.

## Handoff

> Updated by `sdd-execute-task`. **T07 complete: T07.1-T07.6 done; MA-01 (a)-(d) pass, (d) on the DEC-T07-02 rerun.**

- Produced result (FR-11, FR-12, DEC-15, DEC-16, DEC-T07-01):
  - **README** (TC-15):
    - Intro, Solution, zone table (generic and snapshot actions), init and removal, and the upgrade path from the earlier modes.
    - Configuration example with `snapshot`, and a new "Snapshot and Resume Commands" section with flags and example.
    - Status line bridge and automatic restart text without blocking or `run`, and the CLI table without `run`, `wrap`, `plan`, or the removed flags.
    - Roadmap: prd-03, 04, 06, and 07 superseded; prd-08 to 14 listed.
    - The "Brake Behavior & State-Saving Allowlist", "Delegated Snapshot Mode", "Light Mode", and "State Files" sections are deleted.
    - Git Bash note: `MSYS_NO_PATHCONV=1`, because Git Bash rewrote `/sdd-snapshot` into a Windows path during dogfooding.
  - **`docs/telemetry-block.md`** (FR-12 gap, not in the TechSpec list but shipped in the package): rewritten for the `zone-guidance` texts, the resume text, no deny, and no block log.
  - **`AGENTS.md`, `CLAUDE.md`, and `.gitignore`**: single mode. `.gitignore` also ignores `.agents/settings.local.json`, which `doctor` reported as `STATUSLINE_LOCAL_TRACKED` because `/.claude` is a junction to `.agents`.
  - **Rules:** `tests`, `javascript-typescript`, `node`, `harness-adapters` (no deny, neutral failure policy), `file-changes` (harness configs only), and `code-standards` (example).
  - **Skill texts:**
    - `sdd-snapshot` Failures, `session-continuity` "Measure the context", `sdd-plan-refactoring/references/cli-and-adapters.md`, and `sdd-triage` S2.
    - Also `sdd-create-techspec` template and `architectural-analysis` catalog, which named the plan and checkpoint files.
    - `.claude` is a junction to `.agents`, so `diff -rq .agents/skills .claude/skills` is empty.
  - **Research:** a dated note in `harness-integrations.md`, under "Consequências para o desenho".
  - **Acceptance mode** (T07.3, earlier in this task): removed.
  - **Protocol file:** deleted, along with its package entries.
  - **FR-02 message:** `InvalidConfigurationError` now names every issue (`Configuration validation failed: stateStorage is not a recognized key; ...`). Before, the CLI printed only "Configuration validation failed.", so a removed key was not named outside `issues` (test in `configuration-snapshot`).
  - **ESLint** ignores `.context-brake/**`. The generated auto-restart mod bundle there produced 171 lint errors once installed in this repository.
  - **This repository (T07.4):**
    - `context-brake.config.json` lost `stateStorage`, `instructionFiles`, `brake`, and `runner`. `init --yes --snapshot-command /sdd-snapshot --resume-command /sdd-orchestrate-flow --auto-restart` wrote `snapshot` and `autoRestart` and refreshed the hook assets.
    - The stale PreToolUse group is removed from `.claude/settings.json`.
    - `doctor` reports no error (exit 1, warnings only): `AUTO_RESTART_NOT_LOADED` until a new session loads the mod, `VERSION_FLOOR_UNVERIFIED`, and `RUNTIME_ERRORS_RECORDED`.
    - The 2,094 `INVALID_CONFIG` lines are historical. They are 2 Claude Code entries from the old config, and 2,090 `opencode`/`pi` `pre_tool` lines written into this repository's runtime by pre-T05 tests, the last at 20:46. The full coverage run added none.
    - The Claude Code overhead benchmark shows 287 ms p95 against a 100 ms target. This is a reported limitation, not an error.
- Checks (Windows 11, base `1474f54` plus T01-T07):
  - The TC-16 `rg` returns nothing. `npm run lint` is clean, `npm run typecheck` is clean, and `npm run schemas:check` passes.
  - **Full `npm run coverage` (DEC-PROC-01):** 196 files and 1,049 tests passing. Coverage is 94.52% statements, 89.57% branches, 95.99% functions, and 94.52% lines, in 342.9 s.
  - **`npm run package:smoke`** passes. `package-contents` asserts that the protocol doc and the removed schemas are not packed.
  - The slowest files, for prd-13: `e2e-light-mode` 33 s, `doctor-active-sessions` 31 s, `e2e-support-limitations` 23 s, `e2e-debug-mode` 21 s, and `runtime-overhead` 18 s.
- MA-01 live run (2026-10-07, Claude Code 2.1.292, Windows, this session, mod `AUTO_RESTART_READY`). Zones were lowered to 9/19/29 so the session at 40% reached `CRITICAL`, then restored to 49/65/75:
  - (a) pass: `[ContextBrake v3] turn=205 usage=40% tokens=407225/1000000 source=measured window=harness zone=CRITICAL action=run "/sdd-snapshot" now, then end reply with [REQUEST_SESSION_RESET]`.
  - (b) pass: Bash calls (`node dist/src/cli/main.js --help`, `ls`, `rg`, `sed`, `python`) ran in `CRITICAL`, with no PreToolUse hook registered.
  - (d) first attempt **failed**: the mod did not run `/clear`.
    - Timeline: the marker reply ended at 11:54:56Z (`turn_duration` and `Stop` hook recorded). No `reset` line reached the ledger, and the mod log `.context-brake/runtime/claude-mod/e02e2b55-….json` kept `records: []`; its last write is the `session.start` load at 11:41:35Z. At 12:38Z the maintainer asked what to do, and at 12:39:37Z typed `/clear` (`~/.claude/history.jsonl`). `doctor` then still said `AUTO_RESTART_READY`.
    - Offline check: the installed bundle `.context-brake/claude-mod/context-brake-restart/hooks/register.mjs`, run outside Claude Code with a fake host, the real reply text, and the current config, logs `RESTARTED`, runs `clear`, and submits the seed. This proves the bundle logic for those inputs, not what the host passed.
    - Every path that reaches `report` writes a log record, stand-down skips and `ERROR_INTERNAL` included. `records: []` leaves either a hook that never ran or one of three silent early returns in `handleTurnComplete`: `reason !== 'answer'` or `agentId` set; `endsWithResetSignal(answer)` false; `readModConfig` undefined. The 2.1.292 types match what the mod expects (`answer` is the final visible text, `agentId` absent on the main loop, `$.fs.read` returns text). No `~/.claude/debug` log exists for that session.
    - prd-11 MA-01 logged `RESTARTED` on Claude Code 2.1.289 (TokenHound, light mode). This run used 2.1.292, so a host change is a candidate. The TechSpec risk covered a `SessionStart` hook that does not fire after a mod `/clear`. This failure is earlier: no `/clear` ran.
  - (c) **pass**: the typed `/clear` started session `13404a65` (ledger `reset reason=clear` at 12:39:37Z). The model received `[ContextBrake resume v1] Run "/sdd-orchestrate-flow" before continuing.` as `SessionStart` hook context. The maintainer reported "não apareceu": Claude Code does not show hook `additionalContext` on screen, so the person sees nothing, and only the model receives the text.
  - (d) **pass on the rerun** (DEC-T07-02, 2026-10-07, Claude Code 2.1.292 under `claude --continue --debug`, session `13404a65`, zone `GREEN` at 14% measured, turn 35). FR-10 gates the restart on the signal alone, so the zone does not matter for (d). The marker turn ran only read-only commands before the reply.
    - 13:00:00.636Z: the reply ending with `[REQUEST_SESSION_RESET]` is in the transcript `~/.claude/projects/D--MyProjects-ContextBrake/13404a65-….jsonl`.
    - 13:00:00.970Z: the mod log `.context-brake/runtime/claude-mod/13404a65-….json` records `RESTARTED`. The debug log `~/.claude/debug/13404a65-….txt` lines 761-767 show `$.ui.log: ContextBrake: restarting the session now`, `$.command.run (context-brake-restart): 6 chars queued` (`/clear`), and `turn.complete settled`.
    - 13:00:01.071Z: the debug log of the new session `~/.claude/debug/7a0aa04b-….txt` line 8 shows `$.prompt.submit (context-brake-restart)` with the generic seed. Lines 33 and 50 show `SessionStart:clear` returning `additionalContext` `[ContextBrake resume v1] Run "/sdd-orchestrate-flow" before continuing.`
    - 13:00:01.319Z: the ledger `.context-brake/runtime/sessions/claude-code/0946467672….jsonl` opens with `reset reason=clear`.
    - The new session received both texts and resumed this flow from them.
    - The TechSpec risk "the settings `SessionStart` hook may not fire after a mod-initiated `/clear`" did not materialize: `SessionStart:clear` fired after the mod `/clear`. prd-14 does not need to move the resume text into the mod seed for Claude Code.
  - O-06 verified: `telemetry.zones` are back at 49/65/75 (rechecked after the rerun).
  - Found in the run: the CLI help and `package.json` description still said "tool-call safeguards". Both now say "Context telemetry and an advisory brake for coding-agent harnesses" (build, `main` and `package-contents` tests, and lint pass).
- Open items:
  - **First (d) failure unexplained** (11:54:56Z, session `e02e2b55`): the rerun passed with the same build and config, but no debug log exists for the first attempt, so its cause is unknown. A flaky host delivery of `turn.complete` to the mod is possible. If it recurs, the fallback stays the typed `/clear`, which (c) proved.
  - **Full coverage predates one string change:** the help text and `package.json` description fix came after the full `npm run coverage`. Only the touched suites (`main`, `package-contents`), the build, and lint ran after it (DEC-PROC-01/02).
  - **Note for the reviewer:** the T06 handoff stated `npm run lint` clean while a `max-lines-per-function` error in `e2e-07-08` was pending. It was fixed in T07, and the lint result above is from the current state.

### ADR candidates

None - direct TechSpec implementation or local decision.
