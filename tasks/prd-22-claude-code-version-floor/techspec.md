# TechSpec — Verified minimum version for Claude Code

## Sources and traceability

- PRD: `tasks/prd-22-claude-code-version-floor/prd.md` (FR-01 to FR-05, NFR-01 to NFR-03).
- Rules: `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `harness-adapters.md`, `cli-output.md`.
- Research: `docs/research/harness-integrations.md`, Claude Code section, "Versão mínima" line (line 69).
- Evidence in code: `ClaudeAdapter.probeVersion` (`src/infrastructure/harnesses/claude-code/adapter.ts:32-34`), `probeExecutableVersion` (`src/infrastructure/harnesses/common/version-probes.ts:7-29`), `unverifiedFloorFinding` (`src/core/services/doctor-service.ts:39-47`), `gatedState`, `versionImpact` and `floorLimitation` (`src/core/services/support-service.ts:9-44`), `collectHarnessSources` (`src/cli/detection-collector.ts:6-25`).

## Solution summary

The Claude Code adapter passes a named floor constant, `2.1.97`, to the existing `probeExecutableVersion`. The probe then carries `minimumVersion: "2.1.97"` in every result (resolved, old, unknown, timed out, malformed). `deriveSupportProfile` copies it to the profile, so `unverifiedFloorFinding` returns `null` and `floorLimitation` adds nothing. A version below the floor gets `status: "old"`, which the support service already turns into `unknown` capabilities with the "older than minimum" text. No core, CLI, or schema code changes.

The research line records the per-mechanism versions, the changelog source, and the 3 gaps.

## Technical decisions

| ID | PRD obligations | Decision | Reason and evidence | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-01 | FR-01, NFR-03 | Add `export const CLAUDE_MINIMUM_VERSION = '2.1.97';` to `src/infrastructure/harnesses/claude-code/capabilities.ts`, with a one-line comment that names the changelog entry (`refreshInterval`, the highest core mechanism) and points to the research section. | The floor guards the capabilities declared in that file; it has 8 lines and 1 export. `MODS_MINIMUM_CLAUDE_VERSION` stays in `auto-restart-diagnostics.ts` because it guards the mod only. | Put it in `auto-restart-diagnostics.ts` next to the mod floor: mixes two floors with different scope. A new `versions.ts`: one more file for one constant. |
| DEC-02 | FR-01, FR-02, FR-03 | `ClaudeAdapter.probeVersion` calls `probeExecutableVersion(context.runner, CLAUDE_EXECUTABLES, CLAUDE_MINIMUM_VERSION)`. | The third parameter exists for this purpose (`version-probes.ts:10`); every return path carries it. | Set the floor in `capabilityProfile`: the probe in the doctor report would still show `minimumVersion: null`, and the `old` status would never be computed. |
| DEC-03 | FR-02 | No change when the harness has no detection evidence: the collector skips the probe (`detection-collector.ts:13`), `support.minimumVersion` stays `null`, and the doctor keeps the warning. | This path only runs when Claude Code is not detected, where the integration is missing anyway. | Seed the floor in `capabilityProfile` when `version` is undefined: changes core behavior for an edge with no user value. |
| DEC-04 | FR-05 | Other adapters keep the default `null`. The test "returns an unknown probe from every adapter" expects `CLAUDE_MINIMUM_VERSION` for `claude-code` and `null` for the rest. | Keeps FR-05 under test. | — |
| DEC-05 | FR-02 | Tests that used the `claude-code` floor warning as their known warning stop asserting it and do not fix the exit code to 1. They assert that the report has no `VERSION_FLOOR_UNVERIFIED` for `claude-code`, that `support.minimumVersion` is `2.1.97`, and that the exit code matches `status` (`warnings` → 1, `ok` → 0). | The other warnings after `init --yes` depend on the machine (`claude` on `PATH`, user status line), so a fixed exit code is not deterministic once the floor warning is gone. | Fake the runner in the e2e: the built CLI has no injection point. |

## Components and flow

| ID | Component | New or modified | Responsibility | Dependencies |
| --- | --- | --- | --- | --- |
| CMP-01 | `src/infrastructure/harnesses/claude-code/capabilities.ts` | Modified | Holds `CLAUDE_MINIMUM_VERSION` | DEC-01 |
| CMP-02 | `src/infrastructure/harnesses/claude-code/adapter.ts` | Modified | Passes the floor to the probe | CMP-01, DEC-02 |
| CMP-03 | `docs/research/harness-integrations.md` | Modified | Records the floor evidence and gaps | FR-04 |

Flow: `doctor` → `collectHarnessSources` → `ClaudeAdapter.probeVersion` (floor) → `diagnoseHarness` → `capabilityProfile(version)` → `deriveSupportProfile` → `unverifiedFloorFinding` returns `null`.

## Contracts and data

- `doctor --json`: no shape change (NFR-01). Values change: `integrations[].support.minimumVersion` and the version probe's `minimumVersion` become `"2.1.97"` for `claude-code`; the `VERSION_FLOOR_UNVERIFIED` finding for `claude-code` disappears; `status` and `exitCode` follow the remaining findings.
- Text output: the `[WARN] VERSION_FLOOR_UNVERIFIED` block for `claude-code` disappears. Below the floor, the existing limitation text names `2.1.97`.

## Errors, security, and recovery

- Errors and edges: probe timeout, missing executable, or malformed output keep their status and now carry the floor; none of them adds a finding (existing behavior).
- User files: none written.
- Rollback: revert the constant and its use; no persisted state.

## Test approach

- Profile: CLI command `doctor` (one process per run); adapter code runs in the CLI process, not in a harness. Node.js 20+, TypeScript, Vitest. Commands from `AGENTS.md`: `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run schemas:check`.
- End-to-end: `tests/bench/e2e-09.test.ts` runs the built CLI (`npm run build` first); adjusted per DEC-05.
- Platforms: no path or process change (NFR-02); the suite runs on Windows here, with Linux and macOS left to CI.
- Manual acceptance: run `context-brake doctor` in this repository with `claude` 2.1.x ≥ 2.1.97; the `claude-code` floor warning is absent.

| ID | Obligations | Level | Scenario | Expected result | Command or suite |
| --- | --- | --- | --- | --- | --- |
| TC-01 | FR-01, FR-05 | integration | Every adapter probes without a runner | `claude-code` gives `minimumVersion: "2.1.97"`, the rest `null` | `tests/integration/adapter-version-probes.test.ts` |
| TC-02 | FR-01 | integration | Claude adapter with a runner that prints `2.1.300 (Claude Code)` | `status: "resolved"`, `minimumVersion: "2.1.97"` | `tests/integration/adapter-version-probes.test.ts` |
| TC-03 | FR-03 | integration | Claude adapter with a runner that prints `2.1.96 (Claude Code)`, then `capabilityProfile` | `status: "old"`; `post_tool_telemetry` and `session_boot` not `supported`; a limitation names `2.1.97` | `tests/integration/adapter-version-probes.test.ts` |
| TC-04 | FR-02, NFR-01 | integration | `init --yes` then `doctor --json` on a Claude Code fixture | Schema parses; no `VERSION_FLOOR_UNVERIFIED` for `claude-code`; `support.minimumVersion` is `2.1.97`; exit code matches status | `tests/integration/init-remove-footprint.test.ts` |
| TC-05 | FR-02 | integration | `doctor` through a symlinked project root | No crash; text has no `VERSION_FLOOR_UNVERIFIED` | `tests/integration/linked-project-root-lifecycle.test.ts` |
| TC-06 | FR-02 | end-to-end | Built CLI `init` then `doctor` (JSON and text) | Same as TC-04 for JSON; text has no `[WARN] VERSION_FLOOR_UNVERIFIED` | `tests/bench/e2e-09.test.ts` |
| TC-07 | FR-04 | review | Research line | Names 2.1.97, mechanisms, source, date, gaps | diff review |
| TC-08 | NFR-01 | command | Schema currency | Passes | `npm run schemas:check` |

## Quality profile

| ID | Rule | Class | Verification command | Prior justification |
| --- | --- | --- | --- | --- |
| QA-01 | No `any` | blocking | `rg -n --type ts ':\s*any\b\|\bas any\b\|<any>' <diff files>` | — |
| QA-02 | No `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `rg -n --type ts '@ts-ignore\|@ts-nocheck\|eslint-disable' <diff files>` | — |
| QA-03 | File size ≤ 100 lines | reservation | `rg -c -H '^' <diff files> \| awk -F: '$2 > 100'` | — |

- Verification scope: TypeScript files in the task diff.
- Escalation trigger: 8+ reservations, a touched file above 200 lines, or duplication in 3+ places.

### Terrain baseline

| File | Lines | Exported members | Max parameters | Cases | Pre-existing hits | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/infrastructure/harnesses/claude-code/adapter.ts` | 92 | 1 | < 4 | 0 | none | recorded |
| `src/infrastructure/harnesses/claude-code/capabilities.ts` | 8 | 1 | < 4 | 0 | none | recorded |

- Preparatory refactoring: not recommended.

## Risks and open items

- Risk: the 3 changelog gaps (PRD assumptions). Probability low, impact limited to an over-claim on versions 2.1.97 to 2.1.272. Mitigation: the research line names the gaps; raise the constant if a gap is proven later.
- Decided: D-01 = 2.1.97 (H-02).

## Relevant files

- Modify: `src/infrastructure/harnesses/claude-code/capabilities.ts`, `src/infrastructure/harnesses/claude-code/adapter.ts`, `docs/research/harness-integrations.md`, `tests/integration/adapter-version-probes.test.ts`, `tests/integration/init-remove-footprint.test.ts`, `tests/integration/linked-project-root-lifecycle.test.ts`, `tests/bench/e2e-09.test.ts`.
