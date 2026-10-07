# Stable execution context

Load in this exact order:

1. `tasks/prd-12-refatoracao-modo-leve-modo-unico/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T09 — `init` text output reports the snapshot settings

## Outcome

`init` in text mode states the snapshot settings it wrote: the snapshot command and trigger zone, or that only zone headers will be injected when no snapshot command is configured. This includes a fresh install with no snapshot flag. `--json` carries the same text it carries today.

## Dependencies and boundaries

- Depends on: —
- Unblocks: re-review of codereview_01
- In scope:
  - the text renderer prints the config change's `preview.summary`;
  - the config summary always has a snapshot part derived from the resulting config: `set the snapshot command <cmd> at <zone>`, or a "zone headers only" part when the written config has no `snapshot.command`.
- Out of scope:
  - `doctor` output, which already reports the snapshot settings;
  - new flags, report fields, or schema changes.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-02 | `codereview.md#Findings` | `init` text output omits the snapshot settings and never says "zone headers only" |
| PRD User experience | `prd.md#User experience` | "`init` reports the snapshot skill settings it wrote, or says that only zone headers will be injected" |
| FR-04, FR-06 | `prd.md#Functional requirements` | Snapshot settings and the behavior without a command |

## Requirements

- Text output follows `.agents/rules/cli-output.md`. Only the config change gets the summary line; other changes print as today.
- The snapshot part reflects the config `init` writes, for set, cleared, and kept snapshot settings, and for a fresh install.
- When `init` writes no config change (idempotent rerun), it prints nothing extra.
- The `InstallReport` shape and schema are unchanged; `preview.summary` stays a string.

## Context to recover on demand

- Rules: `cli-output.md`, `code-standards.md`, `javascript-typescript.md`, `tests.md`.
- Code: `src/core/services/installation-builder.ts:configSummary,snapshotSummary`; `src/cli/output/text.ts:renderInstallText`; `tests/integration/init-snapshot.test.ts`; `tests/unit/cli-output-text.test.ts`.

## Work

- [x] T09.1 Derive the snapshot part of the config summary from the resulting config, including the "zone headers only" case.
- [x] T09.2 Print the config change summary in `renderInstallText`.
- [x] T09.3 Assert the text output in `init-snapshot` (command set; no command on a fresh install) and the renderer in `cli-output-text`.

## Acceptance criteria

- `init --yes --snapshot-command /sdd-snapshot` text output names `/sdd-snapshot` and its trigger zone.
- `init --yes` on a fresh fixture with no snapshot flag says only zone headers will be injected.
- `--json` output still validates against `schemas/install-report.schema.json`.

## Verification

- Unit: `tests/unit/cli-output-text.test.ts` and any unit suite asserting `configSummary` text.
- Integration: `tests/integration/init-snapshot.test.ts`.
- End-to-end: not applicable (no new e2e file; prd-13 owns the test budget).
- Manual: none.
- Platforms: Windows (local).
- Environment dependency: none.
- Commands: `npx vitest run <the suites above>` (DEC-PROC-02), `npm run lint`, `npm run typecheck`, `npm run schemas:check`.
- Expected evidence: passing suites with the new text assertions, clean lint and typecheck, schemas unchanged.

## Affected files

- Modify: `src/core/services/installation-builder.ts`, `src/cli/output/text.ts`, `tests/integration/init-snapshot.test.ts`, `tests/unit/cli-output-text.test.ts`

## Observability and recovery

- Operational signal: the `init` text output.
- Recovery: revert the two source files.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result (CR-02, PRD User experience, FR-04, FR-06):
  - `installation-builder.ts:configSummary` always adds a snapshot part, taken from the config `init` writes rather than from the flags. The part reads `snapshot command <cmd> at <zone>[, resume command <cmd>]`, or `no snapshot command, so only zone headers will be injected (trigger: <zone>)`. So a fresh install and a rerun that keeps the section report it too.
  - `text.ts:renderInstallText` prints the config change's `preview.summary` on an indented line under `[kind] context-brake.config.json (config)`. Other changes print as before. An idempotent rerun has no config change and prints nothing extra.
  - The `InstallReport` shape and schemas are unchanged. The `--json` `preview.summary` text now carries the same snapshot part.
- Changed files: modified `src/core/services/installation-builder.ts`, `src/cli/output/text.ts`, `tests/unit/cli-output-text.test.ts`, `tests/integration/init-snapshot.test.ts`; created `tests/unit/installation-summary.test.ts` (4 tests: fresh install, set with resume, kept section, no resume).
- Checks:
  - `npm run build` passes.
  - `npx vitest run` over `installation-summary`, `cli-output-text`, `config-legacy-checks`, `init-snapshot`, `init-debug-mode`, and `init-debug-mode-disable`: 6 files, 35 tests pass.
  - `rtk proxy npx eslint` on the touched files is clean. `npm run typecheck` is clean after fixing a harness ID in the new test. `npm run schemas:check` passes.
  - Built CLI in a temporary git fixture with `.claude/`: `init --yes --snapshot-command /sdd-snapshot` prints `[create] context-brake.config.json (config)` followed by `Configure ContextBrake active harnesses and zones; snapshot command /sdd-snapshot at RED`. `init-snapshot` asserts the fresh-install "zone headers only" text.
  - Quality profile over the touched files: no `any`, comment, or empty catch. Files stay at or under 100 lines (`installation-builder.ts` 94, `text.ts` 59), and `renderInstallText` stays under 30 lines.
- Validated state: base `1474f54` plus the uncommitted T01-T07 diff, T08, and this correction; Windows 11, Git Bash.
- Open items: none.
