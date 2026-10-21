# Stable execution context

Load in this exact order:

1. `tasks/prd-21-manual-handoff-command/prd.md`
2. `tasks/prd-21-manual-handoff-command/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T04 — README and research record

## Outcome

The README section "Automatic Restart in Claude Code" has a `/handoff [focus]` bullet (what it does in each mode, the refusal cases, the loop-guard reset). The Claude Code section of `docs/research/harness-integrations.md` records the command API evidence, the seed wait after `/clear`, and the open gaps P-02, P-04, P-05, and D-01, marked as "to be measured by the manual acceptance".

## Dependencies and boundaries

- Depends on: T03
- Unblocks: —
- In scope: `README.md`; `docs/research/harness-integrations.md` (Portuguese, as the file is).
- Out of scope: the `init` wizard (`src/cli/assistant/`); any code.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-14 | `prd.md#functional-requirements` | README bullet |
| FR-12 | `prd.md#functional-requirements` | No schema change (`schemas:check`) |
| NFR-04, NFR-07 | `prd.md#non-functional-requirements` | Research record |
| CMP-11, TC-17 | `techspec.md` | Docs and check |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/harness-adapters.md` (Source of Truth); `AGENTS.md` (research section rule).
- Existing code: `README.md` "Automatic Restart in Claude Code"; `docs/research/harness-integrations.md` "Mods (PRD-11)".
- Contract or integration: TechSpec "Sources and traceability" and "Risks and open items".

## Work

- [x] T04.1 Add the README bullet.
- [x] T04.2 Add a research entry "Comando `/handoff` (PRD-21)" with the sources, dates, the seed wait, and the open gaps.
- [x] T04.3 Run `npm run schemas:check`.

## Acceptance criteria

- README bullet names `/handoff [focus]`, both modes, the off and stand-down refusals, and the counter reset.
- The research entry cites the vendor page, the 2.1.301 declarations, the changelog check, and the 2.1.296 measurement, and lists P-02, P-04, P-05, D-01 as open until MA-01..MA-04.
- `npm run schemas:check` passes; `src/cli/assistant/` has no diff.

## Verification

- Unit: not applicable.
- Integration: not applicable.
- End-to-end: not applicable.
- Manual: read the diff.
- Platforms: not applicable.
- Commands: `npm run schemas:check`; `npm run lint`.
- Environment dependency: none.
- Expected evidence: diff; command output.

## Affected files

- Modify: `README.md`, `docs/research/harness-integrations.md`

## Observability and recovery

- Operational signal: none.
- Recovery: revert the files.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: the README section "Automatic Restart in Claude Code" has a "Manual handoff" bullet (`/handoff [focus]`, both modes, the 500-character focus that is never logged, the loop-guard reset, the off and stand-down refusals, the wait for an idle session, and the retry when the reply has no signal), and "How it works" says the mod waits until the new session is active (3 seconds at most) before the seed. The Claude Code research section has the entry "Comando `/handoff` e semente após `/clear` (PRD-21)" with the vendor sources, the 2.1.301 declarations, the changelog check, the 2.1.296 measurement, the validator result, and the open gaps (command after `/clear`, submit inside `command.run`, 2 plugins with `/handoff`, first version with `command.register`, live id timing), to be measured by MA-01..MA-05.
- Changed files: `README.md`, `docs/research/harness-integrations.md`.
- Checks: `npm run schemas:check`: exit 0. `npm run lint`: no issues. `git status --short src/cli/assistant`: no change.
- Validated state: working tree on base `c17fd0a` plus T01..T03, Windows 11.
- Open items: none for this task; the live checks stay for the user.

### ADR candidates

None - direct TechSpec implementation or local decision.
