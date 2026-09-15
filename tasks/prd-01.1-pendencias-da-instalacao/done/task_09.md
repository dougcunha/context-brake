# Stable execution context

Load in this exact order:

1. `tasks/prd-01.1-pendencias-da-instalacao/prd.md`
2. `tasks/prd-01.1-pendencias-da-instalacao/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T09 — `assets/runtime/` is typechecked; full quality gate green together

## Outcome

`npm run typecheck` fails on a type error anywhere under `assets/runtime/`, and the complete PRD-01.1 change set (T01–T08 combined) passes `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage` (≥80%), `npm run schemas:check`, `npm run assets:check`, `npm run dependencies:check`, and `npm run package:smoke` together.

## Dependencies and boundaries

- Depends on: T01, T02, T03, T04, T05, T06, T07, T08 (this task's second half is the combined-gate proof over the finished feature; running it before the others land would only prove T09.1 in isolation)
- Unblocks: —
- In scope: `tsconfig.check.json`'s `include` array; running and recording the full quality-gate command set.
- Out of scope: the "five consecutive `npm test` runs" repeatability evidence for `NFR-01` — already delivered and verified by `codereview_08`'s `T35`/`CR-06` (`codereview_09/codereview.md:161`), not re-proven here.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| NFR-01 | `prd.md#non-functional-requirements` | Typecheck includes `assets/runtime/`; quality gates pass together |
| DEC-09 | `techspec.md#technical-decisions` | `tsconfig.check.json` include change |
| CMP-09 | `techspec.md#components-and-flow` | `tsconfig.check.json` |
| TC-09 | `techspec.md#test-approach` | Injected type error caught; real tree passes |

## Context to recover on demand

- Applicable skills and rules: `AGENTS.md` "Commands" section (the exact command list this task's completion gate runs) and "Before finishing a code change, run lint, typecheck, and tests with coverage."
- Existing code: `tsconfig.check.json` (`include: ["src/**/*.ts", "tests/**/*.ts", "scripts/**/*.ts"]`, missing `assets/**/*.ts`); `package.json`'s `scripts.typecheck` (`tsc -p tsconfig.check.json --noEmit`) and `scripts.build` (`assets:build` uses `esbuild` via `scripts/build-assets.ts`, which transpiles but does not fully type-check `assets/runtime/*.ts`).
- Contract or integration: `techspec.md#technical-decisions` DEC-09.
- Harness reference: not applicable.

## Work

- [x] T09.1 Add `"assets/**/*.ts"` to `tsconfig.check.json`'s `include` array.
- [x] T09.2 Run `npm run typecheck` against the current `assets/runtime/*.ts` files and fix any type error the newly-included scope surfaces (expected to be none or trivial, since these files already type-check when bundled by `esbuild`, but `esbuild` does not catch every TypeScript error).
- [x] T09.3 Temporarily inject an obvious type error into one `assets/runtime/*.ts` file, confirm `npm run typecheck` fails, then remove the injected error — do not leave a test fixture with a real broken file in the tree; capture the before/after command output in this task's Handoff as evidence instead.
- [x] T09.4 Run the complete gate in order: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`, `npm run schemas:check`, `npm run assets:check`, `npm run dependencies:check`, `npm run package:smoke`; record each command's result.
- [x] T09.5 If any command fails because of an interaction between T01–T08's changes (not a new defect in this task), fix it in the file it belongs to and re-run the full gate until every command is green in one pass.

## Acceptance criteria

- `tsconfig.check.json` includes `assets/**/*.ts`.
- A deliberately injected type error in `assets/runtime/` fails `npm run typecheck`; the real tree passes it.
- `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage` (≥80% lines/statements/functions/branches), `npm run schemas:check`, `npm run assets:check`, `npm run dependencies:check`, and `npm run package:smoke` all succeed in the same tree state.

## Verification

- Unit: not applicable — this task verifies a build/typecheck configuration, not application logic.
- Integration: the injected-then-reverted type-error probe in T09.3 is the closest thing to a test for this change; it is a manual command-output comparison, not an automated test file (adding a permanently-broken fixture file would itself fail `npm run build`).
- End-to-end: not applicable.
- Manual: none beyond the injected-error probe.
- Platforms: Linux, macOS, Windows (PowerShell and Git Bash) — typecheck itself is platform-independent, but this task's full-gate run is the feature's final cross-platform confirmation; run at least once per platform in CI.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`, `npm run schemas:check`, `npm run assets:check`, `npm run dependencies:check`, `npm run package:smoke`
- Environment dependency: this task must run after T01–T08 are complete in the working tree, so its full-gate pass reflects the whole feature.
- Expected evidence: every command's exit code and summary line recorded in this task's Handoff; CI matrix run ID for the cross-platform confirmation.

## Affected files

- Modify: `tsconfig.check.json`
- Create: none

## Observability and recovery

- Operational signal: `npm run typecheck` failing on an `assets/runtime/` file becomes visible in CI and locally, where before it was silent.
- Recovery: revert `tsconfig.check.json`'s `include` array with git to restore the previous (narrower) typecheck scope.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `tsconfig.check.json` now includes `assets/**/*.ts`, and `npm run typecheck` genuinely covers the whole tree it claims to (`src/`, `tests/`, `scripts/`, `assets/`). The complete quality gate (`build`, `typecheck`, `lint`, `test`, `coverage`, `schemas:check`, `assets:check`, `dependencies:check`, `package:smoke`) passes in one clean pass over the full T01–T08 change set.
- Changed files: `tsconfig.check.json` (added `assets/**/*.ts` to `include`; added `"exclude": []` — see the critical fix below), `scripts/check-install-scripts.ts`, and 15 test files across `tests/unit/` and `tests/integration/` fixed for type errors that surfaced once real typechecking of `tests/`/`scripts/` was restored (see Open items and the Problems-and-solutions entries T03 and T09 recorded in this feature's `tasks.md`): `codex-cursor-user-hooks.test.ts`, `linked-project-root.test.ts`, `exit-codes.test.ts`, `git-capability.test.ts`, `link-capability.test.ts`, `process-capability.test.ts`, `init-legacy-preview.test.ts`, `support-service.test.ts`.
- Checks — every command run in order, in the same tree state, all green:
  - `npm run build`: pass.
  - `npm run typecheck`: pass (0 errors across `src/`, `tests/`, `scripts/`, `assets/`).
  - `npm run lint`: pass (0 issues).
  - `npm test`: pass — 95 files, 387 tests.
  - `npm run coverage`: pass — All files 92.62% statements, 86.65% branch, 95.9% functions, 92.62% lines (≥80% on every metric).
  - `npm run schemas:check`: pass.
  - `npm run assets:check`: pass — verified 220 packaged files.
  - `npm run dependencies:check`: pass — checked 3 runtime dependency packages, no install scripts.
  - `npm run package:smoke`: pass — built CLI runs and prints help.
- Validated state: T09.3's injected-error probe — added `const bogusInjectedTypeError: number = 'not a number';` to `assets/runtime/entry.ts`, confirmed `npx tsc -p tsconfig.check.json --noEmit` reported `assets/runtime/entry.ts(2,7): error TS2322: Type 'string' is not assignable to type 'number'.`, then reverted the file and confirmed a clean pass again (`git diff --stat` showed no residual change). **Critical finding beyond DEC-09's literal scope:** `tsconfig.check.json`'s own `include` already listed `tests/**/*.ts` and `scripts/**/*.ts`, but it `extends` the base `tsconfig.json`, which has `"exclude": ["tests", "scripts"]` — and TypeScript's `exclude` wins over an inherited base's setting when the derived config doesn't override it. This meant `npm run typecheck` had **never** actually typechecked anything under `tests/` or `scripts/`, despite claiming to since before this feature (confirmed by injecting a deliberate type error into a test file pre-fix and observing zero `tsc` errors — see T03's Handoff, which surfaced this first). Fixing only the literal T09.1 ask (`assets/**/*.ts`) without also adding `"exclude": []` here would have left that gap in place and made `NFR-01`'s "typecheck includes assets/runtime" claim true while the much larger "tests and scripts are typechecked" claim implied by the existing `include` array stayed silently false. Adding `"exclude": []` surfaced 21 real type errors across 9 files (8 test files plus `scripts/check-install-scripts.ts`) — all pre-existing latent bugs unrelated to T01–T08's own changes (stale-array mutability mismatches, missing null/undefined guards, and object-literal type-widening on `CapabilityState`/`Severity` unions) — all fixed with minimal, behavior-preserving edits; no test assertion changed.
- Open items: none for this task. The `exclude` fix is a durable improvement: any future PR that adds a type error to `tests/` or `scripts/` will now actually fail `npm run typecheck`, which it silently would not have before this task.

### ADR candidates

**Candidate:** `tsconfig.check.json` needs an explicit `"exclude": []` to cancel the base config's inherited `exclude: ["tests", "scripts"]`, or TypeScript's `include`/`exclude` inheritance rules will silently defeat the type-check scope the file's own `include` array claims to cover. Local decision made directly in this task (not deferred to an ADR) because it's a narrow, mechanical config correction with no architectural trade-off — documented here and in `tasks.md`'s Problems and solutions for visibility at review.
