# Stable execution context

Load in this exact order:

1. `tasks/prd-15-configuracao-guiada-higiene-e-exclusao/prd.md`
2. `tasks/prd-15-configuracao-guiada-higiene-e-exclusao/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T08 — Document and close the gates

## Outcome

The README and the harness research notes describe the new behavior (persistent `--exclude-harness`, `excludedHarnesses`, the configuration repair, and the retired-event cleanup), and the repository gates are green: lint, typecheck, coverage, schemas, and the 120 s test budget.

## Dependencies and boundaries

- Depends on: T04, T07
- Unblocks: —
- In scope: `README.md` (init flags table, configuration reference, a short upgrade note); `docs/research/harness-integrations.md` notes per affected harness that `init` and `remove` also delete ContextBrake entries for events outside the current set; running every gate.
- Out of scope: new behavior; the interactive assistant (prd-16).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-05..FR-07 | `prd.md#functional-requirements` | User-facing semantics documented |
| NFR-03 | `prd.md#non-functional-requirements` | Suite within 120 s |
| NFR-04 | `prd.md#non-functional-requirements` | Schemas current |
| DEC-14 | `techspec.md#technical-decisions` | Runtime strict read documented as a known interim state |
| CMP-18 | `techspec.md#components-and-flow` | Docs and schema |
| TC-12, TC-18 | `techspec.md#test-approach` | Schema check; budget |

## Context to recover on demand

- Applicable skills and rules: `harness-adapters.md` (update the research section when behavior differs), `cli-output.md`, `code-standards.md`.
- Existing code and docs: `README.md:270` (init flags row) and the configuration reference; `tests/unit/readme-config-example.test.ts` (README example must stay valid); `docs/research/harness-integrations.md` sections of Claude Code, Codex CLI, Cursor, GitHub Copilot CLI, Antigravity CLI; `scripts/check-schemas.ts`, `scripts/check-test-budget.ts`.
- Contract or integration: `techspec.md#observability-and-rollout`.

## Work

- [x] T08.1 README: `--exclude-harness <id>` now turns the harness off persistently (and `--harness <id>` turns it back on); document `excludedHarnesses` in the configuration reference; one note that `init` repairs a configuration with unrecognized keys and removes hooks for retired events.
- [x] T08.2 Research note per affected harness section: ContextBrake removes its own hook entries for events outside the current set on `init` and `remove`, using the ownership rule of that adapter.
- [x] T08.3 Run the gates and record results in the handoff: `npm run lint`, `npm run typecheck`, `npm run coverage`, `npm run schemas:check`, `npm run test:budget`.

## Acceptance criteria

- The README example config still validates (`readme-config-example` test green) and mentions `excludedHarnesses` only where valid.
- Every gate command exits `0`; `npm test` and `npm run coverage` finish within 120 s; coverage stays at or above the project minimum.
- No new behavior is introduced in this task.

## Verification

- Unit: `tests/unit/readme-config-example.test.ts`.
- Integration: the whole suite through `npm run coverage`.
- End-to-end: not applicable here (TC-17 in QA).
- Manual: none.
- Platforms: Linux, macOS, Windows (suite is platform-neutral; link tests skip with a reason where unavailable).
- Commands: `npm run lint`, `npm run typecheck`, `npm run coverage`, `npm run schemas:check`, `npm run test:budget`.
- Environment dependency: none.
- Expected evidence: command outputs with exit codes and the test count in the handoff.

## Affected files

- Modify: `README.md`, `docs/research/harness-integrations.md`
- Create: —

## Observability and recovery

- Operational signal: none.
- Recovery: revert the documentation commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: README documents the persistent `--exclude-harness`/`--harness` behavior (a new "Excluding a Harness" section, the `excludedHarnesses` key, and the init row of the CLI table) and the upgrade path (a new "Upgrading From an Earlier Build" section: `init` previews and drops unrecognized keys, `doctor` names them, `remove` ignores them, retired-event hook entries are deleted). `docs/research/harness-integrations.md` has one "Entradas aposentadas (PRD-15)" bullet in each of the Claude Code, Codex CLI, Cursor, GitHub Copilot CLI, and Antigravity CLI sections, naming each adapter's ownership rule.
- Changed files: modified `README.md`, `docs/research/harness-integrations.md`. No code.
- Checks: `npm run lint`, `npm run typecheck`, `npm run schemas:check`, `npm run dependencies:check` clean; `tests/unit/readme-config-example.test.ts` passes (11 tests); `npm run test:budget`: 87.4 s wall (budget 120 s); the last `npm run coverage` (after T07, no code changed since): 233 files, 1242 tests passed, 95.6 s, 94.26%.
- Validated state: HEAD `c845728` plus the uncommitted working tree of T01..T08; Windows 11, Node 24.19.
- Open items: the one 126.2 s budget reading during T02 did not recur (92 to 105 s for coverage and 87.4 s for `test:budget` afterwards), so it was machine load, not a regression. Linux and macOS were not run in this session (Windows only); the symbolic-link tests ran here and skip with a reason where links are unavailable.

### ADR candidates

None - direct TechSpec implementation or local decision.
