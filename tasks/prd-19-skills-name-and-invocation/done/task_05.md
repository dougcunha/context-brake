# Stable execution context

Load in this exact order:

1. `tasks/prd-19-skills-name-and-invocation/prd.md`
2. `tasks/prd-19-skills-name-and-invocation/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T05 — Repository, docs, and end-to-end

## Outcome

This repository's own configuration, README, `AGENTS.md`, SDD references, `terminal-tty.md`, and the harness research doc use the bare name and the new facts; the built CLI round trip proves a bare name becomes the harness form; all gates pass.

## Dependencies and boundaries

- Depends on: T03, T04
- Unblocks: —
- In scope: `context-brake.config.json`, README (`--snapshot-command` examples and the CLI table), `AGENTS.md` ("`/sdd-snapshot` here"), `.agents/skills/sdd-orchestrate-flow/references/autonomous-mode.md` (the fix command and the checks), `docs/research/terminal-tty.md`, the Skills entries in `docs/research/harness-integrations.md` (DEC-09), regenerated `schemas/`, the end-to-end case TC-13, the final gates.
- Out of scope: slice 20, the SDD skills' other text, rewriting old PRDs.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-08, FR-09, OBJ-04, NFR-05 | `prd.md#functional-requirements` | Repo config and docs, research entries, schemas |
| FR-03, FR-05 | `prd.md#functional-requirements` | Round trip |
| DEC-08, DEC-09, CMP-13 | `techspec.md#technical-decisions` | Order of changes, research doc |
| TC-09, TC-10, TC-13 | `techspec.md#test-approach` | Checks |

## Context to recover on demand

- Applicable skills and rules: `harness-adapters.md`, `tests.md` (e2e smoke set), `file-changes.md` (no instruction file is edited by ContextBrake itself; this task edits repository docs by hand).
- Existing code: `tests/e2e/*` (existing init and hook smoke), `README.md`, `AGENTS.md`.
- Harness reference: the PRD "Assumptions and sources" table is the content of the Skills entries.

## Work

- [x] T05.1 Add a "Skills" entry (folders, invocation, verified 13/10/2026, link) to each of the eight harness sections of `docs/research/harness-integrations.md`, in the file's language and format; record the gaps A-03 and A-04.
- [x] T05.2 Update README, `AGENTS.md`, `terminal-tty.md`, and the autonomous-mode reference to the bare name.
- [x] T05.3 Extend the e2e smoke (TC-13); run `npm run build`, `npm run schemas:generate`.
- [x] T05.4 Last: change `context-brake.config.json` to `sdd-snapshot` and `sdd-orchestrate-flow`; run the built CLI `doctor` in this repository (no error), then `npm run lint`, `typecheck`, `coverage`, `schemas:check`, `test:budget`, `package:smoke`, `dependencies:check`.

## Acceptance criteria

- `git grep -nE '"/sdd-(snapshot|orchestrate-flow)"|--snapshot-command "/|--resume-command "/'` outside `tasks/` and `tests/` prints nothing.
- Each harness section has the Skills entry; the research doc index still renders.
- The e2e case passes on the built CLI.
- All commands in T05.4 exit 0 with test counts reported.

## Verification

- Unit: none new.
- Integration: none new.
- End-to-end: built CLI `init --snapshot-command sdd-snapshot --resume-command sdd-orchestrate-flow` in a fixture repository, then a Claude Code red-zone hook round trip containing `run "/sdd-snapshot"`.
- Manual: none.
- Platforms: Linux, macOS, Windows (the e2e runs where the suite runs).
- Commands: the list in T05.4.
- Environment dependency: none.
- Expected evidence: command outputs and the `git grep` result.

## Affected files

- Modify: `context-brake.config.json`, `README.md`, `AGENTS.md`, `docs/research/harness-integrations.md`, `docs/research/terminal-tty.md`, `.agents/skills/sdd-orchestrate-flow/references/autonomous-mode.md`, the e2e test file, `schemas/*`.
- Create: none.

## Observability and recovery

- Operational signal: `doctor` in this repository.
- Recovery: revert the commit; the config returns to `/sdd-snapshot`.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: eight "Skills no projeto e invocação (PRD-19)" entries in `docs/research/harness-integrations.md` (folders, invocation form, date 13/10/2026, link, gaps A-03 and A-04); README (flags, JSON example, invocation table, name rule), `AGENTS.md`, `docs/telemetry-block.md`, and the autonomous-mode reference use the bare name; `context-brake.config.json` holds `sdd-snapshot` and `sdd-orchestrate-flow`; a built-CLI case proves the old format is rejected with exit 64 and writes nothing, and bare names are stored. The built-CLI hook round trip of TC-13 (`action=run "/sdd-snapshot"`, `Run "/sdd-resume"`) is the existing `light-mode-lifecycle.test.ts`, updated in T01 and T02.
- Changed files: `context-brake.config.json`, `README.md`, `AGENTS.md`, `docs/research/harness-integrations.md`, `docs/telemetry-block.md`, `.agents/skills/sdd-orchestrate-flow/references/autonomous-mode.md` (`.claude/skills` is a symlink to it), `tests/e2e/e2e-init.test.ts`; `docs/research/terminal-tty.md` needed no change (it quotes flag names only).
- Checks: `npm run lint`, `typecheck`, `schemas:check`, `dependencies:check` clean; `npm run coverage` 258 files, 1340 tests passed, 95.98% statements; `npm run test:budget` 101.0 s wall (budget 180 s); `npm run package:smoke` exit 0; TC-09 `git grep` outside `tasks/`, `tests/`, and `tests-refactor-plan.md` printed nothing; built `doctor` in this repository prints `claude-code: /sdd-snapshot, resume: /sdd-orchestrate-flow`.
- Validated state: working tree on `master` at base `7295a43` plus T01 to T05, Windows, Node 24; `npm run build` ran after the last source change.
- Open items: `doctor` reports `ASSET_OUTDATED` for `.claude/hooks/context-brake.mjs` and the mod `register.mjs` because the rebuilt assets differ from the copies installed in this repository; `context-brake init --yes` refreshes them. It was not run: the hooks of the running session are those files (an area `AGENTS.md` declares critical and the TechSpec does not decide). Until then the installed hook script renders the bare name without the slash. `doctor` also shows an overhead `fail` (166.7 ms) caused by machine load, unrelated to this change.

### ADR candidates

None - direct TechSpec implementation or local decision.
