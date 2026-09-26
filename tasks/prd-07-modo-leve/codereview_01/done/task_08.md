# Stable execution context

Load in this exact order:

1. `tasks/prd-07-modo-leve/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T08 — init no modo leve não sugere criar um plano

## Outcome

An applied `init` whose resulting configuration is in light mode no longer prints `Next step: run context-brake plan init to create task plan.` Full and delegated installs print the same text as today.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope:
  - the next-step hint of `renderInstallText`;
  - how `runInit` tells it whether light mode is in effect;
  - an assertion in the `init` light-mode tests.
- Out of scope:
  - `--json` output (the hint is text only);
  - the hint in delegated mode;
  - `plan init` output.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-02 | `codereview.md#Findings` | `init --light` recommends `context-brake plan init` |
| PRD User experience | `prd.md#user-experience` | The preview says light mode does not manage the plan or checkpoint |
| FR-01, FR-02 | `prd.md#functional-requirements` | Light mode ignores and never reads the plan |

## Requirements

- When light mode is in effect for the run (`isLightModeInEffect` over the current section and the `--light`/`--no-light` flags), the applied text output has no line that mentions `plan init`.
- Outside light mode, the output is byte-identical to today's (NFR-01).
- `text.ts` (98 lines) and `init.ts` (93 lines) stay at 100 lines or fewer.

## Context to recover on demand

- Rules and skills: `code-standards.md`, `javascript-typescript.md`, `tests.md`, `cli-output.md`.
- Code:
  - `src/cli/output/text.ts:38-40`, the hint;
  - `src/cli/commands/init.ts#outputReport` and `runInit`;
  - `src/cli/init-config-updates.ts` and `src/core/services/light-mode-merge.ts#isLightModeInEffect`.
- Tests: `tests/integration/init-light-mode.test.ts`, and the existing assertions on the hint (`rg -n "plan init to create" tests`).

## Work

- [x] T08.1 Let the caller of `renderInstallText` turn the plan hint off: for example an option or parameter with a default that keeps today's behavior. `runInit` turns it off when light mode is in effect.
- [x] T08.2 In `init-light-mode.test.ts`, assert that an applied `init --light --yes` text output does not contain `plan init`. Keep an existing full-mode assertion on the hint, or add one.

## Acceptance criteria

- `init --light --yes` on a fresh fixture prints no `Next step: run context-brake plan init` line.
- A full `init --yes` still prints it, unchanged.
- The files touched stay at 100 lines or fewer, and lint and typecheck pass.

## Verification

- Unit: not applicable.
- Integration: `init-light-mode.test.ts`, plus the existing `init` text suites.
- End-to-end: not applicable.
- Manual: the report's `init --light --statusline-bridge --yes` spot check with the built CLI.
- Platforms: Windows locally; CI matrix.
- Environment dependency: none.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test` (targeted), and `npm run coverage` at the end of the round.
- Expected evidence: test counts and the spot-check output.

## Affected files

- Modify: `src/cli/output/text.ts`, `src/cli/commands/init.ts`, `tests/integration/init-light-mode.test.ts`

## Observability and recovery

- Operational signal: the `init` text output.
- Recovery: revert the change.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `renderInstallText` takes an optional `planHint` (default `true`). `runInit` passes `false` when `isLightModeInEffect(config?.lightMode, { light, noLight })` holds, so an applied light-mode `init` no longer prints `Next step: run context-brake plan init …`. Full and delegated output is unchanged. `outputReport` now takes a `{ printed, planHint }` options object, which keeps it within ESLint `max-params` 3.
- Changed files: `src/cli/output/text.ts` (98 lines), `src/cli/commands/init.ts` (95 lines), and `tests/integration/init-light-mode.test.ts` (59 lines; 2 new cases: no hint in light mode, hint kept for a full install).
- Checks:
  - `npm run build`, `npm run typecheck`, and ESLint on the touched files pass.
  - `init-light-mode`, `init-light-switch`, `e2e-01-02`, `e2e-light-mode`, `e2e-delegated-snapshot`, `init-delegated-snapshot`, and `init-arguments` pass (7 files, 39 tests).
  - Built CLI spot check: `init --light --statusline-bridge --yes` ends at the planned-changes list, with no hint.
  - Quality profile QA-01 to QA-03 have no hits.
- Validated state: worktree at `c3fb6a8` plus the feature diff and the T07 and T08 corrections, with `dist/` rebuilt, on Windows 11 with Node 24.
- Open items: none.
