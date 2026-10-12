# Stable execution context

Load in this exact order:

1. `tasks/prd-18-mod-como-fonte-do-contexto/prd.md`
2. `tasks/prd-18-mod-como-fonte-do-contexto/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T01 — Probe the mod's usage reading on a real session

## Outcome

A section of `docs/research/harness-integrations.md` states, from a real session, what `$.session.usage()` returns and when; whether the mod's `tool.call` publish precedes the settings `PostToolUse` hook; whether `$.session.id()` equals the hooks' `session_id` (also after `/clear`); how `$.fs.write` behaves under repeated writes; and the minimum Claude Code version that has `usage()`. The TechSpec carries the decided constant.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T02, T03
- In scope: a throwaway probe mod and a throwaway settings hook in the scratchpad (outside the repository); `claude -p` runs with a tool call and a `/clear`; the research section; the minimum-version decision recorded in `techspec.md` (DEC-05) and its assumptions confirmed or amended.
- Out of scope: any change under `src/`, `tests/`, `assets/`, or `schemas/`; capturing prompts or replies (record only token counts, ids, and timestamps).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-03 | `prd.md#functional-requirements` | The version the decision compares against |
| NFR-01 | `prd.md#non-functional-requirements` | Atomicity of the write is observed |
| DEC-04, DEC-05 | `techspec.md#technical-decisions` | Event choice and the minimum version |
| TC-16 | `techspec.md#test-approach` | Findings recorded |

## Context to recover on demand

- Applicable skills and rules: `plugin-authoring` skill (probe mod layout and `claude plugin validate`), `harness-adapters.md` (update the harness section when behavior differs).
- Existing code: `src/infrastructure/harnesses/claude-code/mod/mod-log.ts` — how the real mod names its per-session file; `auto-restart-diagnostics.ts` — `MODS_MINIMUM_CLAUDE_VERSION`.
- Contract or integration: `techspec.md#risks-and-open-items`.
- Harness reference: `docs/research/harness-integrations.md`, Claude Code section, "Mods (PRD-11)" and "Carregamento de mods".

## Work

- [x] T01.1 Write the probe mod (`session.start`, `tool.call`, `turn.complete`, `session.end`) that records `{event, at, sessionId, context}` lines through repeated `$.fs.write` calls, and a `PostToolUse` settings hook that records `{event, at, session_id}`; validate the mod with `claude plugin validate`.
- [x] T01.2 Run `claude -p` sessions with several tool calls and one `/clear`; compare timestamps and ids; repeat a rapid-write test of `$.fs.write` and check for torn files.
- [x] T01.3 With authorization, install `@anthropic-ai/claude-code` 2.1.287 and 2.1.289 into a temporary folder and repeat the minimal run to find where `usage()` first exists; without it, record the gap.
- [x] T01.4 Update the research section, `techspec.md` (DEC-05 constant, assumptions confirmed or amended), and delete the throwaway folders.

## Acceptance criteria

- The research section lists, with the Claude Code version and date, each fact above or names it as unverified.
- The probe output contains no prompt, reply, or tool text.
- `techspec.md` states the minimum version with its evidence, or the provisional `2.1.287` with the gap.

## Verification

- Unit: not applicable.
- Integration: not applicable.
- End-to-end: not applicable.
- Manual: run the probe as in T01.2; expected result is the facts above with timestamps; owner: the coordinator session, results reviewed at the review.
- Platforms: Windows (this machine); the other platforms stay unverified and are recorded as such.
- Commands: `claude plugin validate <probe mod folder>`; `npm run lint` and `npm run typecheck` still pass (no code changed).
- Environment dependency: installed `claude`; authorization for older versions through npm is an open item (`tasks.md`).
- Expected evidence: the research section and the amended TechSpec.

## Affected files

- Modify: `docs/research/harness-integrations.md`, `tasks/prd-18-mod-como-fonte-do-contexto/techspec.md`
- Create: none in the repository.

## Observability and recovery

- Operational signal: none.
- Recovery: delete the throwaway folders; revert the two documents.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: the probe ran on a real Claude Code session and the facts are in `docs/research/harness-integrations.md` (bullet "Leitura de contexto pelo mod (PRD-18 T01)"). `$.session.usage()` works at runtime on 2.1.287, 2.1.289 (no login, window only), and 2.1.296 (full runs); the mod's `tool.call` handler ran 0.55 to 2.7 s before the settings `PostToolUse` hook; `$.session.id()` equals the hooks' `session_id`, also after a mod-triggered `/clear`; 400 rewrites of a 6 KB file with `$.fs.write` produced no partial read in 351,709 concurrent reads. The minimum version is `2.1.287`.
- Changed files: `docs/research/harness-integrations.md` (one bullet added); `techspec.md` (DEC-02, DEC-04, DEC-05, risks, sequencing amended with the findings); `task_02.md` (the event list now includes `turn.start`, and handlers guard with try/catch). No file under `src/`, `tests/`, `assets/`, or `schemas/` changed.
- Checks: `claude plugin validate` of the probe on 2.1.296 (passed with a warning about an unguarded `tool.call` hook), 2.1.287, and 2.1.289; the probe output holds ids, counts, timestamps, and the tool name only.
- Validated state: base commit `63fd5cb`; Windows only; `claude` 2.1.296 with the personal `CLAUDE_CONFIG_DIR`; 2.1.287 and 2.1.289 from `@anthropic-ai/claude-code-win32-x64` installed with `--ignore-scripts` in the scratchpad, run with an isolated empty config; all throwaway folders, binaries, and logs were deleted afterwards.
- Open items: `usage().context.tokens` after a response is verified only on 2.1.296; macOS, Linux, `/compact`, subagent tool calls, and parallel tool calls are unverified. The 2.1.287 and 2.1.289 runs had no login, so their window was the 200,000 default.

### ADR candidates

None - direct TechSpec implementation or local decision.
