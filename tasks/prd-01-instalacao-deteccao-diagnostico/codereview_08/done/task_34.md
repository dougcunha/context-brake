# Stable execution context

Load in this exact order:

1. `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_08/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward.

---

# T34: Make README installation and support claims match the implementation

## Outcome

The README names the real Oh-My-Pi extension path, describes the canonical three-line instruction block, reports the same support levels/limitations as the adapters, and states the now-implemented `.gitignore` behavior consistently.

## Dependencies and boundaries

- Depends on: T30 for final profiles and T32 for final `.gitignore` behavior.
- Unblocks: T35.
- In scope: README path, marker-block description, support table/limitations, `.gitignore` wording reconciliation, and a drift-prevention unit test.
- Out of scope: changing adapter behavior, adding marketing copy, rewriting unrelated README sections, and new vendor research not required by a detected mismatch.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| `codereview_08/CR-05` | `codereview.md#findings` | README uses `.omp/hooks/` and calls the canonical block four lines. |
| `codereview_08/CR-02` | Documentation consequence | The public support table must not drift from corrected adapter profiles. |
| `codereview_08/CR-03` | Documentation consequence | README currently both claims and labels `.gitignore` management as planned. |
| PRD 1.1 | FR-13 | Requires `.omp/extensions/`, a three-line block, and current support/limitation documentation. |
| PRD 1.1 TechSpec | DEC-12 and TC-13 | Requires a unit check between README support rows and adapter profiles. |

## Requirements

- Replace `.omp/hooks/` with `.omp/extensions/` wherever the Oh-My-Pi installation path is described.
- Describe the managed instruction pointer as three lines including both markers; avoid a numeric count elsewhere if it can drift without value.
- Update the eight-harness support table to the profiles produced by T30 and state relevant failure/timeout or coverage limitations without promising unavailable behavior.
- Reconcile README `.gitignore` statements after T32 so all sections consistently describe the implemented init/default-remove/`--remove-state` lifecycle and none calls it planned.
- Add a unit test that parses the README support table and compares every harness level with `capabilityProfile().supportLevel`; assert the Oh-My-Pi path and canonical block wording.
- Keep prose factual, concise, and free of unverifiable guarantees.

## Context to recover on demand

- TechSpec: PRD 1.1 DEC-12, TC-13, `Capability declarations`; PRD-01 Integration Points and IgnoreBlock.
- Rules and skills: `cli-output.md`, `harness-adapters.md`, `tests.md`, `antislop`, and `antislop-copywriting`.
- Code: eight adapter `capabilityProfile()` methods after T30.
- Code: `src/infrastructure/harnesses/oh-my-pi/planner.ts:OMP_EXTENSION_FILE` and `src/core/services/instruction-markers.ts`.
- Tests: `tests/unit/readme-config-example.test.ts` - existing README parsing pattern.

## Work

- [ ] T34.1 Add a failing README contract test for all eight profile levels, `.omp/extensions/`, and the canonical instruction-block description.
- [ ] T34.2 Correct the support table, limitation notes, Oh-My-Pi path, and marker description using T30/T32 outputs as sources of truth.
- [ ] T34.3 Reconcile all `.gitignore` lifecycle statements and run README/package checks plus completion gates.

## Acceptance criteria

- No `.omp/hooks/` occurrence remains in README; `.omp/extensions/` matches the planner and TechSpec.
- README no longer says the instruction pointer has four lines and accurately describes the canonical three-line block.
- The test finds exactly one row for each harness and every listed level equals the adapter's derived level, including the HIL-approved Antigravity result.
- `.gitignore` behavior is described consistently across overview, init, remove, and state-file sections.
- Package smoke and README configuration-example tests remain green.

## Verification

- Unit: `readme-support-table.test.ts` plus existing README configuration tests.
- Integration: not applicable.
- End-to-end: package smoke verifies the corrected README is packaged.
- Manual: read the rendered Markdown table and command sections for clarity after automated assertions pass.
- Platforms: platform-neutral; T35 supplies the final matrix.
- Environment dependency: completed T30 profile decision and T32 implementation.
- Commands: focused Vitest files, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run package:smoke`.
- Expected evidence: exact README assertions, eight profile matches, no stale path/count/planned claim, and green gates.

## Affected files

- Modify: `README.md`.
- Create: `tests/unit/readme-support-table.test.ts`.
- Modify if a shared parser is justified: `tests/unit/readme-config-example.test.ts` or a test-only README helper.

## Observability and recovery

- Operational signal: none at runtime; published documentation mirrors tested adapter and lifecycle behavior.
- Recovery: revert T34. No runtime or user file changes are involved.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: T34.1-T34.3 complete. `README.md` now (a) names the real Oh-My-Pi extension path `.omp/extensions/` (source of truth `src/infrastructure/harnesses/oh-my-pi/planner.ts:OMP_EXTENSION_FILE`), (b) describes the managed instruction pointer as a three-line block between `<!-- CONTEXTBRAKE:START -->` and `<!-- CONTEXTBRAKE:END -->` with no numeric line count, (c) reports the eight T30 profiles with their real coverage/timeout limitations, and (d) reconciles the `.gitignore` lifecycle across the overview, init, removal, and state-file sections (init creates/appends/updates the block; default `remove` preserves it; `remove --remove-state` deletes state and block, deleting `.gitignore` only when the block was its only content; nothing calls it planned). Created `tests/unit/readme-support-table.test.ts`, which parses the README support table, asserts exactly one row per harness, and compares every level to `capabilityProfile().supportLevel` for all eight adapters, and asserts the `.omp/extensions/` path and the canonical three-line block wording. Final README rows (Harness | level): Claude Code `full`, Codex CLI `partial`, Cursor `full`, GitHub Copilot CLI `full`, OpenCode `partial`, Pi `full`, Oh-My-Pi `full`, Antigravity CLI `cooperative`. No shared parser was justified, so `tests/unit/readme-config-example.test.ts` is unchanged.
- Changed files: Modified `README.md` (support-level intro, support table, blocking sentence, three-line pointer, uninstallation and State Files `.gitignore` lifecycle); created `tests/unit/readme-support-table.test.ts` (65 lines).
- Checks: focused Vitest `readme-support-table` + `readme-config-example` -> 2 files, 6 passed (new file 5). `npm run lint` -> passed. `npm run typecheck` -> passed. `npm test` -> 84 files, 343 passed, 1 skipped (POSIX-only Codex shell case on Windows). `npm run coverage` -> 84 files, 343 passed, 1 skipped; 92.33% statements / 86.01% branches / 95.68% functions / 92.33% lines (threshold 80%). `npm run package:smoke` -> passed, 212 packaged files verified. QA-01..QA-06 over `tests/unit/readme-support-table.test.ts` -> 0 hits each; the test uses `String.match` instead of `RegExp.exec` so the QA-05 `exec(` scan stays clean; largest function <= 30 lines and file 65 lines.
- Validated state: uncommitted correction worktree over `2a26a3e` (Windows 11 Pro, PowerShell 7, Node v24.19.0, npm 11.17.0); README table rendered and read manually. No adapter behavior changed; levels and limitations mirror T30.
- Open items: one non-reproducible failure occurred during an intermediate `npm run coverage` invocation (1 of 344); two later full `npm test` runs and one later full `npm run coverage` run were completely green with no timeout or unhandled error. Final Ubuntu/macOS/Windows matrix and repeatability evidence belong to T35. Antigravity returns to a blocking level only when PRD-02 installs selective pre-tool blocking.
