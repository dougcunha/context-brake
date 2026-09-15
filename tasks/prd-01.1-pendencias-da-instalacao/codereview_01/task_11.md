# Stable execution context

Load in this exact order:

1. `tasks/prd-01.1-pendencias-da-instalacao/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T11 — Support Node 20.0–20.11 compatibility in runtime state file listing

## Outcome

`listRuntimeStateFiles` correctly discovers runtime state files on Node versions older than 20.12.0 (down to the declared `engines.node: ">=20"` floor) without throwing `TypeError` when `entry.parentPath` is undefined.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: In `src/infrastructure/storage/runtime-state-files.ts`, fall back from `entry.parentPath` to `(entry as { path?: string }).path ?? runtimeDir` when `parentPath` is not present, without using `any` or `@ts-ignore`. Update unit tests in `tests/unit/runtime-state-files.test.ts` to assert that fallback resolution works when `parentPath` is undefined.
- Out of scope: Changes to `package.json` engines (retaining declared `>=20` engine support).

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-02 | `codereview.md#findings` | `entry.parentPath` in `src/infrastructure/storage/runtime-state-files.ts:12` is undefined on Node 20.0–20.11, breaking runtime state listing on supported Node versions |

## Requirements

- Maintain full compatibility with `engines.node: ">=20"` per `package.json` and FR-09 / NFR-03.
- Do not violate QA-01 (`any`) or QA-02 (`@ts-ignore` / `eslint-disable`).

## Context to recover on demand

- TechSpec: `technical-decisions#DEC-04`
- Rules and skills: `.agents/rules/javascript-typescript.md`, `.agents/rules/node.md`
- Code: `src/infrastructure/storage/runtime-state-files.ts:12`, `tests/unit/runtime-state-files.test.ts`

## Work

- [x] T11.1 Update `src/infrastructure/storage/runtime-state-files.ts` to safely derive directory paths using `entry.parentPath ?? (entry as { path?: string }).path ?? runtimeDir`.
- [x] T11.2 Add a unit test in `tests/unit/runtime-state-files.test.ts` validating fallback path resolution when `parentPath` is undefined.

## Acceptance criteria

- Path resolution in `listRuntimeStateFiles` functions correctly whether `entry.parentPath` or `entry.path` is provided by the Node runtime.
- Unit and integration tests for runtime state files pass.
- QA-01 and QA-02 rules are respected (no `any`, no suppressions).

## Verification

- Unit: `npx vitest run tests/unit/runtime-state-files.test.ts` passes with fallback path scenario.
- Integration: `npx vitest run tests/integration/runtime-state-removal.test.ts` passes.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Linux, macOS, Windows.
- Environment dependency: none.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npx vitest run tests/unit/runtime-state-files.test.ts`
- Expected evidence: All unit and integration suites pass, 0 lint/typecheck errors.

## Affected files

- Modify: `src/infrastructure/storage/runtime-state-files.ts`, `tests/unit/runtime-state-files.test.ts`

## Observability and recovery

- Operational signal: `listRuntimeStateFiles` returns expected relative paths.
- Recovery: Revert modified files with git.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Supported Node 20.0–20.11 by falling back from `entry.parentPath` to `entry.path ?? runtimeDir` in `listRuntimeStateFiles`, with dependency-injected `readdirFn` covering fallback unit tests without module mutation. Resolves CR-02.
- Changed files: `src/infrastructure/storage/runtime-state-files.ts`, `tests/unit/runtime-state-files.test.ts`.
- Checks: `npm run typecheck` (exactOptionalPropertyTypes verified), `npm run lint` (0 issues), `npx vitest run tests/unit/runtime-state-files.test.ts` (3/3 pass).
- Validated state: Node 20+ backwards-compatible dirent resolution; 0 QA-01/QA-02 violations.
- Open items: None.
