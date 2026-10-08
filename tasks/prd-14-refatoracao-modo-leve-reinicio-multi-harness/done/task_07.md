# Stable execution context

Load in this exact order:

1. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/prd.md`
2. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T07 — Restart on OpenCode

> Amended by DEC-HIL-04 (2026-10-07): T01 found that OpenCode 2.x rejects the v1 plugin shape. Only the declared-unavailable path applies: T07.1, T07.4, and T07.5. T07.2 and T07.3 are out of scope; the follow-up PRD owns them.

## Outcome

Where T01 passed P1-P4 for OpenCode, `init --auto-restart` plans `.opencode/plugins/context-brake-restart.js`; on a valid marker reply it claims the pending handoff, opens a new session through the TUI, and submits a seed that carries the resume text, because OpenCode has no session-start injection. Where T01 did not pass, OpenCode declares that no restart mode is available.

## Dependencies and boundaries

- Depends on: T01, T03, T04
- Unblocks: T08
- In scope: restart plugin asset, `RestartHost` over the SDK client, guard store, planner entry, capability text, tests from T01 captures.
- Out of scope: OpenCode telemetry and boot capabilities; init target check (T08).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-02, FR-04, FR-07, FR-09, FR-10, FR-12 | `prd.md#functional-requirements` | Automatic restart on OpenCode or its declared absence |
| NFR-01, NFR-05 | `prd.md#non-functional-requirements` | Safety; opt-in file |
| DEC-03, DEC-06, DEC-10, DEC-15 | `techspec.md#technical-decisions` | Resume in seed, flow, destination, separate file |
| CMP-10, CMP-11 | `techspec.md#components-and-flow` | Files |
| TC-09 | `techspec.md#test-approach` | Tests |

## Context to recover on demand

- Applicable rules: `harness-adapters.md`, `node.md`, `file-changes.md`, `tests.md`.
- Existing code: `src/infrastructure/harnesses/opencode/{runtime,events,planner,capabilities,adapter}.ts`; `assets/runtime/opencode-plugin.ts`; `scripts/asset-bundler.ts`.
- Harness reference: OpenCode section as updated by T01; T01 handoff.

## Work

- [x] T07.1 Read the T01 handoff and record the destination here.
- [ ] T07.2 (out of scope, DEC-HIL-04) Automatic path: `assets/runtime/opencode-restart.ts` and `src/infrastructure/harnesses/opencode/restart-host.ts` with the SDK calls T01 verified; `sessionBoot: false` so the seed carries the resume text; failure notice names the archived path.
- [ ] T07.3 (out of scope, DEC-HIL-04) Simulated-host tests with a fake client shaped by the T01 captures (TC-09 cases).
- [x] T07.4 Otherwise: capability impact text "No restart: this harness cannot inject the resume instruction." and a test asserting it.
- [x] T07.5 Update the OpenCode research section with the implemented behavior.

## Acceptance criteria

- TC-09 passes (automatic) or the declared-unavailable test passes, matching T01.
- With `autoRestart` absent, no restart plugin is planned.

## Verification

- Unit: helpers if extracted.
- Integration: `tests/integration/opencode-restart.test.ts`.
- End-to-end: not applicable.
- Manual: real-session check at HIL 3 when automatic.
- Platforms: all, through CI.
- Commands: `npm run lint`, `npm run typecheck`, `npm run build`, touched suites by path.
- Environment dependency: T01 captures.
- Expected evidence: passing suites.

## Affected files

- Modify: `src/infrastructure/harnesses/opencode/{planner,capabilities,adapter}.ts`, `scripts/asset-bundler.ts`, `docs/research/harness-integrations.md`.
- Create (automatic only): `assets/runtime/opencode-restart.ts`, `src/infrastructure/harnesses/opencode/restart-host.ts`, `tests/integration/opencode-restart.test.ts`.

## Observability and recovery

- Operational signal: v2 log under `runtime/restart/opencode/`.
- Recovery: `init --no-auto-restart` removes the plugin.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: destination from T01 and DEC-HIL-04: OpenCode has no restart mode in prd-14. `opencode/capabilities.ts` declares `auto_restart: unsupported` with "No restart: this harness cannot inject the resume instruction." No restart plugin is planned for OpenCode.
- Changed files: src/infrastructure/harnesses/opencode/capabilities.ts; tests/unit/harness-adapters.test.ts (approved OpenCode row).
- Checks: `tests/unit/harness-adapters.test.ts` 8 passed. The research OpenCode section already records the 2.x findings and the follow-up PRD (T01).
- Validated state: Windows 11, Node 24.19.0, base a31e183 plus T01-T07 diff.
- Open items: T07.2 and T07.3 belong to the follow-up OpenCode 2.x migration PRD. The existing OpenCode telemetry plugin does not load on OpenCode 2.x (pre-existing defect, recorded in workflow.md).

### ADR candidates

None - direct TechSpec implementation or local decision.
