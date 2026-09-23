# T10 — Include repository divergence in session boot

## Outcome

Valid checkpoint boots report the current repository comparison on every supported delivery path. Missing Git reports omitted checks.

## Dependencies and boundaries

- Depends on: approved exception `DEC-EX-CR01` in `workflow.md`.
- Unblocks: re-review of CR-01; T11 and T12 may proceed independently.
- In scope: Git inspection in the boot reader, bounded process execution, integration tests through built runtime assets, and the narrow bundle policy adjustment approved at exception HIL.
- Out of scope: new harness events, installer changes, and changes to `plan status` behavior.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| `codereview_01/CR-01` | `codereview.md#Findings` | Boot passes empty divergences instead of inspecting Git |
| RF9, RF14, RF16; CA-09, CA-10, CA-12 | `prd.md#Boot no início da sessão`, `#Verificação do estado herdado` | Delivery, commit/tree comparison, and omitted-check notice |
| DEC-01, DEC-09; CMP-11, CMP-16; TC-09, TC-10, TC-12 | `techspec.md#Technical decisions`, `#Components and flow`, `#Test approach` | Existing Git port and boot path |

## Requirements

- Inspect only after both files parse and match and the plan has an active step; do not run Git for missing, completed, or invalid state.
- Pass `compareGitState` output to `decideBoot`, preserving the recorded commit, current commit, dirty tree, missing Git, and not-a-repository cases.
- Use the existing `ProcessRunner` and `NodeGitInspector`; do not use shell strings or synchronous process APIs. Bound process time and preserve the hook failure policy.
- Narrow the runtime `child_process` bundle guard under `DEC-EX-CR01`; keep other forbidden imports guarded. Do not bypass it with hidden dynamic imports or shell aliases.

## Context to recover on demand

- TechSpec: DEC-01, DEC-09, CMP-11, CMP-16, TC-09/10/12; approved exception decision once recorded.
- Rules: `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `harness-adapters.md`.
- Code: `src/infrastructure/runtime/boot-reader.ts`, `runtime-composition.ts`, `src/infrastructure/git/git-inspector.ts`, `src/infrastructure/process/node-process-runner.ts`, `src/core/services/git-divergence.ts`.
- Tests: `tests/unit/runtime-bundle-imports.test.ts`, `tests/integration/boot-delivery.test.ts`, `tests/integration/boot-invalid-state.test.ts`.

## Work

- [x] T10.1 Apply the approved process-boundary design and connect the Git inspector to valid boot decisions.
- [x] T10.2 Cover dirty, missing/outside-history commit, clean, missing Git, and non-repository cases through built hook or extension delivery.
- [x] T10.3 Verify invalid/completed state does not inspect Git and a failed inspection degrades safely.
- [x] T10.4 Reconcile original T05 evidence and manifest state through the DAG owner.

## Acceptance criteria

- A boot from a dirty fixture repository names the dirty tree; one with a missing or outside-history recorded commit names both recorded and current state as appropriate.
- Without Git or outside a repository, boot explicitly says repository checks were omitted.
- Valid clean state has no false divergence; invalid or completed state preserves its existing behavior.
- Runtime bundle policy, process deadline, and no-shell rules pass under the approved exception.

## Verification

- Unit: boot reader skips inspection for invalid/completed state and passes actual comparison to policy.
- Integration: built runtime assets against temporary Git and no-Git fixtures; assert the delivered boot text.
- End-to-end: no browser; run relevant CLI/hook fixture suite.
- Manual: none.
- Platforms: Linux, macOS, Windows; local evidence on Windows, existing matrix gap retained.
- Environment dependency: Git on `PATH` for repository cases; missing-Git case uses an injected process fake.
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run dependencies:check`.
- Expected evidence: exact boot assertions and bundle guard result.

## Affected files

- Modify: `src/infrastructure/runtime/boot-reader.ts`, `runtime-composition.ts`, `tests/unit/runtime-bundle-imports.test.ts`, `tests/integration/boot-delivery.test.ts`.
- Create or modify only if needed: a focused runtime Git integration test; update `docs/research/harness-integrations.md` only if documented harness behavior differs.

## Observability and recovery

- Operational signal: boot text names divergences or omitted checks; runtime error log records unexpected process failure without file content.
- Recovery: revert the runtime wiring and its narrowly scoped bundle policy change.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Valid plans and checkpoints now receive a real Git comparison in boot. Invalid, missing, and completed state skips Git. An unexpected inspection exception yields an omitted-check notice and writes a metadata-only `UNEXPECTED` runtime error. The runtime bundle guard allows `node:child_process` only from the approved process runner and process-tree modules.
- Changed files: `src/infrastructure/runtime/boot-reader.ts`, `runtime-composition.ts`, `tests/unit/runtime-bundle-imports.test.ts`, `tests/helpers/built-hook.ts`, new `tests/unit/boot-reader.test.ts` and `tests/integration/boot-git-delivery.test.ts`; original `task_05.md` and `tasks.md` reconciled under the DAG owner.
- Checks: `npm run build` passed; focused boot and bundle tests passed after the logging change; `npm run lint`, `npm run typecheck`, `npm run dependencies:check`, `npm test -- --maxWorkers=4` (170 files, 953 tests before the final test addition), `npm run coverage -- --maxWorkers=4` (final code and 954 tests, passed 80% gate), and `git diff --check` passed. QA-01/04/05 blocking searches and QA-06 reservation search found no new hits; touched TypeScript files stay below 100 lines.
- Validated state: Windows 11, Node 24, worktree over `91b4e68`; built Claude Code hook exercised temporary Git and non-repository fixtures. Existing `NodeGitInspector` uses the `ProcessRunner` argument array with a 3,000 ms per-process timeout.
- Open items: Real Pi/Oh-My-Pi capture and Linux/macOS/Node 20/22 matrix remain existing feature evidence limits. CR-02/CR-03 are assigned to T11/T12; independent re-review remains pending.
