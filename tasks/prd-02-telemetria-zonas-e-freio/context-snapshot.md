# Context snapshot — prd-02-telemetria-zonas-e-freio

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-orchestrate-tasks/references/session-continuity.md`.

## Header

- status: active
- generated: 2026-09-16
- stage: tasks
- stage_source: tasks.md
- covers_through: T06
- authored_code: yes
- git_head: 0512615
- worktree: 88 changed: README.md, assets/, docs/, src/, tests/, tasks/ (plus untracked `.agents/scheduled_tasks.lock`)
- next_step: sdd-review-code — T06 (task_06.md, uncommitted diff)
- other_eligible: —
- superseded_by: —

## Load map

| Tier | Load when |
| --- | --- |
| `now` | Session start: header, next step brief, open threads waiting on the user |
| `on-select` | Chosen unit matches a trigger: task or finding ID, affected file, or traceability ID |
| `on-edit` | About to edit or create a path matching a trigger |
| `on-run` | About to run a matching command, or it just failed |
| `on-demand` | A gist is not enough: follow its `src:` pointer, that section only |

Review and QA sessions load only the header, next step brief, `Open threads`, and `on-run` entries.

Entry shape: `- [ID] (when: tier: trigger; trigger) gist — src: path#section; until: condition`

## Next step brief

- Why next: T06 is implemented, tested, and handed off; `sdd-review-code` must run in a session that did not author this code (independence rule), so it must not load `Decisions`, `Code map`, or author `Learnings` below except the `on-run` entries.
- Read first: `tasks/prd-02-telemetria-zonas-e-freio/task_06.md` (contract + Handoff), then `techspec.md#integrations-and-interfaces`, `#contracts-and-data`, `#test-approach` (TC-04, TC-08, TC-09, TC-10, TC-12, TC-14, TC-15, TC-16, TC-18, TC-21, TC-26, TC-33, TC-34), and `prd.md#critérios-de-aceitação` (CA-06 to CA-19). Judge the uncommitted diff (`git diff` plus untracked files), not `HEAD`.
- Known change points: five `src/infrastructure/harnesses/<harness>/runtime.ts` + `capabilities.ts`; `src/infrastructure/harnesses/{claude-code,codex-cli,cursor,github-copilot-cli,antigravity-cli}/{schemas,planner}.ts`; `common/{codex,cursor,antigravity}-hooks-updater.ts`; `src/infrastructure/runtime/{process-hook-host,tool-path-normalizer}.ts` (host canonicalizes tool paths — two T04 files outside T06's list, noted in the Handoff); thin `assets/runtime/*-hook.ts` over `runProcessHook`; `assets/runtime/process-hook.ts` deleted.
- Applicable entries: O-01, O-02, O-03, L-04.
- Watch out: the diff is large and uncommitted; acceptance is TC-driven, and several pre-existing suites moved with the change (`brake-mode`, `package-assets`, `antigravity-registration`, `e2e-antigravity-registration`, `e2e-user-hook-preservation`).

## Decisions

- [D-01] (when: on-select: T06; DEC-14, OI-01) The Antigravity `PreToolUse` auto-approval trade-off was approved at this session's HIL: `pre_tool_block` is now `supported`, `tool_coverage` stays `unknown`, support level `partial`, brake still cooperative; recorded in the research section, README limitation, and the task Handoff. — src: `tasks/prd-02-telemetria-zonas-e-freio/task_06.md#Handoff`; until: review acceptance.
- [D-02] (when: on-select: T06; CMP-16, CMP-17) Tool paths from payloads are canonicalized in `process-hook-host.ts` via `normalizeEventToolPaths` before the engine runs, because adapters map payloads without a project root; two T04 files were touched outside T06's file list. — src: `tasks/prd-02-telemetria-zonas-e-freio/task_06.md#Handoff`; until: T06 review closes.
- [D-03] (when: on-select: T06) Copilot's shell tool is classified from `bash` (docs) and `powershell` (captured on Windows 1.0.85); file tools remain fixture-gated. — src: `docs/research/harness-integrations.md#GitHub Copilot CLI`; until: a broader capture supersedes it.

## Learnings

- [L-01] (when: on-run: capturing harness payloads) Real captures work locally: Claude Code via a temp project hook dump plus `claude -p`; Codex CLI needs `--dangerously-bypass-hook-trust` or project hooks do not load; Copilot via `copilot -p --allow-all-tools --allow-all-paths`. Captured shapes are now the fixtures. — src: `docs/research/harness-integrations.md` (Payloads reais per section); until: next harness re-check.
- [L-02] (when: on-run: npm test) The process lane requires `npm run build` first; `dist/assets/runtime/*.mjs` is what `package-assets`, `runtime-parallel-turns`, and the e2e suites execute. — src: `tests/test-lanes.ts`; until: —
- [L-03] (when: on-run: e2e-user-hook-preservation) `remove` must drop event keys that become empty arrays for the byte-identical restoration check; Claude planner, Codex and Cursor updaters now use `removeJsonProperty` for that case. — src: `src/infrastructure/harnesses/claude-code/planner.ts`; until: refactor of the shared updaters.
- [L-04] (when: on-run: bundle guard; T08) `tests/unit/runtime-bundle-imports.test.ts` (QA-08) does not exist yet; bundles were checked manually and carry no classic `zod`, `jsonc-parser`, `node:child_process`, or `src/cli/` imports. — src: `techspec.md#quality-profile`; until: T08 lands the guard.

## Code map

- [M-01] (when: on-edit: src/infrastructure/harnesses/*/runtime.ts) Each `runtime.ts` builds one `ProcessHarnessAdapter` (descriptor, `map<Harness>Event`, `map<Harness>Input`, `render<Harness>Decision`, `resolveProjectRoot`) and exports `run<Harness>Hook`; the asset calls only the latter. — src: —; until: changed files overlap.
- [M-02] (when: on-edit: src/infrastructure/harnesses/common/runtime-support.ts) Shared `parsePayload` (throws `PayloadInvalidError`), `requireIdentifier`, `characterLength`, `asRecord`, `textValue`, and project-root resolution. — src: —; until: T07 adds in-process helpers.
- [M-03] (when: on-edit: tests/helpers/*) `built-hook.ts` installs a built asset at the harness path and spawns it; `harness-payloads.ts` reads fixtures; `runtime-seed.ts` writes configs and ledger turns (`seedTurns(projectRoot, key, turns)`). — src: —; until: T07/T09 extend them.

## Open threads

- [O-01] (when: now) QA-08's verification suite is a recorded gap; the bundle guard belongs to T08. — src: `techspec.md#quality-profile`; until: T08 done.
- [O-02] (when: now) No real payloads for Cursor and Antigravity (CLIs not installed) and Copilot `preCompact`/`agentStop` were not exercised; fixtures stay documentation-based and Cursor/Antigravity file tools remain unclassified (OI-04). — src: `docs/research/harness-integrations.md` (Payloads reais); until: a capture is recorded.
- [O-03] (when: now) T07–T09 are pending; T07 is the next implementation unit after the review. — src: `tasks.md#State`; until: T07 done.
- [O-04] (when: now) Local validation was Windows/Node 24 only; Linux and macOS run in CI. — src: `tasks/prd-02-telemetria-zonas-e-freio/task_06.md#Handoff`; until: CI matrix run.
