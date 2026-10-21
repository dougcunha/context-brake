# PRD — Verified minimum version for Claude Code

Level: `sdd-lean` (triage 2026-10-21).

## Problem and context

`context-brake doctor` always prints `VERSION_FLOOR_UNVERIFIED` for `claude-code`, also on a correct install. The adapter gives no minimum version: `probeExecutableVersion` gets the default `minimumVersion = null` (`src/infrastructure/harnesses/common/version-probes.ts:10`, called from `src/infrastructure/harnesses/claude-code/adapter.ts:33`). The doctor adds the warning when `support.minimumVersion` is `null` (`src/core/services/doctor-service.ts:39-47`). Because a warning sets exit code 1, `doctor` never exits 0 for Claude Code, so a script or CI step that runs `doctor` always fails.

The research section says the minimum version is "not documented" (`docs/research/harness-integrations.md:69`, checked 2026-09-14). The user asked on 2026-10-21 to search the Anthropic sources again. The official changelog (https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md, covers 0.2.21 to 2.1.306) gives a version for most mechanisms that the adapter registers. The user accepted the recommendation to use the highest of these versions, **2.1.97** (decision H-01 in `workflow.md`).

Facts from the changelog (lines checked on 2026-10-21):

| Mechanism the adapter uses | First version | Changelog line |
| --- | --- | --- |
| Hooks, with `PostToolUse` and `Stop` | 1.0.38 | "Released hooks." |
| `SessionStart` hook | 1.0.62 | "Hooks: Added SessionStart hook for new session initialization" |
| Status line (`statusLine`, type `command`) | 1.0.71 | "Customizable status line: add your terminal prompt to Claude Code with /statusline" |
| `context_window` in the status line input | 2.0.65 | "Added context window information to status line input" |
| `current_usage` in the status line input | 2.0.70 | "Added `current_usage` field to status line input…" |
| `context_window.used_percentage` | 2.1.6 | "Added `context_window.used_percentage` and `context_window.remaining_percentage`…" |
| `refreshInterval` of `statusLine` | 2.1.97 | "Added `refreshInterval` status line setting to re-run the status line command every N seconds" |
| Mods (context reading and auto-restart) | 2.1.287 | "Added Claude Mods: plugins may now modify deeper behavior" (already in code as `MODS_MINIMUM_CLAUDE_VERSION`) |

The changelog has no entry for 3 items: `hookSpecificOutput.additionalContext` on `PostToolUse` and on `SessionStart`, the `compact` source of `SessionStart`, and the field name `context_window_size`.

## Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FR-01 | The Claude Code adapter reports `2.1.97` as its minimum version in the version probe. | A probe of `claude` that prints `2.1.300 (Claude Code)` gives `minimumVersion: "2.1.97"` and `status: "resolved"` |
| FR-02 | `doctor` does not emit `VERSION_FLOOR_UNVERIFIED` for `claude-code` when the adapter is diagnosed. | A doctor report for a Claude Code fixture has no finding with that code and `harness: "claude-code"`; `support.minimumVersion` is `"2.1.97"` |
| FR-03 | A detected Claude Code version below `2.1.97` uses the existing old-version behavior. | A probe that prints `2.1.96` gives `status: "old"`; the support profile marks `post_tool_telemetry` and `session_boot` as not guaranteed and names `2.1.97` in the limitation text |
| FR-04 | The research section records the floor with evidence. | `docs/research/harness-integrations.md`, Claude Code section, "Versão mínima" line, names 2.1.97, the mechanism table above (short form), the source URL, the check date, and the 3 gaps |
| FR-05 | Other harness adapters are not changed. | Their probes still give `minimumVersion: null`, and `doctor` still reports `VERSION_FLOOR_UNVERIFIED` for them |

## Non-functional requirements

| ID | Attribute | Limit or criterion |
| --- | --- | --- |
| NFR-01 | Contract | The doctor JSON schema (`schemas/doctor-report.schema.json`) does not change shape; `npm run schemas:check` passes |
| NFR-02 | Platform | No new process call: the floor uses the existing `claude --version` probe on Linux, macOS, and Windows |
| NFR-03 | Single source | The floor value is one named constant in the Claude Code adapter folder (`src/infrastructure/harnesses/claude-code/`) |

## Constraints and dependencies

- `.agents/rules/harness-adapters.md` applies: the version is a Claude Code fact and stays in its adapter.
- `.agents/rules/cli-output.md` applies to the changed doctor output.
- The mod floor (2.1.287) and the mod-or-bridge choice (`context-source.ts`) do not change.

## Out of scope

- A new doctor finding for an old Claude Code version (the support profile already reports it).
- Minimum versions for the other 7 harnesses.
- Changing the severity of `VERSION_FLOOR_UNVERIFIED` or the doctor exit-code rule.
- A live test of Claude Code 2.1.97 to close the 3 gaps.

## Assumptions and sources

- Assumption: `additionalContext` on `PostToolUse` and `SessionStart`, the `compact` source, and `context_window_size` exist in 2.1.97. Source: no changelog entry; the oldest version with captured payloads is 2.1.273 (`tests/fixtures/harnesses/claude-code/`). Impact if wrong: on a version from 2.1.97 to 2.1.272, `doctor` claims support that a mechanism lacks.
- Assumption: `context_window_size` arrived with 2.0.65 ("context window information"). Impact if wrong: none on the floor, because 2.1.97 is higher.
- External source: https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md (same content at https://code.claude.com/docs/en/changelog), checked 2026-10-21.

## Decision at the joint HIL (HIL 1 + HIL 2)

- D-01: **2.1.97**, decided at the joint HIL on 2026-10-21 (H-02 in `workflow.md`). The 3 gaps stay as assumptions.

## PRD acceptance gate

- [x] Every requirement has an ID and an observable criterion.
- [x] Metrics, boundaries, and out-of-scope items are explicit.
- [x] Internal rules came from the user or an identified project source.
- [x] Implementation details remain in the TechSpec.
