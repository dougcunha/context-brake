# Stable execution context

Load in this exact order:

1. `tasks/prd-11-reinicio-automatico-no-claude-code/prd.md`
2. `tasks/prd-11-reinicio-automatico-no-claude-code/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T01 — Capture the mods API behavior in a real session

## Outcome

The mods API facts the design depends on are recorded as fixtures and in the research file, and `DEC-03` and `DEC-08` are confirmed or amended with evidence.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T03, T04
- In scope: a throwaway probe mod in the scratchpad (not committed); real-session captures; fixtures; the Claude Code section of `docs/research/harness-integrations.md`; amendments to the TechSpec.
- Out of scope: product code, `init` changes, any file outside fixtures, research and the TechSpec.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| DEC-13 | `techspec.md#technical-decisions` | Fixtures from a real session |
| DEC-03, DEC-08 | `techspec.md#technical-decisions` | Seed event and loader confirmed |
| FR-11 | `prd.md#functional-requirements` | Research updated with verified behavior |
| OI-02, OI-03 | `techspec.md#risks-and-open-items` | Loader and `answer` truncation |

## Context to recover on demand

- Applicable skills and rules: `plugin-authoring` skill; `harness-adapters.md` (source of truth, fixtures).
- Existing code: `tests/fixtures/harnesses/claude-code/` — fixture layout and naming.
- Contract or integration: `techspec.md#integrations-and-interfaces`.
- Harness reference: `docs/research/harness-integrations.md#claude-code`; `code.claude.com/docs/en/plugins/mods/{reference,events}`.

## Work

- [x] T01.1 Write a probe mod that logs, with `$.fs.write`, the shape of `turn.complete` (reason, answer tail, agentId), `classic.SessionStart` after `/clear` (source, session id), and the result of `$.command.run({ command: 'clear' })` queued after a turn.
- [x] T01.2 Load it in a real interactive session through each loader candidate: `CLAUDE_CODE_PLUGIN_DIRS` in project-local `.claude/settings.local.json` `env`, then `--plugin-dir`; record which work, whether a restart or `/reload-plugins` is needed, and any trust prompt.
- [x] T01.3 Verify: the seed event fires once after the mod's clear and also after a person-typed `/clear` (to confirm the pending-record design); a long reply keeps the tail in `answer`; `prompt.submit` origin kinds for typed versus seeded prompts; behavior in light and full mode repositories.
- [x] T01.4 Save redacted captures as fixtures under `tests/fixtures/harnesses/claude-code/mod/` and update the research section (replace "no documented hook opens a new session" with the verified behavior, with date and Claude Code version).
- [x] T01.5 Amend `techspec.md` where evidence differs (DEC-03, DEC-08, OI-02, OI-03) and record the result in `workflow.md`.

## Acceptance criteria

- Fixtures exist for `turn.complete`, `classic.SessionStart` (clear), `command.run` result and `prompt.submit` origins, with no personal data.
- The research section states what was verified, with date and version, and what stays undocumented.
- `DEC-08` names one working loader or states the fallback as the shipped behavior.
- If any assumption fails, the TechSpec change is recorded and presented before T03 starts.

## Verification

- Unit: not applicable.
- Integration: not applicable (fixtures are consumed from T04).
- End-to-end: not applicable.
- Manual: the probe runs described above, executed by the maintainer in a real session; expected result is recorded in the handoff with Claude Code version and OS.
- Platforms: Windows (PowerShell) and one POSIX system.
- Commands: `npm run lint`, `npm run typecheck`, `npm test` (fixtures must not break existing suites).
- Environment dependency: interactive Claude Code >= 2.1.287 and a scratch repository; requires the maintainer to run the session.
- Expected evidence: fixtures, research diff, handoff with the observed results.

## Affected files

- Modify: `docs/research/harness-integrations.md`, `tasks/prd-11-reinicio-automatico-no-claude-code/techspec.md`
- Create: `tests/fixtures/harnesses/claude-code/mod/*`

## Observability and recovery

- Operational signal: the probe's own log in the scratchpad.
- Recovery: delete the scratch repository and the probe; nothing shipped.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: Probe mod run by the maintainer on Windows 11 with Claude Code 2.1.289 (interactive, two full rounds) and by the agent headless (`claude -p`). Verified: (1) `turn.complete` carries the full `answer` (tail intact at 15,496 characters), `reason`, `isAborted`, no `agentId` on main turns. (2) A `$.command.run({command:"clear"})` queued without await after the turn works; `session.end` reason `clear` follows in about 100 ms and the promise resolves `{text:""}` about 70 ms later with a new session id. (3) `$.prompt.submit` called when that promise resolves reaches the new session with origin `{kind:"plugin",name}`, is answered (`seeded`), and is invisible to the calling plugin's own `prompt.submit` hook; reproduced in two runs. (4) A person-typed `/clear` also reports `session.end` reason `clear` but never passes through the mod's promise. (5) `classic.*` events were not delivered in interactive sessions, with or without a SessionStart settings hook; they fire under `-p`. (6) Project-scoped settings cannot set `CLAUDE_CODE_PLUGIN_DIRS` (ignored with a warning); a directory marketplace plus `enabledPlugins` in `.claude/settings.local.json` loads the mod on the first run without `plugin install`. DEC-03 and DEC-08 amended in the TechSpec, PRD assumptions marked resolved, research section updated (Claude Code, 04/10/2026).
- Changed files: `docs/research/harness-integrations.md`, `tasks/prd-11-reinicio-automatico-no-claude-code/{techspec,prd}.md` (assumptions and DEC-03, DEC-08, DEC-13, test cases TC-10, TC-17, TC-18, TC-20), `task_04.md`, `task_05.md` (wording), new `tests/fixtures/harnesses/claude-code/mod/{observed-events,local-marketplace-loader}.json`. The probe itself stays outside the repository in `D:/scratch/cb-probe`.
- Checks: `claude plugin validate` passes on the probe and on the local marketplace; logs `D:/scratch/r2/log-r2-a.json` and `log-r2-b.json` reviewed; headless runs recorded in `D:/scratch/r2/debug-*.log`. No repository code changed, so no test run was needed.
- Validated state: Claude Code 2.1.289, Windows 11, terminal surface, probe 0.2.0. Not verified: other operating systems, the Desktop app, light and full ContextBrake repositories running the probe side by side, and the interactive first-launch trust prompt for the marketplace loader (covered by MA-01 in T07).
- Open items: the TechSpec change (loader and seed mechanism, DEC-03 and DEC-08) was made by the agent under the T01 scope and is reported to the human for confirmation at the next gate; behavior required by the PRD is unchanged.

### ADR candidates

None - direct TechSpec implementation or local decision
