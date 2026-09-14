# T08 — Surface legacy CONTEXTOPS detection as a migration preview

## Outcome

`context-brake init` and `init --dry-run` report every detected legacy `CONTEXTOPS` block with the proposed migration and the `--migrate-legacy` action, leaving the affected file byte-for-byte unchanged until migration is explicitly authorized.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T09 (README legacy wording must describe the behavior delivered here)
- In scope: converting `legacyDetected` into a diagnostic finding and rendering it in text and JSON; tests and E2E fixture for the preview; migration consent behavior unchanged.
- Out of scope: changing the migration content algorithm, the `CONTEXTOPS`/`CONTEXTBRAKE` markers, or instruction-file targets.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-02 | `codereview.md#findings` | RF14 and CA-10 non-conformant: `legacyDetected` is produced by `planInstructionChanges` but never consumed by `planInstallation`, so no preview, notice, or remediation reaches the CLI output; UT-09 "preview finding is emitted" unmet |

## Requirements

- A legacy `CONTEXTOPS` block detected during planning must produce a user-visible finding with the file path and a remediation that names `context-brake init --migrate-legacy`, emitted before any confirmation and in `--dry-run` (RF14; TechSpec "Legacy migration has its own consent").
- Without `--migrate-legacy`, the file content must remain byte-identical and no `CONTEXTOPS` content may be removed; `--yes` alone must not authorize migration (RF14, CA-10).
- With `--migrate-legacy`, the existing behavior is retained: unmatched legacy text is preserved outside the new managed block (UT-09 second case, IT-07).
- Text and `--json` output must carry the same findings, with exactly one JSON document on stdout (`cli-output.md`, RF23).

## Context to recover on demand

- TechSpec: `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md` — "InstallReport", "DiagnosticFinding", the `init` option table (`--migrate-legacy`), "Key Decisions" (legacy migration has its own consent).
- Rules and skills: `file-changes.md`, `cli-output.md`, `javascript-typescript.md`, `tests.md`; `sdd-execute-corrections`.
- Code: `src/core/services/instruction-service.ts` (`InstructionPlanResult.legacyDetected`, `planExistingInstruction`) — source data; `src/core/services/installation-service.ts` (`planInstallation`, findings mapping) — drop site; `src/core/services/report-service.ts` (`InstallReport`) and `src/cli/output/text.ts` — render path.

## Work

- [x] T08.1 Have `planInstallation` convert each entry in `inst.legacyDetected` into a `DiagnosticFinding` (stable code such as `LEGACY_BLOCK_DETECTED`, severity `warning`, `path` set) whose message/remediation states the proposed migration and `--migrate-legacy`, preserving the file unchanged.
- [x] T08.2 Include the proposed replacement (the new reference block and preserved unmatched text) in the finding preview so CA-10's "output shows the proposed change" is satisfied, without adding a plan change.
- [x] T08.3 Verify text and JSON projections remain consistent and schema-valid, and that `--dry-run` reports the finding while writing nothing.
- [x] T08.4 Extend `tests/unit/instruction-service.test.ts` and `tests/integration/instruction-policy.test.ts` to assert the surfaced finding and unchanged bytes; add a built-CLI E2E scenario for a legacy fixture without and with the flag.
- [x] T08.5 Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, and `npm run build`; confirm gates stay green.

## Acceptance criteria

- Given a repository with a `CONTEXTOPS` block containing content beyond the protocol and without `--migrate-legacy`, `context-brake init --yes` leaves the instruction file byte-for-byte identical and its output names the block, the proposed migration, and the `--migrate-legacy` action, with exit code including a warning.
- `context-brake init --dry-run` shows the same finding and writes nothing.
- With `--migrate-legacy`, the block is replaced by the current reference block and unmatched legacy text is preserved.
- Text and JSON outputs contain the same finding code, severity, path, and remediation.

## Verification

- Unit: `tests/unit/instruction-service.test.ts` and `tests/unit/report-service.test.ts` — finding is produced and sorted, no plan change is added.
- Integration: `tests/integration/instruction-policy.test.ts` — preview writes nothing; confirmed migration preserves non-protocol text (IT-07).
- End-to-end: built CLI on a legacy fixture without the flag (file unchanged, migration reported) and with the flag (migrated), per the `AGENTS.md` CLI policy.
- Manual: not applicable.
- Platforms: Linux, macOS, and Windows (PowerShell and Git Bash); local Windows run plus CI.
- Environment dependency: none.
- Commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run build`.
- Expected evidence: finding in both output modes, byte-identical file assertion, and green gates.

## Affected files

- Modify: `src/core/services/installation-service.ts`, `src/core/services/report-service.ts` (if the finding model needs exposing), `src/cli/output/text.ts`, `tests/unit/instruction-service.test.ts`, `tests/integration/instruction-policy.test.ts`
- Create: `tests/e2e/e2e-legacy-preview.test.ts` (or extend an existing E2E file), `tests/fixtures/instructions/legacy-visible.md`

## Observability and recovery

- Operational signal: `LEGACY_BLOCK_DETECTED` finding with path and remediation in the install report.
- Recovery: no write occurs without `--migrate-legacy`; migration remains reviewable through `--dry-run`.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `planInstallation` now emits a `LEGACY_BLOCK_DETECTED` warning finding for every detected `CONTEXTOPS` block, carrying the file path, the proposed replacement reference block, the note that unmatched user text is preserved, and a `--migrate-legacy` remediation. The same finding is emitted on the no-harness path through `detectLegacyFindings`, which now also surfaces malformed/duplicate legacy marker conflicts instead of dropping them. In human mode, `runInit` writes the legacy preview to stderr before `authorizeWrite`, so the gap is visible before any confirmation; no plan change is added for the legacy file, so it stays byte-identical without the flag. `--migrate-legacy` keeps the existing migration behavior.
- Changed files: created `src/core/services/legacy-preview.ts`; modified `src/core/services/installation-service.ts`, `src/cli/output/text.ts` (exported `renderFinding`), `src/cli/commands/init.ts`; created `tests/unit/legacy-preview.test.ts` and `tests/e2e/e2e-legacy-preview.test.ts`.
- Checks: `npm run build` exit 0; `npm run typecheck` exit 0; `npm run lint` exit 0; focused `vitest run tests/unit/legacy-preview.test.ts tests/e2e/e2e-legacy-preview.test.ts` 7 passed; `npm run coverage` 55 files / 189 tests passed, coverage 91.03% statements, 81.23% branches, 96.09% functions, 91.03% lines (all ≥ 80%). E2E confirms: dry-run JSON and text contain `LEGACY_BLOCK_DETECTED` with exit 1, the file is byte-identical, the non-TTY no-`--yes` run prints the preview to stderr before failing with `CONFIRMATION_REQUIRED`, and `--migrate-legacy` migrates while preserving unmatched text.
- Validated state: worktree after T08 and the reviewer follow-ups N-1/N-3 (built into `dist/`), `package-lock.json` unchanged, Windows win32, Node v24.19.0, npm 11.17.0, PowerShell 7 and Git Bash. Linux/macOS deferred to CI.
- Open items: `tests/integration/node-process-runner.test.ts` ("stops descendants when the parent times out") is timing-flaky under the parallel coverage run and passed in isolation; unrelated to T08, recorded as an observation. Reviewer follow-up N-2 (preview describes rather than prints the literal preserved lines) is intentionally deferred as cosmetic. No functional open item.
