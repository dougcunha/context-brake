# Implementation plan — Mod as the context source for Claude Code

## Stable sources

- PRD: `tasks/prd-18-mod-como-fonte-do-contexto/prd.md`
- TechSpec: `tasks/prd-18-mod-como-fonte-do-contexto/techspec.md`

> Common sources come before the task and mutable state; read order does not guarantee a cache hit.

## Dependency graph

| ID | Delivery | Depends on | Unblocks |
| --- | --- | --- | --- |
| T01 | A real Claude Code session shows what `$.session.usage()` returns, when, and for which session id; the findings sit in the research file and the minimum version is decided | — | T02, T03 |
| T02 | The mod publishes the context reading and the hook uses it, so a repository where the mod is installed by hand already gets `source=measured` with the real window | T01 | T03 |
| T03 | `init` picks mod-first or the bridge by version, migrates an installed bridge, `doctor` and the interactive setup follow, and the docs and schema are current | T02 | — |

## Traceability matrix

| Source ID | Source section | Obligation | Tasks | Evidence or test |
| --- | --- | --- | --- | --- |
| OBJ-01 | `prd.md#outcomes-and-metrics` | Measure without touching `statusLine` | T02, T03 | TC-06 and the manual acceptance |
| OBJ-02 | `prd.md#outcomes-and-metrics` | Bridge behavior unchanged below the minimum | T03 | existing bridge tests plus TC-05 |
| OBJ-03 | `prd.md#outcomes-and-metrics` | Migration returns the earlier `statusLine` | T03 | TC-08 |
| US-01 to US-04 | `prd.md#stories-and-journeys` | Journeys behind FR-03 to FR-07 | T03 | TC-05 to TC-09 |
| FR-01 | `prd.md#functional-requirements` | Mod publishes the reading | T02 | TC-01 |
| FR-02 | `prd.md#functional-requirements` | Hook picks the source (see PRD-A1) | T02 | TC-03, TC-04 |
| FR-03 | `prd.md#functional-requirements` | Version decides mod-first or bridge | T01, T03 | TC-05, TC-16 |
| FR-04 | `prd.md#functional-requirements` | Mod-first leaves `statusLine` alone | T03 | TC-06 |
| FR-05 | `prd.md#functional-requirements` | Flags keep their meaning | T03 | TC-07 |
| FR-06 | `prd.md#functional-requirements` | Bridge migrates to the mod | T03 | TC-08 |
| FR-07 | `prd.md#functional-requirements` | Doctor reports the source | T03 | TC-09 |
| FR-08 | `prd.md#functional-requirements` | Remove leaves `statusLine` as it is | T03 | TC-10 |
| FR-09 | `prd.md#functional-requirements` | Failing `usage()` is harmless | T02 | TC-02 |
| NFR-01 | `prd.md#non-functional-requirements` | No mixed or corrupt reading (see PRD-A2) | T01, T02 | TC-11 |
| NFR-02 | `prd.md#non-functional-requirements` | Counts and timestamps only | T02 | TC-01, TC-12 |
| NFR-03 | `prd.md#non-functional-requirements` | Bundle rules | T02 | TC-13 |
| NFR-04 | `prd.md#non-functional-requirements` | Mod failure never blocks | T02 | TC-02, TC-14 |
| NFR-05 | `prd.md#non-functional-requirements` | Three platforms | T02, T03 | TC-14, CI matrix |
| DEC-01 to DEC-04, DEC-10 | `techspec.md#technical-decisions` | Reading carrier, schema, selection, events, bundle | T02 | TC-01 to TC-04, TC-11 to TC-13 |
| DEC-05 to DEC-09 | `techspec.md#technical-decisions` | Version decision, install gate, migration, doctor, assistant | T03 | TC-05 to TC-10, TC-15 |
| TC-16 | `techspec.md#test-approach` | Probe findings recorded | T01 | research file |

## Tasks

- [T01 — Probe the mod's usage reading on a real session](done/task_01.md): measure `usage()`, hook order, session id equality, and `$.fs.write`; record them and decide the minimum version.
- [T02 — Publish and use the mod's context reading](done/task_02.md): schema, mod publisher, hook-side selection, with their tests.
- [T03 — Choose mod-first at install, migrate, and report](done/task_03.md): version decision, install and migration plans, doctor, assistant, README, research file, schema.

## Coverage gate

- Coverage: pass. Every FR, NFR, OBJ, DEC, and TC has a task; PRD-A1 and PRD-A2 are open for the merged HIL 2.
- Traceability: pass.
- Dependencies: pass. T01 to T02 to T03, acyclic; T02 is usable alone with a hand-installed mod, T03 is not.
- Atomicity: pass with a note. The lean level asks for one or two tasks; this plan has three because T02 and T03 each already fit one session and merging them would not.
- Executability: pass. Commands exist in `AGENTS.md`.
- Validation profile: pass. In-process unit and integration tests; no new end-to-end file; platforms by CI; T01 is the only task needing the installed `claude`.
- Idempotency: pass. TC-06 and TC-08 run `init` twice.

## Assumptions and open items

- Assumption: the 2.1.296 binary on this machine can load a throwaway mod through `claude --plugin-dir` in `-p` mode (prd-11 verified mods run under `claude -p`).
- Resolved: T01 may install Claude Code `2.1.287` and `2.1.289` in a temporary folder through npm, outside the repository (D-10).
- Resolved: PRD-A1 and PRD-A2 applied to the PRD (D-09).
- Required environment: T01 needs the installed `claude` 2.1.296 and a throwaway folder in the scratchpad; authorization to run `claude -p` sessions and the npm install of older versions into that folder, given at HIL 2 (D-10). None of the other tasks needs one.

## State

- [x] T01 — approved (probe findings in the research file; minimum version 2.1.287)
- [x] T02 — approved (tests and a real-session run)
- [x] T03 — approved (tests, an end-to-end run with the built CLI and a real session)

## Problems and solutions

- T03: the real CLI injected no process runner, so the version was never probed and mod-first would never have activated; `detectContextSource` falls back to its own runner (DEC-05). Three existing tests started probing the real `claude`; they now inject a runner or the new capability text. The end-to-end run found that the shared marketplace name loads another repository's copy of the mod; recorded as a risk with a doctor remediation.
- T02: the first built mod failed `claude plugin validate` (a closure received `$`); replaced by a top-level function with no module state. Test-file names in the TechSpec now match the integration folder.
- T01: the probe's first background reader died with its shell; rerun with the reader and `claude` in one command. The unguarded `tool.call` probe hook drew a validator warning; T02 guards every handler.
