# Stable execution context

Load in this exact order:

1. `tasks/prd-12-refatoracao-modo-leve-modo-unico/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T08 — Delete the deny-only tool path normalizer

## Outcome

`src/infrastructure/runtime/tool-path-normalizer.ts` is gone. Process hooks pass the adapter's mapped event straight to the engine, with no `realpath` work on tool paths. No test exercises the normalizer.

## Dependencies and boundaries

- Depends on: —
- Unblocks: re-review of codereview_01
- In scope:
  - delete `src/infrastructure/runtime/tool-path-normalizer.ts`;
  - delete `tests/unit/tool-path-normalizer.test.ts`;
  - in `process-hook-host.ts:dispatchHook`, use `input.adapter.mapEvent(input.eventName, payload)` directly and drop the import;
  - remove the normalizer from `tests/integration/runtime-light-mode.test.ts`.
- Out of scope:
  - reducing the `ToolCall` members (`category`, `paths`, `command`, `skill`) and the adapters' `toolOf` (codereview_01 OI-02, a separate decision for prd-14);
  - the `task_plan.json` fixture in `runtime-overhead` (OI-01).

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-01 | `codereview.md#Findings` | Deny-only `tool-path-normalizer.ts` survives the TechSpec delete list and runs on every path-bearing process hook |
| T04 | `done/task_04.md#Dependencies and boundaries` | Delete list item "if it is orphaned" left incomplete |
| DEC-07, NFR-03, NFR-04 | `techspec.md#Technical decisions`; `prd.md#Non-functional requirements` | No deny-shaped code; removed-feature tests deleted; no avoidable hook overhead |

## Requirements

- No module under `src/` imports or defines `normalizeEventToolPaths` or `normalizeToolPath`.
- `dispatchHook` keeps its phases and deadline marks; only the normalization call goes.
- Hook behavior is unchanged for every event: the engine reads only `toolUseId` from `event.tool`.

## Context to recover on demand

- TechSpec: `techspec.md#Relevant files` (Delete list for `src/infrastructure/runtime/`).
- Rules: `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `harness-adapters.md`.
- Code: `src/infrastructure/runtime/process-hook-host.ts:7,74`; `src/core/services/brake-engine.ts:handlePostTool`; `tests/integration/runtime-light-mode.test.ts:10,33`.

## Work

- [x] T08.1 Delete the normalizer and its unit test; call `mapEvent` directly in `dispatchHook`.
- [x] T08.2 Remove the normalizer from `runtime-light-mode.test.ts`; check `tests/test-lanes.ts` lists no deleted file.

## Acceptance criteria

- `rg -n "tool-path-normalizer|normalizeEventToolPaths|normalizeToolPath" src tests scripts` returns nothing.
- The touched suites, lint, and typecheck pass.

## Verification

- Unit: `tests/unit/process-hook-host.test.ts`, `tests/unit/test-lanes.test.ts`.
- Integration: `tests/integration/runtime-light-mode.test.ts`, `tests/integration/runtime-overhead.test.ts`.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows (local).
- Environment dependency: none.
- Commands: `npx vitest run <the suites above>` (DEC-PROC-02: touched suites only), `npm run lint`, `npm run typecheck`.
- Expected evidence: empty `rg`, passing suites, clean lint and typecheck.

## Affected files

- Modify: `src/infrastructure/runtime/process-hook-host.ts`, `tests/integration/runtime-light-mode.test.ts`
- Delete: `src/infrastructure/runtime/tool-path-normalizer.ts`, `tests/unit/tool-path-normalizer.test.ts`

## Observability and recovery

- Operational signal: none new.
- Recovery: restore the two files and the call from the base commit.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result (CR-01, DEC-07, NFR-03, NFR-04): `tool-path-normalizer.ts` and its unit test are deleted. `process-hook-host.ts:dispatchHook` passes `input.adapter.mapEvent(...)` straight on, so path-bearing post-tool hooks no longer run `realpath`. `runtime-light-mode.test.ts` maps the event directly. `tests/test-lanes.ts` never listed the deleted test.
- Changed files: deleted `src/infrastructure/runtime/tool-path-normalizer.ts`, `tests/unit/tool-path-normalizer.test.ts`; modified `src/infrastructure/runtime/process-hook-host.ts`, `tests/integration/runtime-light-mode.test.ts`.
- Checks:
  - `rg -n "tool-path-normalizer|normalizeEventToolPaths|normalizeToolPath" src tests scripts` returns nothing.
  - `npm run build` passes.
  - `npx vitest run` over `process-hook-host`, `test-lanes`, `runtime-light-mode`, `runtime-overhead`: 4 files, 22 tests pass. Over `runtime-host-process`, `runtime-failure-policy`, `runtime-codex`, `runtime-cursor`, `runtime-copilot`, `runtime-antigravity`: 6 files, 18 tests pass.
  - `rtk proxy npx eslint` on the touched files is clean; `npm run typecheck` is clean.
  - Quality profile over the touched files: a deletion and a one-line call change, no new hit.
- Validated state: base `1474f54` plus the uncommitted T01-T07 diff and this correction; Windows 11, Git Bash.
- Open items: none. OI-01 and OI-02 of codereview_01 stay out of scope as the task states.
