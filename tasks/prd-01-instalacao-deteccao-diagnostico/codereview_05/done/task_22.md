# Stable execution context

Load in this exact order:

1. `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_05/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T22 — Remove the added comments from the link-capability test helper

## Outcome

`tests/helpers/link-capability.ts` follows the project's no-comment rule: its behavior is expressed by names and small functions only, with identical runtime behavior.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T16
- In scope: deleting the JSDoc comments at `tests/helpers/link-capability.ts:7` and `:32`.
- Out of scope: any change to exported names, signatures, or behavior of the helper; the policy unit test (T17); E2E-10 and IT-05 routing (T20); pre-existing comments elsewhere, which `codereview_05/CR-06` does not cover.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_05/CR-06 | `codereview.md#findings` | T14 added JSDoc comments at `tests/helpers/link-capability.ts:7` and `:32`; line 32 restates `requireLink`, and the reason on line 7 is already carried by `ciRequiresLinks`. `code-standards.md` forbids comments that code can express. |

## Requirements

- Delete both comment lines and nothing else.
- Keep every export (`LinkKind`, `LinkAttempt`, `LinkPolicy`, `ciRequiresLinks`, `linkPolicy`, `attemptLink`, `linkExists`, `requireLink`) and its behavior unchanged.
- The helper still passes lint and typecheck, and every suite importing it stays green.

## Context to recover on demand

- TechSpec: not applicable.
- Rules and skills: `.agents/rules/code-standards.md` (Do Not Add Comments), `sdd-execute-corrections`.
- Code: `tests/helpers/link-capability.ts:7,32` — comments to remove.

## Work

- [x] T22.1 Delete the two JSDoc comment lines.
- [x] T22.2 Run lint, typecheck, tests, and coverage.

## Acceptance criteria

- `tests/helpers/link-capability.ts` contains no comment lines.
- The diff removes exactly two lines.
- Lint, typecheck, tests, and coverage pass.

## Verification

- Unit: `tests/unit/link-capability.test.ts` stays green.
- Integration: the link suites importing the helper stay green in `npm test`.
- End-to-end: the linked-root and symlinked-harness E2E suites stay green in `npm test`.
- Manual: not applicable.
- Platforms: Windows local; the full matrix is T16.
- Environment dependency: none.
- Commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`.
- Expected evidence: a two-line deletion diff and all gates green.

## Affected files

- Modify: `tests/helpers/link-capability.ts`
- Create: —

## Observability and recovery

- Operational signal: not applicable.
- Recovery: restore the two comment lines.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Implemented. The two JSDoc comments that preceded `ciRequiresLinks` and `requireLink` were removed; no export, signature, or behavior changed.
- Changed files: `tests/helpers/link-capability.ts`.
- Checks (Windows, same worktree state as T17–T21):
  - `git diff --numstat`: 0 insertions, 2 deletions; `grep` finds no comment lines left in the file.
  - `npm run lint`: passed. `npm run typecheck`: passed.
  - Helper importers green: `tests/unit/link-capability.test.ts` 7/7 with `CI` unset, `false`, and `true`; E2E-10 and IT-05 7/7 with `CI` unset and `true`.
  - Three full `npx vitest run --reporter=verbose` runs: run 1 had 217/218 passed. Its only failure was `tests/e2e/e2e-linked-project-root.test.ts`, "Test timed out in 30000ms" at 33,017 ms, a pre-existing load-dependent doctor-benchmark timeout that this change does not touch (recorded in T19). Runs 2 and 3 passed 218/218.
  - `npm run coverage`: 218/218 passed; 91.34% statements, 82.82% branches, 96.15% functions, 91.34% lines.
- Validated state: uncommitted worktree on top of commit `8401e7f` with T17–T22 applied; Windows 11, Node v24.19.0, npm 11.17.0.
- Open items: none for T22.
