# Implementation plan — Modo leve

## Stable sources

- PRD: `tasks/prd-07-modo-leve/prd.md`
- TechSpec: `tasks/prd-07-modo-leve/techspec.md`

> Common sources come before the task and mutable state; read order does not guarantee a cache hit.

## Dependency graph

| ID | Delivery | Depends on | Unblocks |
| --- | --- | --- | --- |
| T01 | `lightMode` config contract (trigger zone only), section merge, regenerated config schema | — | T02, T03, T04 |
| T02 | Runtime light mode: guidance, mode resolution, engine, failure policy, `wrap`, `run` refusal | T01 | T06 |
| T03 | `init --light` / `--no-light`: flags, routing, rejections, and light install planning | T01 | T06 |
| T04 | `doctor` in light mode: skipped checks, leftover findings, `checkpointMode`, text | T01 | T05, T06 |
| T05 | `doctor` active-session usage in every mode | T04 | T06 |
| T06 | End-to-end coverage with the built CLI and README documentation | T02, T03, T04, T05 | — |

## Traceability matrix

| Source ID | Source section | Obligation | Tasks | Evidence or test |
| --- | --- | --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | Explicit light mode wins over plan and delegated | T01, T02, T03 | TC-01, TC-03, TC-06, TC-07 |
| FR-02 | `prd.md#functional-requirements` | Never read or write plan, checkpoint, snapshot | T02, T04 | TC-03, TC-04, TC-09 |
| FR-03 | `prd.md#functional-requirements` | Same block format (`v2`) and injection policy | T02 | TC-02, TC-10 |
| FR-04 | `prd.md#functional-requirements` | Trigger zone only; no command | T01, T03 | TC-01, TC-06, TC-07 |
| FR-05 | `prd.md#functional-requirements` | Generic light action texts | T02 | TC-02, TC-10 |
| FR-06 | `prd.md#functional-requirements` | No denial in any zone or failure | T02 | TC-04, TC-05, TC-10 |
| FR-07 | `prd.md#functional-requirements` | No session-start injection | T02 | TC-04, TC-05, TC-10 |
| FR-08 | `prd.md#functional-requirements` | Minimal install footprint | T03, T06 | TC-08, TC-13, TC-14 |
| FR-09 | `prd.md#functional-requirements` | Full → light → full with the `.gitignore` rule | T03, T06 | TC-08, TC-13 |
| FR-10 | `prd.md#functional-requirements` | Rejected options; delegated section kept and inactive | T01, T03, T04 | TC-06, TC-07, TC-09 |
| FR-11 | `prd.md#functional-requirements` | `doctor` checks in light mode | T04 | TC-09 |
| FR-12 | `prd.md#functional-requirements` | `checkpointMode` light in JSON | T04 | TC-09, TC-15 |
| FR-13 | `prd.md#functional-requirements` | `wrap` works; `run` refuses | T02 | TC-10, TC-11 |
| FR-14 | `prd.md#functional-requirements` | Active-session usage in `doctor` | T05, T06 | TC-16, TC-17, TC-13 |
| NFR-01 | `prd.md#non-functional-requirements` | Byte-identical outside light mode (active list only when present) | T01, T03, T04, T05 | TC-01, TC-08, TC-09, TC-12, TC-17 |
| NFR-02 | `prd.md#non-functional-requirements` | No plan, checkpoint, or Git reads on hooks | T02 | TC-03, TC-04 |
| NFR-03 | `prd.md#non-functional-requirements` | Cross-platform, symlinked instruction files | T03 | TC-08, CI matrix |
| NFR-04 | `prd.md#non-functional-requirements` | 60-token / 220-char block budget | T02 | TC-02 |
| NFR-05 | `prd.md#non-functional-requirements` | `doctor` reads only the ledgers, no transcripts or processes | T05 | TC-16, TC-17 |
| OBJ-01–OBJ-05 | `prd.md#outcomes-and-metrics` | End-to-end outcomes | T06 | TC-13, TC-12 |
| DEC-02 | `techspec.md#technical-decisions` | No new exported declaration in `configuration.ts` | T01 | Terrain baseline recheck |
| DEC-07, DEC-08, DEC-10, DEC-12 | `techspec.md#technical-decisions` | Absorbed extractions keep files ≤ 100 lines | T03, T04, T05 | QA-09 |

## Tasks

- [T01 — Contrato de configuração do modo leve](done/task_01.md): the config accepts and validates `lightMode.triggerZone`, and a core merge turns flags into a section update.
- [T02 — Modo leve no runtime](done/task_02.md): hooks, plugins, the failure policy, and `wrap` inject only the generic light telemetry. They never deny or boot, and `run` refuses the mode.
- [T03 — init: ativar e desativar o modo leve](done/task_03.md): `init --light` installs the minimal footprint and cleans managed leftovers, and `--no-light` restores the full install.
- [T04 — doctor no modo leve](done/task_04.md): `doctor` reports light mode, skips the full-mode checks, and flags leftovers without reading the state files.
- [T05 — doctor: uso das sessões ativas](done/task_05.md): `doctor` lists recently active sessions with their current context usage, in every mode.
- [T06 — E2E e documentação](done/task_06.md): the built CLI proves OBJ-01, OBJ-02, OBJ-03, and OBJ-05 against fixture repositories, and the README documents both additions.

## Coverage gate

- Coverage: pass. Every FR and NFR maps to at least one task and one TC.
- Traceability: pass. Every task cites PRD and TechSpec IDs.
- Dependencies: pass. The graph is acyclic.
  - T02, T03, and T04 are independent after T01 and touch disjoint files.
  - T05 follows T04 because both edit `diagnostics.ts`, `doctor-service.ts`, and `text.ts`.
  - `snapshot-helper.ts` belongs to T04 only.
- Atomicity: pass. Each task is one vertical slice with its own tests.
- Executability: pass. The commands come from `AGENTS.md`.
- Validation profile: pass. End-to-end tests run only in T06, through the built CLI. The platform matrix is CI's Linux, macOS, and Windows, and the symlink case follows `tests.md`.
- Idempotency: pass. TC-08 asserts that a second `init --light` plans no change.

## Assumptions and open items

- Assumption: the PRD revisions are approved at the HIL 2 re-presentation:
  - block `v2`;
  - the FR-09 `.gitignore` rule;
  - the FR-10 options;
  - no snapshot command in light mode (PD-03);
  - FR-14, with PD-05's 30 minutes and 10 sessions in every mode.
- CLI QA: skipped (HIL 2 answer).
- Required environment: none beyond `npm install --ignore-scripts`. Rebuild `dist/` before e2e.

## State

- [x] T01 — completed (done/task_01.md)
- [x] T02 — completed (done/task_02.md)
- [x] T03 — completed (done/task_03.md)
- [x] T04 — completed (done/task_04.md)
- [x] T05 — completed (done/task_05.md)
- [x] T06 — completed (done/task_06.md)

## Problems and solutions

- T01: the full `npm run coverage` takes about 10 minutes on this machine, and `e2e-support-limitations` (PRD-01) timed out once under load, then passed alone. Resolution: run targeted suites per task, and the full suite at integration points; rerun a flaky file alone before judging it.
- T03: the config was not idempotent after setting an optional section. `applyDelegatedSnapshot`/`applyLightMode` append the key after `runner`, but parsing returns schema order, so the next `init` rewrote the file. Resolution: `planConfigChange` writes the config in schema key order (`inSchemaOrder`).
- T03: removing a reference block at the end of an instruction file left an extra blank line (`removeReferenceFromBody`). Resolution: no newline is added when the preceding text already ends with one. `remove` benefits too.
- T06: `test-lanes.test.ts` requires every test that spawns processes to be listed in `tests/test-lanes.ts`. Resolution: registered `wrap-light-mode`, `doctor-light-mode`, and `doctor-active-sessions` in the process lane.
