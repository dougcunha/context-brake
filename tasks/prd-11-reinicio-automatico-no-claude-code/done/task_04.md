# Stable execution context

Load in this exact order:

1. `tasks/prd-11-reinicio-automatico-no-claude-code/prd.md`
2. `tasks/prd-11-reinicio-automatico-no-claude-code/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T04 — Bundled Claude Code mod

## Outcome

A built `claude-code-mod.mjs` that, against the simulated host, clears the session once on a safe restart signal, seeds the new session once, enforces the guards, logs only codes, and never breaks the session.

## Dependencies and boundaries

- Depends on: T01, T03
- Unblocks: T05
- In scope: glue under `src/infrastructure/harnesses/claude-code/mod/` (register and hook wiring, facts gathering via `$.fs`, store keys, log writer, clear and seed calls), `assets/runtime/claude-code-mod.ts`, the bundler entry producing `dist/assets/runtime/claude-code-mod.mjs`, the fake `$` host and its contract test against T01 fixtures.
- Out of scope: writing the mod files into a repository (T05), `doctor` (T06), docs (T07).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01 to FR-06 | `prd.md#functional-requirements` | Behavior inside the host |
| FR-10, NFR-02 | `prd.md#functional-requirements` | Log and notice without content |
| NFR-01, NFR-04 | `prd.md#non-functional-requirements` | No `node:` imports, failures contained |
| DEC-01 to DEC-07, DEC-10, DEC-11, DEC-13 | `techspec.md#technical-decisions` | Event wiring, store, log |
| CMP-04, CMP-05 | `techspec.md#components-and-flow` | Glue and entry |

## Context to recover on demand

- Applicable skills and rules: `plugin-authoring` skill (hook shape, `$` usage rules), `node.md` (no sync I/O in-process), `harness-adapters.md`, `tests.md`.
- Existing code: `assets/runtime/opencode-plugin.ts` and `src/infrastructure/harnesses/opencode/runtime.ts` (in-process pattern), `scripts/asset-bundler.ts:8`, `src/core/services/run-context.ts:10`, `T03` outputs.
- Contract or integration: `techspec.md#integrations-and-interfaces`, `#contracts-and-data`.
- Harness reference: `docs/research/harness-integrations.md#claude-code` as updated by T01; fixtures in `tests/fixtures/harnesses/claude-code/mod/`.

## Work

- [x] T04.1 Build the fake `$` host (`fs`, `store`, `env`, `clock`, `command`, `prompt`, `session`, `ui`) whose shapes come from the T01 fixtures, plus the contract test (TC-16).
- [x] T04.2 Implement facts gathering (config, checkpoint stat and read in full mode only, store record, env, surfaces) and the `turn.complete` hook with the queued `/clear` (DEC-02).
- [x] T04.3 Implement the seed submitted when the queued clear resolves (DEC-03), the `prompt.submit` reset and the `tool.call` counter (DEC-06).
- [x] T04.4 Implement the per-session log and loaded header (DEC-10) and the wrapper that turns any error into a coded skip and `next(e)` (DEC-11).
- [x] T04.5 Add the bundler entry; add the bundle gate for `node:` imports and sync I/O (TC-15); run the asset check.
- [x] T04.6 Write TC-09 to TC-16 and TC-28; if the optional `claude` binary exists, run `claude plugin validate` on a temp plugin dir built from the asset and record the result.

## Acceptance criteria

- One valid signal gives exactly one `command.run('clear')` after the hook has returned, and exactly one seed after the cleared session starts; a repeat or a person-typed clear gives none.
- Full mode skips with the right code on a missing, invalid, stale or step-less checkpoint; light mode performs zero reads of plan, checkpoint or snapshot files.
- The third consecutive restart without a person prompt is refused; a person prompt resets the counter; zero tool calls since the seed refuses.
- A thrown `$.fs`, a rejected `/clear` or a store failure leaves the session running, logs `ERROR_*`, and submits no seed.
- The bundle contains no `node:` import and no synchronous file or process API.

## Verification

- Unit: not applicable (policy covered in T03).
- Integration: TC-09 to TC-16 and TC-28 with real temp directories for checkpoint files and the fake host for `$`.
- End-to-end: not applicable.
- Manual: optional `claude plugin validate` on the generated plugin directory (QA-06).
- Platforms: Linux, macOS, Windows (temp-dir paths, line endings).
- Commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run assets:check`, `npm run build`
- Environment dependency: none for the suite; `claude` binary optional for QA-06.
- Expected evidence: test counts, coverage at or above 80%, QA-01 to QA-05, QA-07 to QA-11 clean, `assets:check` passing.

## Affected files

- Modify: `scripts/asset-bundler.ts`
- Create: `assets/runtime/claude-code-mod.ts`, `src/infrastructure/harnesses/claude-code/mod/*.ts`, `tests/fixtures/claude-mod-host.ts`, `tests/integration/claude-mod.test.ts`, `tests/integration/claude-mod-bundle.test.ts`

## Observability and recovery

- Operational signal: `.context-brake/runtime/claude-mod/<sessionId>.json` records.
- Recovery: if the task outgrows one session, split into glue and bundling at the policy-to-glue boundary; the mod is inert until T05 installs it.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: The Claude Code mod exists as a bundled ES module (`dist/assets/runtime/claude-code-mod.mjs`, built from `assets/runtime/claude-code-mod.ts`). Five hooks only: `session.start` (writes the loaded header), `turn.start` (turn clock), `tool.call` (counter), `turn.complete` (decides with the core policy, queues `/clear` un-awaited, logs a code and shows a one-line notice), `prompt.submit` (a person-typed prompt resets the counter). The seed is submitted when the queued clear promise resolves (DEC-03 as amended), never from a settings-hook event. Guards live in `$.store` per project root; the progress count is folded in at each main turn end. Full mode reads config and checkpoint (valid, missing, invalid, stale by mtime against the turn start, no active step when a plan file exists); light mode reads only the config file. Stand-down reads three literal env names and the surfaces. Every hook body is wrapped so an error becomes a coded `ERROR_INTERNAL` notice and the event passes on. The per-session log `.context-brake/runtime/claude-mod/<sessionId>.json` holds only codes.
- Changed files: New: `src/infrastructure/harnesses/claude-code/mod/{host,mod-info,mod-config,mod-guards,turn-state,mod-log,restart-facts,restart-flow,hooks,register}.ts` (4 to 60 lines each), `assets/runtime/claude-code-mod.ts`, `tests/fixtures/claude-mod-host.ts`, `tests/fixtures/claude-mod-scene.ts`, `tests/integration/claude-mod-{restart,gates,guards,bundle}.test.ts`. Modified: `scripts/asset-bundler.ts` (new entry), `scripts/check-package.ts` and `tests/integration/package-contents.test.ts` (asset listed), `tests/unit/asset-bundler.test.ts` (asset count 10 to 11).
- Checks: `npm run typecheck`, `npm run lint`, `npm run assets:build`, `npm run assets:check` clean. Full `npm run coverage`: 314 files passed, 2006 tests passed, 3 skipped, overall coverage 95.95% statements. New mod tests: 29 (restart 8, gates 8, guards 8, bundle 5). Bundle gate (TC-15): no `node:` import, no synchronous file or process API. Contract test (TC-16) against `tests/fixtures/harnesses/claude-code/mod/observed-events.json`: only events seen in a real session are registered, no `classic.*`. `claude plugin validate` on a plugin directory built from the bundle (Claude Code 2.1.289) passes with no warnings: hooks session.start, turn.start, tool.call, turn.complete, prompt.submit; every `$.*` call listed with its caller; env reads only CONTEXT_BRAKE_AUTO_RESTART, CONTEXT_BRAKE_RUN_ID, DISABLE_AUTO_COMPACT; QA-06 satisfied. Quality sweep (QA-01 to QA-05, QA-07 to QA-11) empty on the new source files; all under 100 lines.
- Validated state: Base `c7529c5` plus the T02, T03 and T04 diffs, Windows 11, Node via npm scripts, Claude Code 2.1.289 for the plugin validation. Not exercised in a real session yet: the mod itself running inside Claude Code (MA-01 in T07), Linux and macOS (CI only).
- Open items: Observation, not a block: the bundle is 731 KB because core schemas pull in the full Zod library. Module load happens once per session; if it shows up in the debug log load time, split the config check into a smaller schema. The mod reads the project root with `$.session.root()`; if Claude Code starts in a subfolder the config file is not found and the mod stays off silently, which T06 doctor should surface as 'never seen loaded'. A `.mjs` bundle is the file T05 must install as `hooks/register.mjs`.

### ADR candidates

None - direct TechSpec implementation or local decision
