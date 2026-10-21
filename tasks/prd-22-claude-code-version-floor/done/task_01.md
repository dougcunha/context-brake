# Stable execution context

Load in this exact order:

1. `tasks/prd-22-claude-code-version-floor/prd.md`
2. `tasks/prd-22-claude-code-version-floor/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T01 — Report the Claude Code minimum version

## Outcome

`doctor` gives `minimumVersion: "2.1.97"` for `claude-code` and no `VERSION_FLOOR_UNVERIFIED` finding for it; a `claude` below 2.1.97 gets the existing old-version limitation; the research section records the evidence.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: the constant, its use in `probeVersion`, the research line, and the 4 test files in the TechSpec.
- Out of scope: other adapters, core services, doctor severity or exit-code rules, the mod floor.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01..FR-05 | `prd.md#functional-requirements` | All |
| NFR-01..NFR-03 | `prd.md#non-functional-requirements` | All |
| DEC-01..DEC-05, CMP-01..CMP-03 | `techspec.md#technical-decisions` | All |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/code-standards.md`, `tests.md`, `harness-adapters.md`, `cli-output.md`; skill `ts-tests` for how many tests.
- Existing code: `src/infrastructure/harnesses/claude-code/adapter.ts:32-34`, `src/infrastructure/harnesses/common/version-probes.ts:7-29`, `src/core/services/support-service.ts:9-44`.
- Contract or integration: `techspec.md#contracts-and-data`.
- Harness reference: `docs/research/harness-integrations.md`, Claude Code section, line 69; changelog copy in the session scratchpad or https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md.

## Work

- [x] T01.1 Add `CLAUDE_MINIMUM_VERSION` to `capabilities.ts` (DEC-01).
- [x] T01.2 Pass it in `ClaudeAdapter.probeVersion` (DEC-02).
- [x] T01.3 Update `tests/integration/adapter-version-probes.test.ts`: TC-01, TC-02, TC-03.
- [x] T01.4 Update `init-remove-footprint`, `linked-project-root-lifecycle`, and `e2e-09` per DEC-05 (TC-04, TC-05, TC-06).
- [x] T01.5 Rewrite the "Versão mínima" line of the Claude Code research section (FR-04).

## Acceptance criteria

- TC-01 to TC-06 pass; `npm run schemas:check` passes.
- `context-brake doctor` (built) in this repository shows no `VERSION_FLOOR_UNVERIFIED` for `claude-code`.

## Verification

- Unit: not applicable (no core change).
- Integration: `tests/integration/adapter-version-probes.test.ts`, `init-remove-footprint.test.ts`, `linked-project-root-lifecycle.test.ts`.
- End-to-end: `tests/bench/e2e-09.test.ts` after `npm run build`.
- Manual: `node dist/src/cli/main.js doctor` (or the package bin) in this repository.
- Platforms: Windows locally; Linux and macOS in CI.
- Commands: `npm run lint`, `npm run typecheck`, `npm run coverage` (touched suites by path first), `npm run schemas:check`.
- Environment dependency: none.
- Expected evidence: test counts and exit codes; doctor output lines.

## Affected files

- Modify: `src/infrastructure/harnesses/claude-code/capabilities.ts`, `src/infrastructure/harnesses/claude-code/adapter.ts`, `docs/research/harness-integrations.md`, `tests/integration/adapter-version-probes.test.ts`, `tests/integration/init-remove-footprint.test.ts`, `tests/integration/linked-project-root-lifecycle.test.ts`, `tests/bench/e2e-09.test.ts`.

## Observability and recovery

- Operational signal: `doctor` output.
- Recovery: revert the diff.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `ClaudeAdapter.probeVersion` passes `CLAUDE_MINIMUM_VERSION` (`2.1.97`) to `probeExecutableVersion`; `doctor` reports `support.minimumVersion: "2.1.97"` for `claude-code` and no `VERSION_FLOOR_UNVERIFIED` for it; a `claude` below 2.1.97 is `old` and loses `post_tool_telemetry` and `session_boot` support with the "older than minimum 2.1.97" limitation. Research line 69 records the per-mechanism versions, the source, and the 3 gaps.
- Changed files: `src/infrastructure/harnesses/claude-code/capabilities.ts`, `src/infrastructure/harnesses/claude-code/adapter.ts`, `docs/research/harness-integrations.md`, `tests/integration/adapter-version-probes.test.ts`, `tests/integration/init-remove-footprint.test.ts`, `tests/integration/linked-project-root-lifecycle.test.ts`, `tests/bench/e2e-09.test.ts`.
- Checks: before the change, TC-01 to TC-03 fail by construction (probe gave `minimumVersion: null` and `resolved` for 2.1.96), and the 2 in-process doctor tests failed with exit 0 instead of 1 once the floor was set. After: `adapter-version-probes` 7/7, `init-remove-footprint` + `linked-project-root-lifecycle` 4/4, `doctor-service` + `harness-adapters` 16/16, `e2e-09` (built CLI, bench config) 2/2; `npm run lint` clean; `npm run typecheck` clean; `npm run schemas:check` clean; `npm run coverage` 272 files, 1432 passed, 1 skipped, 96.11% lines. Manual: built `doctor --json` in this repository gives `status: healthy`, `exitCode: 0`, `minimumVersion: 2.1.97`, no floor warning.
- Validated state: worktree on base 419c0bd with this diff; Windows 11, Node 24.20.0. Linux and macOS not run locally.
- Open items: DEC-05 refined in implementation: the in-process tests use the fake runner, so their doctor result is deterministic and they assert `exitCode 0` and `status: healthy`; only `e2e-09` (real runner) asserts exit code equal to the report's `exitCode`. Quality profile: no blocking or reservation hit. The constant carries one comment that names the changelog source (allowed by `code-standards.md`: the reason is a harness fact the code cannot express).

### ADR candidates

None - direct TechSpec implementation or local decision
