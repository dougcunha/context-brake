# Stable execution context

Load in this exact order:

1. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/prd.md`
2. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T03 — Claim and deliver a pending handoff once at session start

## Outcome

On a session start with reason `new` or `clear`, in handoff mode, a pending `.context-brake/handoff.md` is moved to `.context-brake/handoffs/<timestamp>.md`, the archive is pruned to 10 files, and the first context of the session carries `[ContextBrake resume v1] Read "<archived path>" and continue the previous work from it.` A later start without a new handoff injects nothing.

## Dependencies and boundaries

- Depends on: T02
- Unblocks: T05, T06, T07, T08
- In scope: `HandoffStore` port and `NodeHandoffStore`; `handleSessionReset` delivery; runtime composition wiring for process and in-process hosts.
- Out of scope: the freshness gate (T04); the ignore file (T08); doctor and remove (T09).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-02, FR-03 | `prd.md#functional-requirements` | Instruction at start; one delivery; archive of 10 |
| FR-08 | `prd.md#functional-requirements` | Session-start resume on semi-automatic harnesses |
| NFR-02, NFR-04, NFR-05 | `prd.md#non-functional-requirements` | Platforms; privacy; off means nothing |
| DEC-02, DEC-03 | `techspec.md#technical-decisions` | Claim semantics, single deliverer, `compact` excluded |
| CMP-03, CMP-04 | `techspec.md#components-and-flow` | Files |
| TC-02, TC-03, TC-10 | `techspec.md#test-approach` | Tests |

## Context to recover on demand

- Applicable rules: `node.md`, `harness-adapters.md` (failure policy), `tests.md`.
- Existing code: `src/core/services/session-reset-handler.ts:17-27`; `brake-engine.ts` options; runtime composition (`composeRuntime`, `src/infrastructure/runtime/process-hook-host.ts`, `in-process-host.ts`, `harnesses/common/in-process-support.ts:20`); `runtime-paths.ts` for root resolution.
- Contract: TechSpec "Contracts and data", handoff files and resume text.

## Work

- [x] T03.1 Add `src/core/contracts/handoff.ts` (`HandoffReader`, `HandoffStore extends HandoffReader`, `HANDOFF_ARCHIVE_LIMIT`, relative paths).
- [x] T03.2 Add `src/infrastructure/storage/node-handoff-store.ts` with async rename, clash suffix, prune by name order, `ENOENT` → `null`; integration tests TC-03 on a temp dir.
- [x] T03.3 Extend `handleSessionReset` per DEC-03 and add the resume text builder to `zone-guidance.ts`; unit tests TC-02 with a fake store and an injected clock.
- [x] T03.4 Wire the store into the brake engine for process and in-process runtimes; failures follow the failure policy and leave the handoff pending.
- [x] T03.5 Integration TC-10 for Codex, Cursor, and Copilot fixtures: start after a pending handoff carries the instruction once.

## Acceptance criteria

- TC-02, TC-03, TC-10 pass on Windows locally.
- Two concurrent claims produce one delivery.
- With restart off, a present `handoff.md` is not touched and nothing is injected.

## Verification

- Unit: `tests/unit/session-reset-handler.test.ts`.
- Integration: `tests/integration/node-handoff-store.test.ts`, `tests/integration/semi-auto-restart.test.ts` (process harness fixtures, in process via `runHookInProcess`).
- End-to-end: existing `e2e-hook-round-trips` stays green.
- Manual: not applicable.
- Platforms: all through CI; rename semantics checked on Windows locally.
- Commands: `npm run lint`, `npm run typecheck`, touched suites by path.
- Environment dependency: none.
- Expected evidence: passing suites; QA-06 clean on in-process wiring.

## Affected files

- Modify: `src/core/services/session-reset-handler.ts`, `zone-guidance.ts`, `brake-engine.ts`; runtime composition files.
- Create: `src/core/contracts/handoff.ts`, `src/infrastructure/storage/node-handoff-store.ts`, `tests/unit/session-reset-handler.test.ts` cases, `tests/integration/node-handoff-store.test.ts`, `tests/integration/semi-auto-restart.test.ts`.

## Observability and recovery

- Operational signal: archived files; `errors.jsonl` on claim failure.
- Recovery: an archived handoff can be moved back to `handoff.md` by hand.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `HandoffReader`/`HandoffStore` ports; `NodeHandoffStore` (async `node:fs/promises` only) claims `.context-brake/handoff.md` by reserving an archive name with exclusive create (`wx`) and renaming onto it, prunes the archive to 10 by name order, and returns the relative `/` path; `handleSessionReset` claims and injects `[ContextBrake resume v1] Read "<archived>" and continue the previous work from it.` on `new`/`clear` in handoff mode on `session_boot` harnesses; never on `compact`, with restart off, or in snapshot mode. Wired once in `composeRuntime`, so process hooks and the Pi/Oh-My-Pi in-process hosts both get it.
- Changed files: `src/core/contracts/handoff.ts` (new), `src/infrastructure/storage/node-handoff-store.ts` (new), `src/core/services/session-reset-handler.ts`, `src/core/services/zone-guidance.ts` (`handoffResumeText`), `src/core/services/brake-engine.ts` (option), `src/infrastructure/runtime/runtime-composition.ts`; tests `tests/unit/session-reset-handler.test.ts`, `tests/integration/node-handoff-store.test.ts`, `tests/integration/semi-auto-restart.test.ts` (all new).
- Checks: `npm run typecheck` ok; `npx eslint .` "No issues found"; `npm run build` ok; T03 suites 19 passed (store test 5/5 on five consecutive runs after the race fix); regression suites (brake-engine, light/debug lifecycle, runtime in-process/host-process/codex, runtime-pi/omp) 38 passed. Quality profile QA-01..QA-10 over the diff: no hits.
- Validated state: Windows 11, Node 24.19.0, base a31e183 plus T01-T03 diff.
- Open items: deviation from DEC-02 signature: `claim()` takes no date; the store gets a `Clock` in its constructor so `core` stays clock-free (QA-08). Found and fixed during the task: on Windows two concurrent claims aiming at the same archive name could both report success; the exclusive reservation removes it. Oh-My-Pi delivery after `/new` depends on DEC-20 (`session_switch` mapping) in T06. An interrupted claim can leave an empty reserved file in the archive; it is pruned like any other entry.

### ADR candidates

None - direct TechSpec implementation or local decision.
