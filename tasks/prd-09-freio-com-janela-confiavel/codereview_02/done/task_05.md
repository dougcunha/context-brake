# Stable execution context

Load in this exact order:

1. `tasks/prd-09-freio-com-janela-confiavel/codereview_02/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T05 — The README states the brake's deny condition, and TC-09 states the real exit code

## Outcome

The README's brake section and the Antigravity paragraph say a tool call is denied at the critical threshold only with a trusted context window (harness-reported, or declared for harnesses that report none), and that with the `contextWindowCeiling` fallback the brake only warns. TC-09 in the TechSpec expects the default-bridge warning to end `init` with exit 1 (`status: warnings`), never exit 2.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: `README.md:53` and `README.md:80`; the TC-09 row of `techspec.md#test-approach` (`DEC-HIL-03`).
- Out of scope: the review's optional improvements (`README.md:31`, `docs/telemetry-block.md`, `window-trust.ts:14`, the `STATUSLINE_SETTINGS_INVALID` impact text, test names), code.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_02/CR-01 | `codereview.md#findings` | `README.md:80` (Antigravity "Above the ceiling, `deny` is returned") and `README.md:53` (calls "denied" at the critical threshold) are unconditional, false without a trusted window since FR-02 and FR-05 (FR-08) |
| DEC-HIL-03 | `workflow.md#milestone-history` | TC-09 "exit 0" versus the existing warning exit code 1 (`codereview.md#limitations-and-open-items`) |

## Requirements

- `README.md:53` keeps the allowlist introduction and adds that the deny needs a trusted window (reported by the harness, or declared in `telemetry.declaredContextWindow` where the harness reports none); with the `contextWindowCeiling` fallback, `CRITICAL` only warns.
- `README.md:80` says `deny` is returned above the ceiling only when `telemetry.declaredContextWindow` is set, since Antigravity reports no window; otherwise `allow` is returned in every zone.
- TC-09's expected result for the unsupported path reads "warning and no bridge, exit 1 (`status: warnings`), never exit 2", and the row also names the malformed settings case added by `codereview_01/done/task_03.md`.
- The full suite passes in one run.

## Context to recover on demand

- PRD: `prd.md` FR-02, FR-05, FR-08
- Code: `src/core/services/brake-engine.ts:43`; `src/infrastructure/harnesses/antigravity-cli/runtime.ts:43-44`
- Rules: `tests.md`

## Work

- [x] T05.1 Reword `README.md:53` and `README.md:80`.
- [x] T05.2 Amend the TC-09 row in `techspec.md`.

## Acceptance criteria

- `README.md:53` and `README.md:80` state the trusted-window condition; no README sentence says a call is denied at the ceiling without it.
- TC-09 expects exit 1 and never exit 2 for the default-bridge warning, and lists the malformed settings case.
- Build, typecheck, lint, and the full suite with coverage pass in one run.

## Verification

- Unit: `tests/unit/readme-config-example.test.ts` still passes.
- Integration: not applicable.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows locally; Linux and macOS through CI when committed.
- Environment dependency: an external process loaded the CPU during the last two full runs; a timeout in a file outside the diff is rerun, and the task closes only on a green full run.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm run coverage`
- Expected evidence: `rg -n "denied before execution|deny\` is returned" README.md` shows only qualified lines; suite green.

## Affected files

- Modify: `README.md`
- Modify: `tasks/prd-09-freio-com-janela-confiavel/techspec.md`

## Observability and recovery

- Operational signal: none.
- Recovery: revert the text.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `README.md:53` now says calls are denied at the critical threshold only when the context window is trusted (reported by the harness, or declared in `telemetry.declaredContextWindow` for harnesses that report none), and that with the `contextWindowCeiling` fallback (`window=config`) `CRITICAL` only warns. `README.md:80` says Antigravity reports no window, so `deny` is returned above the ceiling only with `telemetry.declaredContextWindow`, otherwise `allow` in every zone. `techspec.md` TC-09 (`DEC-HIL-03`) expects "warning and no bridge, exit 1 (`status: warnings`), never exit 2" for the unsupported path and adds the malformed `.claude/settings.local.json` case (`STATUSLINE_SETTINGS_INVALID`, hooks installed, file untouched, exit 1; with `--statusline-bridge`, the `INVALID_HARNESS_CONFIG` conflict, exit 2). No code changed.
- Changed files: `README.md` (lines 31, 53, 80), `tasks/prd-09-freio-com-janela-confiavel/techspec.md` (TC-09 row only; the pre-edit version has sha256 `9125eed9…`, the hash recorded at the start of this round).
- Checks (Windows 11, Node 24, base `e0a9604` plus the feature diff and both correction rounds): `rg -n "denied before execution|deny\` is returned" README.md` shows only the two qualified lines; `npm run build`, `npm run typecheck`, `npm run lint` exit 0. First `npm run coverage` exit 1: 1,873 passed, 1 failed (`tests/e2e/e2e-support-limitations.test.ts` doctor case, 30 s timeout, the same file as in `codereview_01/done/task_03.md` and `codereview_02`; none of `doctor`, the overhead measurer, the test, or `tests/e2e/cli-runner.ts` is in the diff, and one `doctor` on its fixture takes about 8 s on an idle machine, three CLI runs against a 30 s limit). Rerun `npm run coverage` exit 0: 298 files, 1,874 passed, 3 skipped, 95.65% lines, 91.55% branches; `e2e-support-limitations` 2 passed in 20.8 s; `readme-config-example` 6 passed.
- Reread fix: after the full runs, the reread against criterion 1 ("no README sentence says a call is denied at the ceiling without it") found `README.md:31` (feature list: "tool calls are blocked") still unconditional, listed by `codereview_02` as an optional improvement; it now adds "as long as the context window is trusted (reported by the harness or declared); with the `contextWindowCeiling` fallback, the brake only warns". This README-only change after the green run was checked with `npx vitest run tests/unit/readme-config-example.test.ts tests/unit/readme-light-example.test.ts tests/unit/readme-support-table.test.ts` (3 files, 12 passed) and `npm run package:smoke` exit 0; no code changed, so the green full run stays valid for the code. `README.md:49` (harness support levels) and `:179` (the `contextWindowCeiling` rule) already carry the condition.
- J3 (jev shadow): first call `escalate` before the reread fix; a second call on the changed diff is logged with `effect: diff-changed` on the first.
- Validated state: working tree at `e0a9604` plus the feature diff and both correction rounds; Windows only; Linux and macOS through CI.
- Open items: the `e2e-support-limitations` doctor case runs close to its 30 s timeout under a loaded full suite (3 timeouts in 5 full runs this session); pre-existing, outside this feature, not changed here.
