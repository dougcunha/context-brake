# Stable execution context

Load in this exact order:

1. `tasks/prd-12-refatoracao-modo-leve-modo-unico/codereview_03/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T12 — Print the config summary only for `init`

## Outcome

The install text output prints the config change summary only when the command is `init`. `remove` prints its planned changes as before T09.

## Dependencies and boundaries

- Depends on: —
- Unblocks: re-review of codereview_03
- In scope: key the summary line in `src/cli/output/text.ts:renderInstallText` on `report.command === 'init'` as well as the config owner; add a renderer assertion that a `remove` report prints no summary line.
- Out of scope: summary texts; JSON output.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_03/OI-04 | `codereview.md#Findings` | Summary line printed for any config-owned change, including the `remove` delete |
| DEC-HIL-RES-01 | `../workflow.md#Human Decisions Log` | Reservation chosen for correction |
| codereview_01/CR-02 | `../codereview_01/done/task_09.md#Requirements` | "Other changes print as today" |

## Requirements

- `init` keeps printing the summary under the config line (T09 behavior).
- `remove` prints no summary line.

## Context to recover on demand

- Rules: `cli-output.md`, `code-standards.md`, `tests.md`.
- Code: `src/cli/output/text.ts:renderInstallText`; `src/core/services/removal-service.ts:33`; `tests/unit/cli-output-text.test.ts`.

## Work

- [x] T12.1 Gate the summary line on the `init` command.
- [x] T12.2 Assert in `cli-output-text` that a `remove` report with a config delete prints no summary line.

## Acceptance criteria

- The `init` summary assertions still pass, and the new `remove` assertion passes.

## Verification

- Unit: `tests/unit/cli-output-text.test.ts`.
- Integration: `tests/integration/init-snapshot.test.ts` (text summary on `init`).
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows (local).
- Environment dependency: none.
- Commands: `npx vitest run <the suites above>` (DEC-PROC-02), `npm run lint`, `npm run typecheck`.
- Expected evidence: passing suites, clean lint and typecheck.

## Affected files

- Modify: `src/cli/output/text.ts`, `tests/unit/cli-output-text.test.ts`

## Observability and recovery

- Operational signal: `init` and `remove` text output.
- Recovery: revert the condition.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result (OI-04, DEC-HIL-RES-01): `text.ts:renderInstallText` prints the config summary only when `report.command === 'init'`. `remove` prints its `[delete] context-brake.config.json (config)` line without "Delete configuration file".
- Changed files:
  - `src/cli/output/text.ts`.
  - `tests/unit/cli-install-text.test.ts` (new): the `init` summary test moved here from `cli-output-text`, plus the new `remove` test. Keeping them in `cli-output-text` would have pushed that file past the 100-line lint limit.
  - `tests/unit/cli-output-text.test.ts`: its "success hint" test only checked that stdout was written; the stronger `init` test above replaces it.
- Checks:
  - `npm run build` passes.
  - `npx vitest run` over `cli-output-text`, `cli-install-text`, and `test-lanes`: 3 files, 11 tests pass. `init-snapshot` passes (27-test run in T11).
  - `rtk proxy npx eslint .` and `npm run typecheck` are clean.
  - The installed `.agents/hooks/*.mjs` are byte-identical to `dist/assets/runtime/` (`cmp`), so no reinstall is needed: the change is CLI-only.
- Validated state: base `1474f54` plus T01-T10 and round 3; Windows 11, Git Bash.
- Open items: none.
