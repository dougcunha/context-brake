# Stable execution context

Load in this exact order:

1. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/codereview_06/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T21 — Host-level tests guard the session-start deadline pass-through

## Outcome

`npm test` fails if either hook host stops passing its `HookDeadline` to the handoff claim: in-process host cases cover a deadline that fires before the claim and one that elapses after the commit, and a process-hook case covers a deadline that elapses after the commit.

## Dependencies and boundaries

- Depends on: T19 (`codereview_05/done/task_19.md`)
- Unblocks: re-review `codereview_07`
- In scope: a new integration test file for the hosts; correcting the harness-timeout wording of the prd-10 FR-10 / DEC-11 deviation line in `techspec.md` (codereview_06 limitation).
- Out of scope: production code changes; the optional improvements in `codereview_06/codereview.md`.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_06/CR-01 | `codereview.md#findings` | No suite guards the in-process `deadline` pass-through; the process-hook case fires before the claim |

## Requirements

- In-process host (`createInProcessRuntime`, handoff-mode config, short `deadlines.sessionStart`): deadline before the claim leaves `handoff.md` pending; deadline elapsing after the commit returns resume text naming an existing archived file.
- `runProcessHook` with a handoff-mode config: deadline elapsing after the commit writes the resume text naming an existing archived file.
- Each case fails with the host's `deadline` pass-through removed (mutation check).
- Deterministic timing: fake `setTimeout` and `clearTimeout`, advanced right after `handle` starts (before the claim) or right after the claim resolves (after the commit, before the host's race settles); no sleeps as synchronization.

## Context to recover on demand

- Rules and skills: `tests.md` (FIRST, in process, 100-line files, 30-line functions)
- Code: `src/infrastructure/runtime/{in-process-host,process-hook-host,hook-deadline}.ts`; `src/infrastructure/runtime/runtime-composition.ts:54` (the hosts' `NodeHandoffStore`)
- Tests: `tests/integration/handoff-deadline.test.ts` (fixture shape), `tests/unit/in-process-host-deadline.test.ts`

## Work

- [x] T21.1 Create `tests/integration/handoff-deadline-hosts.test.ts` with the three cases, wrapping `NodeHandoffStore.prototype.claim` to advance fake time after the claim resolves.
- [x] T21.2 Run the mutation check for each host by removing its `deadline` pass-through, then restore.
- [x] T21.3 Correct the deviation line: Claude Code and Codex document 600 s, GitHub Copilot CLI and Pi 30 s; Cursor and Oh-My-Pi document no session-start timeout.

## Acceptance criteria

- The three cases pass and each fails under its host's mutation.
- No production file changes.

## Verification

- Unit: not applicable.
- Integration: `tests/integration/handoff-deadline-hosts.test.ts`, `handoff-deadline.test.ts`.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows locally; Linux and macOS through CI.
- Environment dependency: none.
- Commands: `npx vitest run tests/integration/handoff-deadline-hosts.test.ts tests/integration/handoff-deadline.test.ts`; `npm run lint`; `npm run typecheck`; at the end of the round, `npm run build` and `npm run coverage`.
- Expected evidence: cases green, both mutation failures recorded, coverage result.

## Affected files

- Create: `tests/integration/handoff-deadline-hosts.test.ts`
- Modify: `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/techspec.md` (one deviation line)

## Observability and recovery

- Operational signal: none.
- Recovery: delete the test file.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `tests/integration/handoff-deadline-hosts.test.ts` drives both hosts with a handoff-mode config and a 40 ms session-start deadline under fake `setTimeout`/`clearTimeout`. A wrapper on `NodeHandoffStore.prototype.claim` records each claim and can advance fake time right after it resolves, which is after the commit and before the host's race settles. Cases: in-process, deadline before the claim → claim returns `null` and `handoff.md` stays; in-process, deadline after the commit → resume text naming an existing archived file; `runProcessHook`, deadline after the commit → stdout carries that resume text. The deviation line for prd-10 FR-10 / DEC-11 now states the documented timeouts per harness.
- Changed files: tests/integration/handoff-deadline-hosts.test.ts (new, 82 lines); techspec.md (one deviation line). No production file changed.
- Checks: 3 cases green. Mutation checks (vitest JSON reporter): with `deadline` removed from `in-process-host.ts:32`, both in-process cases fail; with it removed from `process-hook-host.ts:84`, the process-hook case fails; both restored. `npx eslint` over the new file and `npm run typecheck` exit 0.
- Validated state: worktree on a31e183 plus the feature diff and T10-T21; Windows 11, Node 24.
- Open items: none for CR-01.
