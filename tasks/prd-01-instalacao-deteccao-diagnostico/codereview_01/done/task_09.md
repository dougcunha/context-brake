# T09 — Correct the README configuration example and legacy migration wording

## Outcome

The README configuration example is valid against the published `context-brake.config.schema.json`, and the README describes legacy `CONTEXTOPS` migration exactly as the corrected CLI implements it.

## Dependencies and boundaries

- Depends on: T08 (the legacy wording must match the behavior delivered there)
- Unblocks: —
- In scope: the configuration example and legacy-migration sentence in `README.md`; an optional guard test that the documented example validates.
- Out of scope: all other README content, PRD/TechSpec text, and CLI behavior.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-03 | `codereview.md#findings` | Documented configuration uses `./task_plan.json` and `./state_checkpoint.json`, which `configurationSchema` rejects, and the README claims legacy blocks migrate "after you confirm" although the CLI only migrates with `--migrate-legacy` |

## Requirements

- The `context-brake.config.json` example in `README.md` must parse with the canonical `configurationSchema` (RF15/RF17); repository-relative paths must not carry a `./` prefix.
- The legacy-migration sentence must state that migration happens only with `--migrate-legacy` and that the CLI shows the proposed change first (RF14, CA-10).
- No documented command or option may exceed what the implemented CLI supports (`cli-output.md`, task_6 handoff "Reconcile README ... with the verified implementation").

## Context to recover on demand

- TechSpec: `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md` — "ContextBrakeConfig", the `init` option table; PRD RF15, RF17, RF14, CA-10.
- Rules and skills: `code-standards.md`, `cli-output.md`; `sdd-execute-corrections`.
- Code: `src/core/contracts/configuration.ts` (`relativePath`, `DEFAULT_CONFIG`), `src/core/validation/configuration-validator.ts` — validation source of truth; `README.md:96-130` and `README.md:90` — affected text.

## Work

- [x] T09.1 Change the README example `stateStorage` paths to `task_plan.json` and `state_checkpoint.json`.
- [x] T09.2 Reword the legacy sentence to require `--migrate-legacy` and mention the preview, consistent with T08.
- [x] T09.3 Add a unit test that extracts the README configuration JSON block and parses it with `configurationSchema`, so the example cannot drift again (skip gracefully only if the block is intentionally non-JSON).
- [x] T09.4 Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run coverage`; confirm gates stay green.

## Acceptance criteria

- The README configuration example parses successfully with `configurationSchema`.
- The README's legacy statement matches the behavior verified in T08 (no migration without `--migrate-legacy`; preview shown).
- No documented option or path contradicts the implemented CLI.

## Verification

- Unit: new test parsing the README example against `configurationSchema`.
- Integration: not applicable.
- End-to-end: not applicable.
- Manual: read the updated README sections against RF14/RF15/RF17 and the `init` option table.
- Platforms: not applicable (documentation).
- Environment dependency: none.
- Commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`.
- Expected evidence: passing README-example test and updated README diff.

## Affected files

- Modify: `README.md`
- Create: `tests/unit/readme-config-example.test.ts`

## Observability and recovery

- Operational signal: not applicable.
- Recovery: documentation-only change; revert the README hunk if needed.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: the README configuration example now uses canonical repository-relative paths (`task_plan.json`, `state_checkpoint.json`) and parses against the published `configurationSchema`; the legacy sentence now states that `CONTEXTOPS` blocks are previewed and migrated only with `--migrate-legacy`, preserving unmatched text, matching the T08 behavior. A regression test extracts the README `json` block and validates it.
- Changed files: `README.md`; created `tests/unit/readme-config-example.test.ts`.
- Checks: `npm run lint` exit 0; `npm run typecheck` exit 0; focused `vitest run tests/unit/readme-config-example.test.ts` 1 passed; `npm run coverage` 56 files / 190 tests passed, coverage 91.03% statements, 81.21% branches, 96.09% functions, 91.03% lines (all ≥ 80%).
- Validated state: worktree after T09, `package-lock.json` unchanged, Windows win32, Node v24.19.0, npm 11.17.0. Documentation-only change; no platform-specific behavior.
- Open items: none.
