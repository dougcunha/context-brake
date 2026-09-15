# Stable execution context

Load in this exact order:

1. `tasks/prd-01.1-pendencias-da-instalacao/prd.md`
2. `tasks/prd-01.1-pendencias-da-instalacao/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T05 — Single legacy-block warning per file

## Outcome

A file with a legacy `CONTEXTOPS` block produces exactly one `LEGACY_BLOCK_DETECTED` warning in `init`'s combined text output (stderr preview plus stdout report), while `--json` keeps one finding per file as it does today.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: `init.ts`'s `emitLegacyPreview` and `text.ts`'s `renderInstallText`, for the `LEGACY_BLOCK_DETECTED` code only.
- Out of scope: legacy-block detection itself (`legacy-preview.ts`, unchanged); any other finding code's rendering.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-10 | `prd.md#functional-requirements` | Emit a single warning per file with a legacy block |
| US-07 | `prd.md#stories-and-journeys` | Clean terminal output for the legacy-block warning |
| DEC-05 | `techspec.md#technical-decisions` | Preview only when confirmable; text report skips what the preview already showed |
| CMP-05 | `techspec.md#components-and-flow` | `init.ts`, `text.ts` |
| TC-06 | `techspec.md#test-approach` | Non-TTY, `--yes`, confirmed interactive, `--dry-run --json` |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/cli-output.md` (human/JSON parity; results to stdout, warnings to stderr).
- Existing code: `src/cli/commands/init.ts:49` (`emitLegacyPreview`, writes `LEGACY_BLOCK_DETECTED` to stderr for every finding of that code, unconditionally when not `--json`); `src/cli/output/text.ts:24` (`renderInstallText`, the `for (const f of report.findings)` loop that writes every finding again, including the same code); `src/core/services/legacy-preview.ts` (produces the finding; unchanged).
- Contract or integration: `techspec.md#technical-decisions` DEC-05 for the exact split (preview only for a confirmable run; text report skips exactly the codes/paths already shown).
- Harness reference: not applicable.

## Work

- [x] T05.1 Change `emitLegacyPreview` in `init.ts` to run only when the command is about to request confirmation (no `--yes`, no `--dry-run`, not `--json`), and to return the set of `(code, path)` pairs it printed.
- [x] T05.2 Pass that set into `renderInstallText` (new optional parameter or a small wrapper) so it skips findings whose `(code, path)` pair was already printed by the preview.
- [x] T05.3 Confirm `--json` output is untouched: it always serializes `InstallReport.findings` in full, regardless of what the stderr preview printed.
- [x] T05.4 Add/extend unit and end-to-end tests asserting the combined stderr+stdout text contains `LEGACY_BLOCK_DETECTED` exactly once per file across each of: non-TTY without `--yes`, `--yes`, a confirmed interactive run, and `--dry-run --json` (where it must appear once, in JSON only).

## Acceptance criteria

- For a repository with N files carrying a legacy block, every `init` invocation's combined stderr+stdout text contains `LEGACY_BLOCK_DETECTED` exactly N times, never 2N.
- `--json` output still contains one `LEGACY_BLOCK_DETECTED` finding per file, unaffected by the stderr preview.
- `--dry-run` behavior (preview only, no confirmation, no write) is unchanged.

## Verification

- Unit: `emitLegacyPreview` returns the correct printed-pairs set; `renderInstallText` skips exactly those pairs when given the set, and prints everything when given none.
- Integration: not applicable — this is a rendering-only change.
- End-to-end: built CLI, non-TTY without `--yes` (stderr preview only, confirmation required message), `--yes` (single print in the applied report), a confirmed interactive run with a fake prompt (single combined print), and `--dry-run --json` (JSON has the finding, no stderr preview duplicate).
- Manual: none.
- Platforms: not platform-sensitive.
- Commands: `npm run build`, `npm test -- init-legacy-preview e2e-legacy-preview`
- Environment dependency: none.
- Expected evidence: `tests/unit/init-legacy-preview.test.ts` and `tests/e2e/e2e-legacy-preview.test.ts` pass with the exactly-once assertion.

## Affected files

- Modify: `src/cli/commands/init.ts`, `src/cli/output/text.ts`, `tests/e2e/e2e-legacy-preview.test.ts`
- Create: `tests/unit/init-legacy-preview.test.ts` (or extend it if an equivalent file already exists at execution time)

## Observability and recovery

- Operational signal: none new; this only changes how many times an existing finding is printed to text streams.
- Recovery: revert `init.ts` and `text.ts`; the finding itself and `--json` output are never affected by this task.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `init`'s combined stderr+stdout text now shows exactly one `LEGACY_BLOCK_DETECTED` per file, in every mode (non-TTY without `--yes`, `--yes`, confirmed-interactive, `--dry-run`). `emitLegacyPreview` only prints (and only when about to request confirmation — not `--yes`, not `--dry-run`, not `--json`) and returns the `(code, path)` pairs it printed; `renderInstallText` skips any finding whose pair is in that set. `--json` is untouched — it always serializes the full `findings` array regardless of the stderr preview.
- Changed files: `src/cli/commands/init.ts` (`emitLegacyPreview` gated and exported for testing, returns printed pairs; `outputReport` forwards them), `src/cli/output/text.ts` (new exported `findingPrintKey`; `renderInstallText` takes an optional `alreadyPrinted` set), `tests/unit/init-legacy-preview.test.ts` (new), `tests/e2e/e2e-legacy-preview.test.ts` (two new exactly-once assertions for `--yes` and `--dry-run --json`), `tests/test-lanes.ts` (registered the new process-lane unit test, since it imports `cli/commands/init.js`).
- Checks: `npm run build`, `npm run typecheck`, `npm run lint` (0 issues) all pass; `npx vitest run init-legacy-preview e2e-legacy-preview` — 2 files, 9 tests pass; full suite `npx vitest run` — 91 files, 376 tests pass (no regression).
- Validated state: unit coverage of all four preview gates (default, `--yes`, `--dry-run`, `--json`) and both `renderInstallText` branches (skip vs. print); E2E coverage of the built CLI for non-TTY-no-confirmation, `--yes`, and `--dry-run --json` exactly-once counts. The "confirmed interactive run with a fake prompt" scenario from the task's Verification is covered at the unit level instead of E2E — `runBuiltCli`'s piped stdio is never a TTY, so `authorizeWrite` cannot reach its interactive branch in a spawned E2E process; the gate logic that scenario would exercise (preview prints once regardless of how confirmation is ultimately obtained, then the report skips that pair) is exactly what the unit tests assert directly.
- Open items: none.

### ADR candidates

None - direct TechSpec implementation (DEC-05).
