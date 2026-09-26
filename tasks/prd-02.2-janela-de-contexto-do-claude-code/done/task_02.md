# Stable execution context

Load in this exact order:

1. `tasks/prd-02.2-janela-de-contexto-do-claude-code/prd.md`
2. `tasks/prd-02.2-janela-de-contexto-do-claude-code/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T02 — Status line bridge runtime

## Outcome

`dist/assets/runtime/claude-code-statusline.mjs` exists after `npm run build`. Run with `--pipe`, it copies stdin to stdout unchanged. Run without it, stdout stays empty. In both modes it appends one `statusline` line to the main session ledger and exits 0. It never lets a parse or write failure change what the status line shows.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: T03, T05
- In scope:
  - `assets/runtime/claude-code-statusline.ts`;
  - `src/infrastructure/harnesses/claude-code/statusline-bridge.ts` (DEC-03);
  - `src/infrastructure/harnesses/claude-code/statusline-payload.ts`, the loose schema and mapping;
  - a bundling entry in `scripts/asset-bundler.ts`;
  - a `REQUIRED_FILES` entry in `scripts/check-package.ts`;
  - a spawn helper for the bridge in `tests/helpers/built-hook.ts`;
  - lane registration in `tests/test-lanes.ts`.
- Out of scope: installing the asset or the `statusLine` entry (T03); overhead budget (T05).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-02 | `prd.md#functional-requirements` | Output preserved byte for byte, empty without a previous command |
| FR-03 | `prd.md#functional-requirements` | Record five values per session |
| NFR-02 | `prd.md#non-functional-requirements` | Resilience |
| NFR-03 | `prd.md#non-functional-requirements` | Privacy |
| OBJ-02 | `prd.md#outcomes-and-metrics` | Status line intact |
| DEC-01, DEC-03 | `techspec.md#technical-decisions` | Asset and runtime behavior |
| CMP-01–CMP-03, CMP-13 | `techspec.md#components-and-flow` | Components |
| TC-06–TC-09 | `techspec.md#test-approach` | Tests |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/node.md` (stdout belongs to the harness, lazy imports, child processes), `harness-adapters.md`, `tests.md`.
- Existing code:
  - `src/infrastructure/runtime/process-hook-host.ts:8, 28-60` — stdin cap, deadline, exit 0, error logging before mapping.
  - `src/core/services/failure-policy.ts:48-53, 72-78` — `runWithinDeadline` and `recordRuntimeFailure`.
  - `src/infrastructure/harnesses/common/runtime-support.ts:18-30` — `assetProjectRoot`.
  - `src/infrastructure/runtime/runtime-paths.ts:20-22` — session key.
  - `scripts/asset-bundler.ts:8-37`, `scripts/check-package.ts:17-35`.
  - `tests/helpers/built-hook.ts:10-37`.
- Contract or integration: `techspec.md#contracts-and-data` (status line stdin fields); `techspec.md#integrations-and-interfaces`.
- Harness reference: the Status line section written in T01.

## Work

- [x] T02.1 Create `statusline-payload.ts`: loose Zod schema for the fields in `techspec.md#contracts-and-data`, mapping to `StatuslineLineInput` with the null rules of DEC-04.
- [x] T02.2 Create `statusline-bridge.ts`: stream pass-through in `--pipe` mode with a 1 MiB parse buffer, recording under `runWithinDeadline(…, 1500)`, root from `assetProjectRoot()`, errors through `recordRuntimeFailure` with event `StatusLine`, exit 0.
- [x] T02.3 Create `assets/runtime/claude-code-statusline.ts`; add it to `ASSET_ENTRIES` and `REQUIRED_FILES`.
- [x] T02.4 Add a spawn helper for the built bridge to `tests/helpers/built-hook.ts`, and register the new process-lane test in `tests/test-lanes.ts`.
- [x] T02.5 Write TC-06 to TC-09 in `tests/integration/statusline-bridge.test.ts` against the built asset, using the T01 fixture.

## Acceptance criteria

- In `--pipe` mode, feeding a command that prints multi-line ANSI output and exits 3, the result is byte-for-byte equal to the command alone, with exit 3 and one ledger line (TC-06).
- Without `--pipe`, stdout is empty, the exit code is 0, and the ledger line is written (TC-07).
- Invalid JSON, a missing `session_id`, and stdin above 1 MiB leave the output unchanged and exit 0. Only an unwritable ledger is logged in `errors.jsonl` (TC-08).
- The ledger line holds only `windowTokens`, `inputTokens`, `usedPercentage`, `model`, and `at`, even with cost, workspace, and output fields in the payload (TC-09).

## Verification

- Unit: payload mapping edge cases, colocated with the integration suite or in `tests/unit/statusline-payload.test.ts`.
- Integration: TC-06 to TC-09 spawn `dist/assets/runtime/claude-code-statusline.mjs`, feeding it `node -e` commands as the "previous" side of a real pipe.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Linux, macOS, Windows (CI).
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`, `npm run package:smoke`.
- Environment dependency: none.
- Expected evidence: test count and exit code; `package:smoke` lists the new asset; quality profile over the diff, with `statusline-bridge.ts` pass-through writes as the documented response writer (QA-06).

## Affected files

- Modify:
  - `scripts/asset-bundler.ts`
  - `scripts/check-package.ts`
  - `tests/helpers/built-hook.ts`
  - `tests/test-lanes.ts`
- Create:
  - `assets/runtime/claude-code-statusline.ts`
  - `src/infrastructure/harnesses/claude-code/statusline-bridge.ts`
  - `src/infrastructure/harnesses/claude-code/statusline-payload.ts`
  - `tests/integration/statusline-bridge.test.ts`

## Observability and recovery

- Operational signal: `errors.jsonl` entries with event `StatusLine`.
- Recovery: the asset is inert until T03 references it; reverting removes it from the package.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `runClaudeStatuslineBridge` (DEC-03) copies stdin chunks to stdout as they arrive in `--pipe` mode (stdout errors such as EPIPE stop the copy without failing), keeps the first 1 MiB for parsing, maps the payload with a loose Zod schema, and appends a `statusline` line under a 1,500 ms deadline, with the root from `assetProjectRoot()`. It always returns 0. Invalid JSON, a missing or empty `session_id`, a non-object `model`/`context_window`, and stdin above 1 MiB record nothing and log nothing; only a failed append goes to `errors.jsonl` with event `StatusLine`. Mapping (DEC-04): non-integer or non-positive window and tokens become null, `inputTokens` is null when `current_usage` is null or the total is 0, the percentage outside 0..100 is null, and a model id that is empty or longer than 200 chars is null. The asset is built to `dist/assets/runtime/claude-code-statusline.mjs`.
- Changed files:
  - Created: `assets/runtime/claude-code-statusline.ts`, `src/infrastructure/harnesses/claude-code/statusline-bridge.ts` (68 lines), `src/infrastructure/harnesses/claude-code/statusline-payload.ts` (46 lines), `tests/integration/statusline-bridge.test.ts` (TC-06 to TC-09), `tests/unit/statusline-payload.test.ts` (mapping edges).
  - Modified: `scripts/asset-bundler.ts` (`ASSET_ENTRIES`), `scripts/check-package.ts` (`REQUIRED_FILES`), `tests/helpers/built-hook.ts` (`installBuiltStatuslineBridge`, `runStatuslinePipeline`, `runPreviousCommand`: two `node` processes joined by a real pipe, no shell), `tests/test-lanes.ts` (process lane).
  - Outside the listed files, required by existing assertions: `tests/unit/asset-bundler.test.ts` (`RUNTIME_ASSET_COUNT` 9 → 10) and `tests/integration/package-contents.test.ts` (required packed file).
- Checks: `npm run build` exit 0; `npm run typecheck` exit 0; `npm run lint` exit 0; targeted `statusline-bridge.test.ts` (7) and `statusline-payload.test.ts` (15) pass; `npm run package:smoke` exit 0. Three full `npm run coverage` runs (about 14 minutes each on this machine) each had exactly one timeout, in a different timing-sensitive test unrelated to the diff: `init-legacy-turn-limits` (30 s), `e2e-support-limitations` (30 s plus EBUSY on cleanup), and `node-process-runner` (tree termination). Each passes alone (4/4, 2/2, 9/9). The last run, with `--coverage.reportOnFailure`, measured all files at 94.92% statements / 90.39% branches, above the 80% gate; 249 of 250 files passed, 1,648 tests.
- Quality profile over the task diff: QA-01 to QA-06, QA-08 to QA-10 no hits. QA-07 hits only at the Terrain-baseline lines of `scripts/check-package.ts` and `scripts/asset-bundler.ts`, shifted by one line by the new entries. QA-06: the pass-through `stream.write` in `statusline-bridge.ts` is the documented response writer. No reservation added.
- Validated state: HEAD 5917593 plus the T01 and T02 working-tree diff; Windows 11, Node 20+, Git Bash.
- Open items:
  - The snapshot-list entry for the installed bridge (CMP-13, `src/cli/snapshot-helper.ts`) is not in this task's contract; T03 installs the asset and owns it.
  - After the deadline, the pending append keeps the process alive until it settles; the exit code and the output are unaffected.

### ADR candidates

None - direct TechSpec implementation or local decision.
