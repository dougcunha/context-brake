# Implementation plan — Freio só com janela confiável

## Stable sources

- PRD: `tasks/prd-09-freio-com-janela-confiavel/prd.md`
- TechSpec: `tasks/prd-09-freio-com-janela-confiavel/techspec.md`

> Common sources come before the task and mutable state; read order does not guarantee a cache hit.

## Dependency graph

| ID | Delivery | Depends on | Unblocks |
| --- | --- | --- | --- |
| T01 | Every reading carries its window origin; both deny paths require a trusted window; declared window for harnesses without a source; telemetry `v3` and debug line | — | T02 |
| T02 | Claude Code bridge installed by default with a remembered opt-out; `doctor` shows who can deny and warns without a bridge; the runner cuts at `CRITICAL` only with a trusted window; user and research docs | T01 | — |

## Traceability matrix

| Source ID | Source section | Obligation | Tasks | Evidence or test |
| --- | --- | --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | Window origin `harness` / `declared` / `config` | T01 | TC-01 |
| FR-02 | `prd.md#functional-requirements` | No deny with origin `config`, in any zone | T01 | TC-02, TC-12 |
| FR-03 | `prd.md#functional-requirements` | Integration-failure deny only with a trusted last reading | T01 | TC-03, TC-04 |
| FR-04 | `prd.md#functional-requirements` | Default bridge, `--no-statusline-bridge` opt-out, no record means `config` | T02 (T01 for the `config` origin) | TC-09, TC-12 |
| FR-05 | `prd.md#functional-requirements` | Declared window for harnesses without a source | T01 | TC-01, TC-05, TC-12, TC-13 |
| FR-06 | `prd.md#functional-requirements` | `window=` in block `v3`, warning-only action, debug line | T01 | TC-06, TC-07, TC-08 |
| FR-07 | `prd.md#functional-requirements` | Doctor: who can deny and why; warning without the bridge | T02 | TC-10, TC-11, TC-13 |
| FR-08 | `prd.md#functional-requirements` | README, protocol, telemetry, and research docs | T01 (telemetry and protocol docs), T02 (README, research) | TC-14 |
| FR-09 | `prd.md#functional-requirements` | Runner `CRITICAL` cut only with a trusted window | T02 | TC-16 |
| NFR-01 | `prd.md#non-functional-requirements` | Hook p95 budgets unchanged | T01 | TC-15 |
| NFR-02 | `prd.md#non-functional-requirements` | Optional schema fields; `window=` ≤ 10 tokens | T01, T02 | TC-05, TC-06, TC-13 |
| NFR-03 | `prd.md#non-functional-requirements` | Linux, macOS, Windows | T01, T02 | CI |
| DEC-PD-02 | `workflow.md#human-decisions-log` | Turns never deny without a trusted window; declaration only for harnesses without a source | T01 | TC-01, TC-02 |
| DEC-01–DEC-07, DEC-11 | `techspec.md#technical-decisions` | Origin, capability filter, gates, ledger field, config key, block `v3`, debug line, file budgets | T01 | TC-01–TC-08, TC-12, TC-15 |
| DEC-08–DEC-12 | `techspec.md#technical-decisions` | Default bridge, opt-out memory, doctor `brakeWindow`, file budgets, runner gate | T02 | TC-09–TC-11, TC-13, TC-14, TC-16 |
| TC-01–TC-08, TC-12, TC-15 | `techspec.md#test-approach` | Core, config, telemetry, end-to-end hooks, overhead | T01 | listed test files |
| TC-09–TC-11, TC-13, TC-14, TC-16 | `techspec.md#test-approach` | Install, doctor, schemas, docs, runner | T02 | listed test files |
| QA-01–QA-09 | `techspec.md#quality-profile` | Quality profile over each task diff | T01, T02 | profile commands |

## Tasks

- [T01 — Window origin gates every deny](done/task_01.md): readings, ledger lines, and telemetry `v3` carry the window origin, and the brake denies only with a harness-reported or declared window.
- [T02 — Default Claude Code bridge and doctor brake report](done/task_02.md): `init` installs the bridge by default with a remembered opt-out, `doctor` reports per harness whether the brake can deny, and the runner cuts at `CRITICAL` only with a trusted window.

## Coverage gate

- Coverage: pass. Every FR, NFR, DEC, and TC maps to a task.
- Traceability: pass.
- Dependencies: pass; T02 uses T01's origin enum and `window-trust.ts`.
- Atomicity: pass; each task is a vertical slice with its tests. T01 is the larger one (core, config, telemetry, and the mechanical `v2` → `v3` test updates).
- Executability: pass; commands come from `AGENTS.md`.
- Validation profile: pass. End-to-end only for TC-12 (built Codex and Claude Code hooks as child processes in `tests/e2e/`); Windows locally, Linux and macOS through CI.
- Idempotency: pass; TC-09 covers the repeated plain `init` and the remembered opt-out.

## Assumptions and open items

- Decided (`DEC-HIL-01`): `.claude/settings.local.json` is not added to the managed `.gitignore` block; `STATUSLINE_LOCAL_TRACKED` keeps warning.
- Required environment: None.

## State

- [x] T01 — completed (done/task_01.md)
- [x] T02 — completed (done/task_02.md)

## Problems and solutions

- T02: the opt-out record lives in its own marker file (`claude-statusline-opt-out.json`) instead of the bridge state, so the state parser and `STATUSLINE_STATE_INVALID` stay unchanged; the marker path joined `src/cli/snapshot-helper.ts#STANDARD_HARNESS_PATHS`, since `init` skips a planned create without a snapshot (`SNAPSHOT_MISSING`). `StatuslineBridgeRequest` gained `'default'`, passed by `init` when no flag is given and light mode is off. The doctor report extras moved to `doctor-report-extras.ts` (DEC-11 absorbed extraction) to keep `doctor-service.ts` at 100 lines. `techspec.md` DEC-09 updated within the approved contract.
- T01: 82 existing tests relied on denying with the fallback window or on `v2` literals. They were reconciled by giving each deny fixture a trusted window (declared window for `unsupported` harnesses, a bridge `statusline` line or `measured.contextWindow` for Claude Code, `windowOrigin: 'harness'` on seeded ledger lines) and by moving literals to `v3`; no assertion was weakened. The context pause taken mid-T01 came from an estimate against a 200k window; the measured usage was 46% (`DEC-PAUSE-T01B`).
- T01: the DEC-06 warning-only action as first written measured 65 `o200k_base` tokens and 252 characters in the worst-case block, above the existing budget test (60 tokens, 220 characters); it was shortened to `not blocked (no harness window, see context-brake doctor); finish the RED actions` (55 tokens, 202 characters) and applied only to the plan-mode CRITICAL text, since the delegated and light actions do not promise blocking. `techspec.md` DEC-06 updated within the approved contract.
