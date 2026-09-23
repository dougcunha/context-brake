# T17 — Distinguish missing and invalid plans in status text

## Outcome

`context-brake plan status` prints the missing-plan initialization guidance only when `task_plan.json` is absent. An existing but invalid plan produces only its actionable `INVALID_STATE_FILE` findings, without claiming that no plan exists or recommending `plan init`.

## Dependencies and boundaries

- Depends on: —
- Unblocks: independent re-review and re-QA of `qa_01/BUG-01`
- In scope: the text renderer's missing-plan branch and focused integration/end-to-end regression coverage
- Out of scope: the `PlanStatusReport` or JSON schema, core validation behavior, plan/checkpoint content, exit codes, reservation items RV-01 through RV-06, and accepted platform or harness evidence limits

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| `qa_01/BUG-01` | `qa.md#Findings` | Existing invalid `task_plan.json` is incorrectly described as absent and paired with misleading `plan init` guidance |
| `prd.md` | RF19, CA-15 | `plan status` reports plan progress and file validity accurately |
| `techspec.md` | DEC-12, CMP-21, TC-15 | Text output renders the same validated report used by JSON output |
| `.agents/rules/cli-output.md` | Messages | Expected errors identify the affected file and how to repair it |

## Requirements

- Use `report.files.plan.exists` to distinguish a missing plan from an existing plan that failed validation; do not infer existence solely from `report.plan === null`.
- Preserve the current `[OK] No plan exists ... Run 'context-brake plan init ...'` output when the plan file is absent.
- For an existing invalid plan, emit the existing `INVALID_STATE_FILE` finding with file, field path, violated rule, impact, and remediation, and do not emit either the missing-plan claim or `plan init` guidance.
- Keep exit code `2`, the core report object, `--json` output, and valid-plan text output unchanged.
- Cover the regression at the command boundary and through the built CLI using an existing plan with two `IN_PROGRESS` steps, matching the CA-03 scenario.

## Context to recover on demand

- TechSpec: `DEC-12`, `CMP-21`, and `TC-15`
- Rules and skills: `.agents/rules/code-standards.md`, `.agents/rules/javascript-typescript.md`, `.agents/rules/node.md`, `.agents/rules/tests.md`, `.agents/rules/cli-output.md`; `sdd-execute-corrections`
- Code: `src/cli/output/text.ts:renderPlanStatusText` — conflates absent and invalid plans in its null-plan branch
- Test: `tests/integration/plan-status-command.test.ts` and `tests/e2e/e2e-plan-status.test.ts` — existing missing, valid, and invalid status coverage
- Evidence: `qa_01/evidence/cli-scenarios.txt:146-157` — original CA-03 reproduction

## Work

- [x] T17.1 Gate the missing-plan initialization message on `files.plan.exists === false` while retaining the existing invalid-state findings.
- [x] T17.2 Add focused integration assertions for absent and existing-invalid plans, including absence of the misleading claim and remediation in the invalid case.
- [x] T17.3 Add a built-CLI regression for the CA-03 two-`IN_PROGRESS` fixture and verify the corrected text, stream, and exit code.
- [x] T17.4 Run the focused tests, full quality commands, and record evidence in the handoff without modifying the original QA report.

## Acceptance criteria

- A directory without `task_plan.json` still prints the healthy missing-plan guidance, exits `0`, and emits no error.
- A directory with an existing plan containing two `IN_PROGRESS` steps exits `2`, writes the `INVALID_STATE_FILE` finding to stderr with the file, field path, rule, impact, and remediation, and does not contain `No plan exists` or `plan init` guidance.
- The regression does not change valid-plan text output, JSON output/schema validity, or the core plan-status report.
- `qa_01/BUG-01` is removed without weakening the original error assertions or changing product contracts.

## Verification

- Unit: not applicable; the defect is at the CLI rendering boundary and is covered by focused integration and end-to-end tests
- Integration: absent plan remains healthy; existing malformed or schema-invalid plan reports only actionable findings and no initialization guidance
- End-to-end: built CLI against a temporary fixture repository containing the CA-03 two-`IN_PROGRESS` plan; exit `2`, actionable stderr, no misleading stdout/stderr text
- Manual: none
- Platforms: Windows must pass locally; Linux/macOS and Node 20/22 remain the accepted HIL 1 evidence limit in `O-07`
- Environment dependency: none; correction scope is already authorized by `DEC-HIL-02`
- Commands: `npm run build`; `npm test -- plan-status-command e2e-plan-status --maxWorkers=1`; `npm run lint`; `npm run typecheck`; `npm test`; `npm run coverage`
- Expected evidence: focused tests prove both branches; typecheck, full tests, and coverage complete successfully; full lint is executed, touched files pass, and any pre-existing repository errors are recorded without expanding this task

## Affected files

- Modify: `src/cli/output/text.ts`
- Modify: `tests/integration/plan-status-command.test.ts`
- Modify: `tests/e2e/e2e-plan-status.test.ts`
- Create: —

## Observability and recovery

- Operational signal: user-facing `plan status` text on stderr; the existing `INVALID_STATE_FILE` code, field path, rule, impact, and remediation remain the diagnostic signal
- Recovery: revert the renderer guard and focused tests; no state migration, persisted data, or external side effect requires reversal

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `renderPlanStatusText` now emits the missing-plan initialization message only when `files.plan.exists` is false. An existing invalid plan retains its actionable findings without a false absence claim or `plan init` guidance. The integration and built-CLI regressions cover malformed JSON and the original CA-03 two-`IN_PROGRESS` state.
- Changed files: `src/cli/output/text.ts`; `tests/integration/plan-status-command.test.ts`; `tests/e2e/e2e-plan-status.test.ts`.
- Checks: `npm run build` passed; `npx eslint src/cli/output/text.ts tests/integration/plan-status-command.test.ts tests/e2e/e2e-plan-status.test.ts` passed; `npm run typecheck` passed; focused `npm test -- plan-status-command e2e-plan-status --maxWorkers=1` passed 2 files/9 tests; final `npm test` passed 173 files/967 tests in 366.25s after two tool timeouts produced no assertion failure; `npm run coverage` passed 173 files/967 tests with 93.55% statements and 100% statement/line coverage for `src/cli/output/text.ts`; `git diff --check` passed. Repository-wide `npm run lint` was executed and still reports 14 pre-existing `no-undef` errors in five unchanged `qa_01/evidence/*.mjs` files; all correction-touched files pass lint.
- Validated state: Windows 11, Node.js v24.19.0, Git base `ba11fe2664dfb626786d2f05ede1e55d889ec6eb` plus the scoped uncommitted correction. Build output exercised by the built-CLI test; JSON schema/core report behavior unchanged; no manual acceptance required. Linux/macOS and Node 20/22 remain accepted evidence limit O-07.
- Open items: None for `qa_01/BUG-01`. Independent re-review and re-QA remain mandatory; RV-01 through RV-06 and O-07 remain the previously accepted open items.
