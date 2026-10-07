# Stable execution context

Load in this exact order:

1. `tasks/prd-12-refatoracao-modo-leve-modo-unico/prd.md`
2. `tasks/prd-12-refatoracao-modo-leve-modo-unico/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T05 — Remove pre-tool hooks and deny capabilities

## Outcome

No harness integration installs or handles a pre-tool hook, and the `pre_tool` runtime event no longer exists. Capability profiles carry four IDs: `post_tool_telemetry`, `session_boot`, `context_usage`, and `auto_restart`. Every harness reports `full` or `partial` support.

## Dependencies and boundaries

- Depends on: T04, and the HIL 2 decision on DEC-07 (the FR-07 criterion amendment).
- Unblocks: T07
- In scope (DEC-07, DEC-08):
  - **Remove the pre-tool registrations:**
    - `claude-hooks-config.ts:4` and Claude `planner.ts:20`;
    - `codex-hooks-updater.ts:5` and Codex `planner.ts:32`;
    - `cursor-hooks-updater.ts:5,11`, including `failClosed`, and Cursor `planner.ts:16`;
    - Copilot `planner.ts:24,35`;
    - `antigravity-hooks-updater.ts:12` and Antigravity `planner.ts:17`;
    - OpenCode `tool.execute.before` (`runtime.ts:24,81`);
    - Pi and Oh-My-Pi `tool_call` (`runtime.ts:83`, `events.ts:41`).
  - **Remove the payload and response schemas:**
    - `*PreToolUsePayloadSchema`;
    - `claudePreToolUseResponseSchema`;
    - the pre-tool mapping in every `runtime.ts`, including Claude's transcript read for PreToolUse (`runtime.ts:53-57`).
  - **Remove `pre_tool` from `RuntimeEvent`.** An unmapped event returns neutral.
  - **Switch the doctor integration check** for Claude Code to the PostToolUse group (`adapter.ts:56-57`).
  - **Use a post-tool event in the benchmark fixtures** of each adapter (`adapter.ts:65-87`).
  - **Capabilities and support level:**
    - `CAPABILITY_IDS` drops `pre_tool_block`, `tool_coverage`, and `timeout_fail_closed`.
    - `SUPPORT_LEVELS` becomes `['full', 'partial']`.
    - `support-service.ts` computes the support level from `post_tool_telemetry` and `session_boot`, and moves the floor limitation to `post_tool_telemetry`.
    - Every `capabilities.ts` is updated.
    - The report schemas are regenerated.
  - **Tests and fixtures:**
    - Delete the pre-tool fixtures (`pre-tool-use*.json`, `tool-execute-before.json`, `tool-call.json`).
    - Strip the PreToolUse entries from the codex, cursor, and antigravity legacy and user-hook fixtures.
    - Rewrite the registration, schema, adapter, planner, support, and README support-table tests.
- Out of scope:
  - Cleaning stale PreToolUse entries from existing installs. There is no compatibility code (DEC-PD-03); T07 cleans this repository by hand.
  - Renaming `session_boot`.
- Fallback, if the user refuses DEC-07 at HIL 2: keep the registrations and pre-tool mapping from T04 (neutral). Do only the capability and support-level part.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-07 | `prd.md#functional-requirements` | No pre-tool hook installed (amended criterion, DEC-07) |
| NFR-04 | `prd.md#non-functional-requirements` | Hook overhead does not grow (it shrinks) |
| DEC-07, DEC-08 | `techspec.md#technical-decisions` | — |
| CMP-05, CMP-06 | `techspec.md#components-and-flow` | — |
| TC-09, TC-11 | `techspec.md#test-approach` | — |

## Context to recover on demand

- Applicable rules: `harness-adapters.md` (fixtures follow the documented formats), `node.md`, `tests.md`.
- Harness reference: `docs/research/harness-integrations.md`.
  - Re-check each vendor's hook list: removing an entry needs no new vendor behavior.
  - Record a dated note if a section still says ContextBrake uses a pre-tool hook.
- Existing code: the per-harness table of lines in the bullets above.
- `src/core/services/support-service.ts:36-64`.

## Work

- [x] T05.1 Remove the pre-tool hook registration and updater entries for the five process-hook harnesses. Update their planners and doctor checks.
- [x] T05.2 Remove the in-process pre-tool handlers (OpenCode, Pi, Oh-My-Pi) and the `pre_tool` event and mappings, including the payload and response schemas.
- [x] T05.3 Reduce `CAPABILITY_IDS` and `SUPPORT_LEVELS`. Update `support-service.ts`, every `capabilities.ts`, and the benchmark fixtures. Regenerate the schemas.
- [x] T05.4 Delete and rewrite the fixtures and tests. Clean the lanes.
- [x] T05.5 Run lint, typecheck, `schemas:check`, the touched suites including `runtime-overhead`, then `npm run coverage`.

## Acceptance criteria

- `init` on a fixture of each harness writes no pre-tool entry. `rg -n "PreToolUse|preToolUse|tool\.execute\.before|'tool_call'|pre_tool" src` returns nothing.
- `doctor` on a Claude Code fixture with PostToolUse, SessionStart, and Stop reports the integration as installed.
- Every harness support profile has level `full` or `partial` and exactly the four remaining capability IDs (TC-11).
- `runtime-overhead` and `statusline-overhead` stay within their asserted limits.

## Verification

- Unit: `tests/unit/{hook-registration-paths,adapter-planners,adapter-diagnostics,harness-adapters,harness-schemas-process,benchmark-fixtures,idempotent-adapter-merge,support-service,support-service-version-gating,readme-support-table}.test.ts`, plus the `runtime-*` tests (TC-09, TC-11).
- Integration: `tests/integration/{legacy-user-hooks,claude-preservation,codex-cursor-user-hooks,runtime-overhead}.test.ts`.
- End-to-end: `tests/e2e/{e2e-support-limitations,e2e-user-hook-preservation,e2e-antigravity-registration}.test.ts`.
- Manual: none.
- Platforms: Windows local. Hook command shells are unchanged.
- Commands: `npm run lint`, `npm run typecheck`, `npm run schemas:check`, `npm run build`, `npm run coverage`.
- Environment dependency: the HIL 2 decision on DEC-07.
- Expected evidence: pass counts, coverage thresholds met, the empty `rg` output, and regenerated report schemas with a 2-value support enum.

## Affected files

- Modify:
  - Every adapter's harness files: `src/infrastructure/harnesses/*/{planner,runtime,schemas,events,adapter,capabilities}.ts`.
  - Hook updaters and in-process support: `src/infrastructure/harnesses/common/{codex,cursor,antigravity}-hooks-updater.ts`, `common/in-process-support.ts`.
  - Claude Code hooks config: `src/infrastructure/harnesses/claude-code/claude-hooks-config.ts`.
  - Core contracts and services: `src/core/contracts/{runtime,harness,changes,diagnostics}.ts`, `src/core/services/{brake-engine,support-service}.ts`.
  - Schemas: `schemas/{doctor-report,install-report}.schema.json`.
  - Tests and fixtures listed above.
- Delete: the pre-tool fixtures under `tests/fixtures/harnesses/` and `tests/fixtures/benchmark/` that only drive the pre-tool event.

## Observability and recovery

- Operational signal: `doctor` shows the new support level per harness.
- Recovery: `git revert` of the task commit, then `init` to reinstall the pre-tool entries.

## Handoff

> Updated by `sdd-execute-task`. **T05 complete.**

- Produced result (DEC-07, DEC-08, DEC-AMEND-01):
  - **No pre-tool hook is installed.**
    - Registrations removed: Claude Code (`claude-hooks-config.ts`, planner), Codex (`CODEX_EVENTS`, planner), Cursor (`CURSOR_EVENTS`, planner, and `failClosed` in the updater), Copilot (planner and config file), and Antigravity (`DESIRED_HOOK`, planner).
    - In-process handlers removed: OpenCode `tool.execute.before`, and Pi and Oh-My-Pi `tool_call`.
    - Every pre-tool mapping is removed. `RuntimeEvent` has no `pre_tool`, and the engine has no pre-tool branch.
    - An unregistered pre-tool event that reaches a hook is unmapped and writes nothing.
    - Payload and response schemas removed: `claudePreToolUsePayloadSchema`, `claudePreToolUseResponseSchema`, the Codex, Cursor, Copilot, and Antigravity `*PreToolUsePayloadSchema`, `piToolCallPayloadSchema`, `ompToolCallPayloadSchema`, `opencodeToolExecuteBeforePayloadSchema`, and `opencodeToolBeforeOutputSchema`.
    - Claude reads the transcript only on PostToolUse.
  - **Doctor.** The Claude Code integration check looks at the PostToolUse group.
  - **Capabilities.** `CAPABILITY_IDS` is `post_tool_telemetry`, `session_boot`, `context_usage`, and `auto_restart`. `SUPPORT_LEVELS` is `full` and `partial`. The level is `full` when `post_tool_telemetry` and `session_boot` are supported. The unverified-floor limitation sits on `post_tool_telemetry`. Codex, Cursor, and Copilot are now `full`; OpenCode and Antigravity stay `partial`. The Claude `context_usage` impact text no longer mentions the brake. Report schemas were regenerated.
  - **Benchmark (DEC-T05-01).**
    - Every adapter's benchmark fixture uses its post-tool event: `PostToolUse` or `postToolUse` for the process hooks, `tool.execute.after` for OpenCode, and `tool_result` for Pi and Oh-My-Pi. Antigravity keeps `PreInvocation`.
    - `NodeOverheadMeasurer` copies the asset into a temporary project (`context-brake-benchmark-*`) and samples it there, so `doctor` writes nothing into the user runtime directory.
    - The process sampler runs with that directory as `cwd`, `CLAUDE_PROJECT_DIR`, and `CURSOR_PROJECT_DIR`. The in-process sampler passes it as `directory` and `cwd`.
  - **README.** The support table and its legend now describe `full` and `partial` without blocking (TC-15 for the table). The rest of the README stays with T07.
- Tests:
  - Deleted: `unit/brake-engine-pre-tool`, and the pre-tool fixtures (`claude-code/pre-tool-use{,-skill}.json`, `{codex-cli,cursor,github-copilot-cli,antigravity-cli}/pre-tool-use.json`, `{pi,oh-my-pi}/tool-call.json`, `opencode/tool-execute-before.json`).
  - Rewritten:
    - runtime mapping tests (`runtime-{claude,codex,copilot,cursor,antigravity,pi,omp,opencode,claude-measured}`) now classify tools through post-tool events and assert that pre-tool events map to `null`;
    - support (`support-service`, `support-service-version-gating`, `harness-adapters`, `schemas`, `changes-schema`, `report-service`);
    - registration (`hook-registration-paths`, `adapter-planners`, `idempotent-adapter-merge`, `claude-preservation`, `safe-removal`, `legacy-user-hooks`, `minified-config`, `symlinked-harness-config`, `antigravity-registration`, `copilot-failure-policy`, the e2e install tests, and `e2e-10-fixtures`). These assert that no ContextBrake pre-tool entry is written and that user pre-tool hooks are kept;
    - built hooks (`package-assets`, `runtime-{antigravity,cursor,failure-policy,in-process,light-mode}`), in-process (`in-process-runtime`), and benchmark (`benchmark-fixtures`, `harness-registry`, `in-process-sampler`, `overhead-measurer`, `runtime-overhead`, `statusline-overhead`, and the `tests/fixtures/benchmark/*` handlers).
  - Legacy fixtures: the Codex and Cursor ones now use post-tool events. The harness simulator drivers no longer call a pre-tool hook.
- Checks (Windows 11, base `1474f54` plus T01-T05):
  - `npm run lint` clean, `npm run typecheck` clean, `npm run build` passes, `npm run schemas:check` passes.
  - Related suites: 85 files and 394 tests. Everything passes except `readme-config-example` and `readme-light-example`, which T07 owns (README examples).
  - Quality profile QA-01..QA-08 over the changed `src` files:
    - the QA-08 hits in `pi/runtime.ts` and `oh-my-pi/runtime.ts` are in the Terrain baseline;
    - `diagnostics/in-process-sampler.ts:40` (`selectHandler`) is a false positive, because the comma comes from the `ReadonlyMap<string, HookHandler>` generic and the function has three parameters (reservation).
- Acceptance `rg -n "PreToolUse|preToolUse|tool\.execute\.before|'tool_call'|pre_tool" src` has 3 hits, deliberately kept:
  - `antigravity-cli/detector.ts:8,13`: the documented Antigravity event list used to detect the harness, and the legacy entry check.
  - `common/antigravity-hooks-updater.ts:25`: the cleanup of a legacy `hooks.PreToolUse.context-brake` entry.
  - These are vendor format knowledge and legacy cleanup, not a ContextBrake registration. Removing them would weaken harness detection.
- Open items:
  - T07: the dated note in `docs/research/harness-integrations.md` saying the deny and the pre-tool hooks were removed in prd-12.
  - T07: the README examples and remaining README text.
  - This repository's `.claude/settings.json` still has a stale PreToolUse group; T07 removes it by hand (DEC-15).

### ADR candidates

None - direct TechSpec implementation or local decision (DEC-T05-01 is recorded in workflow.md).
