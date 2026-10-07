# Stable execution context

Load in this exact order:

1. `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/prd.md`
2. `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T04 — Doctor smoke, hook round trips, scenarios in process

## Outcome

`tests/e2e/e2e-doctor.test.ts` runs the built `doctor` with the real measurer and validates its schema. `tests/e2e/e2e-hook-round-trips.test.ts` holds one round trip per harness: five built process hooks and three built in-process plugins. The doctor, mode, and hook scenarios of the mapping run in process. `tests/e2e/` holds only the four smoke files and their helpers.

## Dependencies and boundaries

- Depends on: T02, T03
- Unblocks: T05
- In scope: the mapping rows for the doctor schema part of `e2e-07-08`, `e2e-antigravity-registration`, `e2e-asset-currency`, `e2e-brake`, `e2e-codex-hook-root`, `e2e-debug-mode`, `e2e-light-mode`, `e2e-simulated-usage`, `e2e-statusline-bridge`, `e2e-statusline-shell` (moved to `tests/integration/statusline-shell.test.ts`), and `e2e-support-limitations`; the TC-05 assertion on the e2e folder.
- Out of scope: lane lists and the `runtime-*` conversion (T05).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-04, NFR-03, NFR-04 | `prd.md` | Smoke set; mapped scenarios; shell coverage |
| DEC-02, DEC-03 | `techspec.md#technical-decisions` | Real measurer in the smoke; mapping |
| TC-05, TC-09, TC-10 | `techspec.md#test-approach` | E2E folder; built doctor; mapping rows |

## Context to recover on demand

- Applicable skills and rules: `tests.md`, `code-standards.md`, `javascript-typescript.md`, `node.md`; quality profile QA-01 to QA-07 and the Terrain baseline in `techspec.md#quality-profile`, `harness-adapters.md`
- Existing code: `tests/helpers/built-hook.ts`; `src/infrastructure/runtime/process-hook-host.ts:runProcessHook`; `tests/integration/runtime-light-mode.test.ts` (in-process plugin load); the e2e files in scope.
- Harness reference: payload fixtures in `tests/fixtures/harnesses/`.

## Work

- [x] T04.1 Write `e2e-doctor` (real measurer, `sampleCount > 0`, schema) and `e2e-hook-round-trips` (eight harnesses).
- [x] T04.2 Move each in-scope scenario to its in-process destination, keeping its assertions, then delete its e2e file.
- [x] T04.3 Move `e2e-statusline-shell` to `tests/integration/statusline-shell.test.ts` and assert the e2e folder content (TC-05).

## Acceptance criteria

- `tests/e2e/` holds `e2e-init`, `e2e-doctor`, `e2e-remove`, and `e2e-hook-round-trips` plus their helpers.
- Every in-scope mapping row has a passing test at its destination, listed in the handoff with the final file.

## Verification

- Unit: `tests/unit/test-lanes.test.ts` (TC-05).
- Integration: the destination suites.
- End-to-end: `e2e-doctor` and `e2e-hook-round-trips` against `dist/`.
- Manual: none.
- Platforms: Windows, PowerShell and Git Bash through the shell suites.
- Commands: `npm run build`, `npx vitest run <touched suites>`, `npm run lint`, `npm run typecheck`.
- Environment dependency: none.
- Expected evidence: the mapping rows with final files and passing suites.

## Affected files

- Create: `tests/e2e/e2e-doctor.test.ts`, `tests/e2e/e2e-hook-round-trips.test.ts`, `tests/integration/statusline-shell.test.ts`, and the in-process destinations named in the mapping
- Modify: existing destination suites, `tests/unit/test-lanes.test.ts`
- Delete: the in-scope e2e files

## Observability and recovery

- Operational signal: none beyond the test output.
- Recovery: restore the deleted e2e files from Git.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result (FR-04, NFR-03, NFR-04, DEC-02, DEC-03):
  - **Smoke files.** `tests/e2e/e2e-doctor.test.ts` runs the built CLI with the real measurer: the report passes `doctorReportSchema`, has no error finding, and claude-code shows `overhead.sampleCount > 0` (TC-09, built half).
  - `tests/e2e/e2e-hook-round-trips.test.ts` runs the five built process hooks (claude-code, codex-cli, cursor, github-copilot-cli, antigravity-cli) with their documented `post-tool-use.json` fixtures. Each must exit 0, write no stderr, and write a `tool` ledger line.
  - **Deviation from DEC-03:** the three built in-process plugins (OpenCode, Pi, Oh-My-Pi) keep their round trip in `tests/integration/runtime-in-process.test.ts`. That file already imports `dist/assets/runtime/{opencode-plugin,pi-extension,omp-extension}.js` and starts no process, so duplicating it in e2e would add nothing.
  - **In-process hook host.** `tests/helpers/in-process-hook.ts:runHookInProcess` runs a harness's `ProcessHarnessAdapter` through `runProcessHook`, with an in-memory context and `resolveProjectRoot` fixed to the test root. `tests/helpers/environment-overrides.ts` sets and restores env vars, shared with `runInProcessCli`.
  - The harness simulator's `process-driver.ts` now drives `init` and hooks in process, which moves `e2e-brake` and `e2e-simulated-usage` with no change to their assertions.
  - **Moved scenarios** (`git mv`, assertions kept):

    | Mapping row | Final file |
    | --- | --- |
    | `e2e-07-08` doctor schema | in process in `tests/integration/init-remove-footprint.test.ts` (T03); built in `tests/e2e/e2e-doctor.test.ts` |
    | `e2e-antigravity-registration` | `tests/integration/antigravity-lifecycle.test.ts`; hook in `e2e-hook-round-trips` |
    | `e2e-asset-currency` | `tests/integration/asset-currency-lifecycle.test.ts` |
    | `e2e-brake` | `tests/integration/brake-lifecycle.test.ts` (in process through the simulator) |
    | `e2e-codex-hook-root` | `tests/integration/codex-hook-root.test.ts`: the CLI runs in process, and the registered command still runs through `cmd.exe`/`sh` from a subdirectory (process, shell quoting) |
    | `e2e-debug-mode` | `tests/integration/debug-mode-lifecycle.test.ts` (`runHookInProcess`) |
    | `e2e-light-mode` | `tests/integration/light-mode-lifecycle.test.ts` (`runHookInProcess`) |
    | `e2e-simulated-usage` | `tests/integration/simulated-usage.test.ts` |
    | `e2e-statusline-bridge` | `tests/integration/statusline-bridge-lifecycle.test.ts`: the CLI and doctor run in process, and the built bridge pipeline stays a process (shell) |
    | `e2e-statusline-shell` | `tests/integration/statusline-shell.test.ts` (process, shell quoting) |
    | `e2e-support-limitations` | `tests/integration/support-limitations.test.ts` |

  - **DEC-04 list additions.** `codex-hook-root` and `statusline-bridge-lifecycle` join `PROCESS_LANE_FILES` next to `statusline-shell`. They keep only their shell or bridge process, for the same reasons as `codex-hook-command-shells` and `statusline-bridge` in the TechSpec list. T05 records the final list.
  - TC-05: `tests/unit/e2e-smoke-set.test.ts` asserts that `tests/e2e/` holds exactly the four smoke files.
- Changed files:
  - created `tests/e2e/e2e-doctor.test.ts`, `tests/e2e/e2e-hook-round-trips.test.ts`, `tests/helpers/in-process-hook.ts`, `tests/helpers/environment-overrides.ts`, `tests/unit/e2e-smoke-set.test.ts`;
  - moved the 10 files above;
  - modified `tests/support/harness-simulator/process-driver.ts`, `tests/helpers/in-process-cli.ts`, `tests/test-lanes.ts`.
- Checks (Windows 11, Git Bash, after `npm run build`):
  - The 10 moved suites pass: 39 tests. Brake runs in 1.6 s (9.8 s before), light mode in 4.5 s (25.4 s), debug in 1.6 s (15.1 s), support limitations in 0.8 s (18.0 s). `statusline-shell` still takes 18 s, because it is a shell process suite.
  - `tests/e2e/`: 4 files, 8 tests pass. The doctor smoke takes 6.4 s with the real measurer.
  - `test-lanes`, `e2e-smoke-set`, and `bench-config`: 10 tests pass.
  - `rtk proxy npx eslint .` is clean after turning an arrow const into a nested function in `process-driver`. `npm run typecheck` is clean.
  - Quality profile over the new helpers and smoke files: no `any`, no disable comments, no empty catch. All files are under 100 lines.
- Validated state: base `cca3a29` plus T01-T04 and T06.
- Open items:
  - The in-process plugin round trips live in `runtime-in-process.test.ts`, not in `tests/e2e/`. That is the deviation above, for the reviewer.

### ADR candidates

None - direct TechSpec implementation or local decision.
