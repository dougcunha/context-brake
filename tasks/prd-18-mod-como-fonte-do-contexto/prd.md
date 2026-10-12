# PRD — Mod as the context source for Claude Code

## Problem and context

ContextBrake learns how full the context window is, in Claude Code, only through a status line bridge. `init` writes a `statusLine` entry in `.claude/settings.local.json`, which takes precedence over the user's own status line. The bridge chains the previous one, but a status line that the bridge fails to find is lost: on 11/10/2026 a personal-account status line disappeared because it lived under `CLAUDE_CONFIG_DIR` (fixed in `adb04d1`). Even when the chain works, the user's status line now runs inside the bridge, and `init`, `doctor`, and `remove` carry a large surface to install, track, and restore it.

Claude Code 2.1.287 and later load mods, and the project already ships one for automatic restart. A mod reads the same figures the status line receives through `$.session.usage()` (`context.tokens`, `context.window`, `context.percent`; documented in the 2.1.296 mod types, not yet verified on 2.1.289) without owning the status line. When Claude Code supports mods, ContextBrake should get the context reading from the mod and leave the user's `statusLine` alone. The bridge stays for versions or setups without mods.

## Outcomes and metrics

| ID | Expected outcome | Metric or evidence |
| --- | --- | --- |
| OBJ-01 | On a Claude Code with mod support, ContextBrake measures context usage without touching the user's `statusLine`. | `init` on a fixture repository with a compatible Claude Code leaves every `statusLine` key byte for byte as it was, and telemetry reports `source=measured`. |
| OBJ-02 | Installs without mod support keep today's behavior. | The existing bridge tests pass unchanged for a Claude Code below the minimum version. |
| OBJ-03 | Users of the bridge move to the mod without losing their status line. | After migration, the `statusLine` the user had before the bridge is back byte for byte. |

## Stories and journeys

| ID | User | Need | Benefit | Flow or edge |
| --- | --- | --- | --- | --- |
| US-01 | Developer with a customized status line | `init` does not replace or wrap my status line | My status line keeps working and looks the same | Compatible Claude Code: no `statusLine` change |
| US-02 | Developer on an older Claude Code | The brake still gets measured usage | Same behavior as today | Below the minimum version: the bridge is installed |
| US-03 | Developer who already has the bridge | Move to the mod without manual cleanup | One command, my previous status line restored | Compatible Claude Code and an installed bridge |
| US-04 | Developer whose mods are off (policy, safe mode, untrusted folder) | Know that no reading arrives | I fix the cause or accept the estimate | The mod loads in no session |

## Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FR-01 | After each assistant response the mod publishes the session's context reading (tokens in context, window size, used percentage) to ContextBrake's per-session runtime state, under the session id. | A mod test with a fake host shows a reading recorded for the session with the three values; a missing value is recorded as null, never as zero. |
| FR-02 | The hook uses the fresher of the mod's and the transcript's reading (the mod wins a tie), takes the window from the mod when it has one, and falls back to the bridge's readings and then to the estimate, as today. `source=measured` and `window=harness` hold whenever a mod or bridge window is used. | Unit tests over the selection cover the transcript older, newer, equal, and absent, and the mod reading absent; an integration test covers the bridge-only fallback; the telemetry block text stays unchanged. |
| FR-03 | `init` decides between mod-first and bridge by the Claude Code version it detects against the minimum version that supports mods and `$.session.usage()`, and reports the decision. | Fixtures at the minimum, one below, and one above produce mod-first, bridge, and mod-first. An undetectable version produces the bridge. |
| FR-04 | In mod-first mode a plain `init`, without `--auto-restart`, installs the mod and neither creates nor edits any `statusLine` key nor installs the bridge script or its state. Automatic restart stays opt-in (D-04). | After `init`, the diff of the fixture repository and of the user settings touches no `statusLine` key and creates no bridge file; the config has no `autoRestart` block and the mod does not clear the session on the restart signal; a second `init` plans no change. |
| FR-05 | `--statusline-bridge` forces the bridge and `--no-statusline-bridge` forbids it, as today, on any version. | The existing flag tests pass; with `--statusline-bridge` on a compatible version the bridge is installed. |
| FR-06 | Re-running `init` on a compatible Claude Code with the bridge installed migrates on its own (D-05): it removes the bridge, restores the previous `statusLine` byte for byte, and installs the mod, reporting each step in the plan. `--statusline-bridge` keeps the bridge. | A fixture with the bridge over a user status line returns to the original bytes of `settings.local.json`, or to no file when the install created it; `init --dry-run` prints the same plan. |
| FR-07 | `doctor` reports which source feeds the context reading (mod, bridge, or none) and warns when a mod-first install has recorded no reading, naming the possible causes. `doctor --json` and its schema carry the new values. | Doctor tests cover mod fresh, mod silent, bridge only, and none; `npm run schemas:check` passes. |
| FR-08 | `remove` deletes what mod-first `init` created and leaves every `statusLine` key as it is. | After `init` then `remove`, the fixture repository matches its pre-install bytes. |
| FR-09 | When `$.session.usage()` fails or returns no window, the mod records nothing, writes an error code to the runtime log, and the session continues. | A test with a failing host shows no thrown error and no reading recorded. |

## Non-functional requirements

| ID | Attribute | Limit or criterion |
| --- | --- | --- |
| NFR-01 | Concurrency | A reader never merges two readings; a partial or invalid reading file counts as no reading, and the mod never writes the ledger. |
| NFR-02 | Privacy | The mod records only token counts, window size, percentage, session id, and timestamps; never prompt, reply, or tool text. |
| NFR-03 | Mod weight | The bundled mod keeps using no Node module and no synchronous file or process call, as in prd-11 (`tests/integration/claude-mod-bundle`). |
| NFR-04 | Failure policy | A mod failure never blocks a turn or a tool call; the hook falls back to the next source. |
| NFR-05 | Platforms | Linux, macOS, and Windows (PowerShell and Git Bash), with symlinked settings files. |

## Constraints and dependencies

- Depends on the mod loading rules recorded in `docs/research/harness-integrations.md` (Claude Code 2.1.287 or later; off under `disableAllHooks`, `--safe-mode`, `--bare`, managed policy, and Desktop WSL; folder trust on first run).
- The mod host exposes `$.fs.write` (replaces the file), `$.fs.read`, `$.store`, `$.process.run`, and `$.session.*`; there is no append. How the mod writes without racing the hook belongs to the TechSpec.
- The minimum version of `$.session.usage()`, the order between the mod's hooks and `settings.json` hooks inside a turn, and how fresh the reading is at a `PostToolUse` hook must be measured on a real session before the TechSpec fixes them (first task: a probe, as prd-14 did).
- Changes to files ContextBrake writes follow `.agents/rules/file-changes.md`; the harness section of `docs/research/harness-integrations.md` is updated with the probe results.

## Out of scope

- Removing the status line bridge or its flags.
- Other harnesses.
- Rate-limit windows, cost, and the context breakdown that `$.session.usage()` also returns.
- Moving the telemetry injection from the `settings.json` hooks into the mod.
- Showing ContextBrake's own information in a status line, pane, or toast.

## Assumptions and sources

- Product decision D-03 (HIL 1, 11/10/2026): a plain `init` installs the mod when Claude Code supports mods, because the mod is the source of the reading.
- Kept behavior D-04 (not asked; carried over from prd-11): automatic restart stays opt-in through `--auto-restart`; installing the mod by default does not turn it on.
- Product decision D-05: an installed bridge migrates to the mod at the next `init` on a compatible Claude Code, with the plan visible in `--dry-run`.
- Default D-06 (stated in FR-02, approved with the PRD; not asked separately): while the mod is on but silent, the hook still uses an installed bridge's readings, because FR-02 picks the freshest source.

- Assumption: `$.session.usage().context` carries the same figures as the status line's `context_window`, including null before the first response and after `/compact`. Source: the 2.1.296 mod types (`SessionContextUsage`). Impact if wrong: the reading differs from the bridge's and the probe changes FR-01.
- Assumption: the mod can publish a reading before the hook of the same turn reads it. Source: none yet. Impact if wrong: the hook reads one response behind, as the transcript source does today, and FR-02 prefers the fresher source.
- Assumption: `$.session.id()` equals the `session_id` the hooks receive. Source: `mod/mod-log.ts:8` names the mod's file by `$.session.id()`, but nothing shows it matches the hooks' id; the probe checks it, including after `/clear`. Impact if wrong: the reading never matches a session.
- External source: [Mods reference](https://code.claude.com/docs/en/plugins/mods/reference), [Settings](https://code.claude.com/docs/en/settings), [Status line](https://code.claude.com/docs/en/statusline).

## PRD acceptance gate

- [x] Every requirement has an ID and an observable criterion.
- [x] Metrics, boundaries, and out-of-scope items are explicit.
- [x] Internal rules came from the user or an identified project source.
- [x] Implementation details remain in the TechSpec.
