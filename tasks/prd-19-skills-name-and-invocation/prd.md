# PRD — Skill names in the configuration, invocation formatted by each harness

## Problem and context

`snapshot.command` and `snapshot.resumeCommand` in `context-brake.config.json` hold free text that already carries the syntax of one harness, such as `/sdd-snapshot`. A project can have several harnesses active, and each one invokes a skill in its own way (`/name`, `$name`, `/skill:name`, or a plain sentence). One stored string cannot be right for all of them, and the user has to know the syntax of every harness to fill it.

The user decided (H-01, H-02): the configuration keeps only the skill **name**, each harness adapter formats the invocation, and the old format is not supported because nobody uses it yet. This slice delivers that contract. Slice `20-skills-wizard-discovery` builds the skill discovery and the list of alternatives in the wizard on top of it.

## Outcomes and metrics

| ID | Expected outcome | Metric or evidence |
| --- | --- | --- |
| OBJ-01 | The configuration is harness-neutral: one skill name serves every active harness | A config with `"command": "sdd-snapshot"` produces the right text in each of the 8 harnesses (FR-03 table) |
| OBJ-02 | The agent receives the invocation in the form its harness understands | Zone action and resume text carry the harness form; no harness gets another harness's syntax |
| OBJ-03 | The old format fails early with a clear fix | `/sdd-snapshot`, `$x`, `@x`, or any value with spaces is rejected by `init`, `doctor`, and the hooks' config load, with the file, key, and fix |
| OBJ-04 | The invocation syntax of the 8 harnesses is recorded where the project keeps harness facts | `docs/research/harness-integrations.md` has the skill folders and the invocation form of each harness, with verification date and source |

## Stories and journeys

| ID | User | Need | Benefit | Flow or edge |
| --- | --- | --- | --- | --- |
| US-01 | Maintainer with Claude Code and Codex CLI active | Configure the snapshot skill once | The same config works in both | `init --snapshot-command sdd-snapshot`; Claude Code gets `/sdd-snapshot`, Codex gets `$sdd-snapshot` |
| US-02 | Agent in a harness at the trigger zone | Receive an instruction it can act on | The snapshot is requested in the harness's own form | The zone header carries the formatted invocation |
| US-03 | Maintainer running `doctor` | See what each harness will receive | Spot a wrong name or an unsupported form before a session | `doctor` lists the name and the per-harness form |
| US-04 | Maintainer with an old config (`/sdd-snapshot`) | Know what to change | No silent misbehavior | The command stops with the key and the bare name to use |

## Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FR-01 | `snapshot.command` and `snapshot.resumeCommand` accept only a skill name: lowercase letters, digits, and single hyphens (`^[a-z0-9]+(-[a-z0-9]+)*$`), up to 64 characters, with an optional `plugin:` namespace prefix of the same shape (Claude Code plugin skills). `resumeCommand` still requires `command`. | `sdd-snapshot`, `commit`, and `anthropic-skills:docs` are valid; `/sdd-snapshot`, `$x`, `@x`, `Sdd`, `a b`, `a--b`, `-a`, and a 65-character name are rejected |
| FR-02 | A value in the old format is rejected with an error that says what happened, which file or flag, and how to fix it. A value that starts with `/`, `$`, or `@` gets the bare name in the message. | For `"command": "/sdd-snapshot"` the error names `context-brake.config.json`, `snapshot.command`, and suggests `sdd-snapshot`; the same for `--snapshot-command /sdd-snapshot`. `init` writes nothing |
| FR-03 | The zone action (at and above the trigger zone) and the resume text render the invocation formatted by the harness that receives the text. Forms: Claude Code `/name`; Cursor `/name`; GitHub Copilot CLI `/name`; Codex CLI `$name`; Pi `/skill:name`; Oh-My-Pi, OpenCode, and Antigravity CLI a plain sentence that names the skill (AUTO-04, AUTO-05, assumption A-05). | One test per harness asserts the exact text for `sdd-snapshot` at RED and CRITICAL and for the resume text |
| FR-04 | When the harness is not known to the formatter, the text uses the plain sentence, never a sigil from another harness. | A fake adapter without a formatter yields the plain sentence |
| FR-05 | `init` accepts the bare name in `--snapshot-command` and `--resume-command`, keeps `--no-snapshot-command`, and the config it writes holds the bare name. | `init --snapshot-command sdd-snapshot --resume-command sdd-orchestrate-flow` writes both bare names; the replay of the printed equivalent command computes the same plan |
| FR-06 | The assistant asks for the skill name (prompts say "skill name"), validates it with the FR-01 rule, and shows the form each selected harness will receive before accepting. | In a scripted session, a typed `/sdd-snapshot` is refused with the FR-02 message and the prompt repeats; a valid name shows one line per selected harness |
| FR-07 | Everything that prints the configured value shows the bare name, and `doctor` also shows the per-active-harness form; the `doctor --json` report carries both. | `doctor` text and JSON for two active harnesses list the name and two forms; `init` summary, plan, and restart findings print the bare name |
| FR-08 | The repository's own `context-brake.config.json`, README, `AGENTS.md`, the SDD skills' ContextBrake checks and fix command, and the schemas use the bare name. | `git grep` finds no `/sdd-snapshot` or `/sdd-orchestrate-flow` as a configured value; `schemas:check` passes; this repository's hooks keep working |
| FR-09 | `docs/research/harness-integrations.md` records, for each of the 8 harnesses, the project and user skill folders and the invocation form, with the verification date and the source link. | Each harness section has a "Skills" entry that matches the table in "Assumptions and sources" |

## Non-functional requirements

| ID | Attribute | Limit or criterion |
| --- | --- | --- |
| NFR-01 | Architecture | The invocation syntax of a harness lives in that harness's adapter. `core` depends only on a port; zone guidance has no `if` on a harness id. Adding a harness needs no change in zone guidance (proved by a test with a fake formatter) |
| NFR-02 | Agent-facing text | The telemetry block stays within its 60-token budget for every harness form (`tests.md`, Agent-facing text) |
| NFR-03 | Platform | Linux, macOS, and Windows (PowerShell and Git Bash); no behavior depends on a shell or a path separator |
| NFR-04 | Errors | Follow `cli-output.md`: what happened, which file or harness, how to fix; no stack trace for an invalid configuration |
| NFR-05 | Published contracts | The JSON schemas in `schemas/` are regenerated and `npm run schemas:check` passes |

## User experience

- The `init` flags and prompts keep the word "command" in the flag names, and say "skill name" in the help and prompt text.
- A rejected value never ends in a stack trace. The message looks like: `Invalid snapshot.command in context-brake.config.json: "/sdd-snapshot" is not a skill name. Use the bare name: sdd-snapshot.`
- `doctor` prints one line per active harness. A harness without an explicit syntax prints the plain sentence itself (`use the sdd-snapshot skill`), so the form is always words and never depends on color or glyphs.

## Constraints and dependencies

- Slice `20-skills-wizard-discovery` depends on this one and owns the discovery port, the scoring, and the list of alternatives. This slice only defines the invocation port.
- No compatibility layer and no migration (H-02). `schemaVersion` of the configuration stays `1`: nobody holds a config in the old format.
- Harness-specific names and shapes stay inside each adapter; `core` depends only on ports (`AGENTS.md`, Architecture).
- Before changing an adapter, read its section in `docs/research/harness-integrations.md` and re-check the vendor docs (`AGENTS.md`). The verification of 2026-10-13 is below.

## Out of scope

- Discovering skills, scoring, and the list of alternatives in the wizard (slice 20).
- Commands that are not skills (for example `npm run snapshot`): they are no longer supported by `snapshot.command`.
- Renaming the keys `command` and `resumeCommand` (AUTO-03).
- Enabling harness settings that make a form work (`skills.enableSkillCommands` in Oh-My-Pi, `opencode/slash` in OpenCode skills).
- Skills in the user scope.

## Assumptions and sources

- Assumption A-01: the model reads the text and runs the skill, so the harness form is a convention the model understands, not a command the harness parses. If wrong, the plain sentence still works everywhere.
- Assumption A-02: a skill name is the folder name containing `SKILL.md` (Agent Skills format); all eight harnesses use that name. Source: the pages below.
- Assumption A-03: Cursor CLI invokes skills like the Cursor app. The Cursor skills page does not say so for the CLI (checked 2026-10-13); the `/name` form is used and the research entry records the gap.
- Assumption A-04: Antigravity CLI skill locations differ between the codelab pages (`~/.gemini/config/skills/` and `~/.gemini/antigravity-cli/skills`); this slice does not read folders, so it only records the gap (slice 20 reads them).
- Assumption A-05: Oh-My-Pi exposes `/skill:<name>` only with `skills.enableSkillCommands`, whose default the docs do not state. The TechSpec decides between `/skill:name` and the plain sentence.
- External source, verified 2026-10-13:

| Harness | Project skill folders | User skill folders | Invocation |
| --- | --- | --- | --- |
| Claude Code | `.claude/skills/<name>/SKILL.md`, `.claude/commands/<name>.md` | `~/.claude/skills` (`$CLAUDE_CONFIG_DIR`) | `/name`; plugin skills `/plugin:name` ([Skills](https://code.claude.com/docs/en/skills)) |
| Codex CLI | `.agents/skills` from the working directory up to the repository root | `~/.agents/skills`, `/etc/codex/skills` | `$name`; `/skills` lists ([Build skills](https://learn.chatgpt.com/docs/build-skills)) |
| Cursor | `.cursor/skills`, `.agents/skills`, plus `.claude/skills` and `.codex/skills` | `~/.cursor/skills`, `~/.agents/skills`, plus `~/.claude/skills` and `~/.codex/skills` | `/name` in Agent chat ([Agent Skills](https://cursor.com/docs/skills)) |
| GitHub Copilot CLI | `.github/skills`, `.claude/skills`, `.agents/skills` | `~/.copilot/skills`, `~/.agents/skills` | `/name` ([Add skills](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills)) |
| OpenCode | `.opencode/skills`, `.claude/skills`, `.agents/skills` | `~/.config/opencode/skills`, `~/.claude/skills`, `~/.agents/skills` | no default slash form; `/name` only with the `opencode/slash` metadata; otherwise loaded by exact name ([Skills](https://opencode.ai/docs/skills)) |
| Pi | `.pi/skills`, `.agents/skills` (project trust) | `~/.pi/agent/skills`, `~/.agents/skills` | `/skill:name` ([Skills](https://pi.dev/docs/latest/skills)) |
| Oh-My-Pi | `.omp/skills`, `.github/skills`, `.agents/skills`, other tools' roots | `~/.omp/agent/skills` and other tools' roots | `/skill:<name>` with `skills.enableSkillCommands` ([skills](https://github.com/can1357/oh-my-pi/blob/main/docs/skills.md)) |
| Antigravity CLI | `<project>/.agents/skills` | `~/.gemini/config/skills` or `~/.gemini/antigravity-cli/skills` | agent-triggered; no explicit syntax documented; `/skills` lists ([codelab](https://codelabs.developers.google.com/getting-started-with-antigravity-skills)) |

## PRD acceptance gate

- [x] Every requirement has an ID and an observable criterion.
- [x] Metrics, boundaries, and out-of-scope items are explicit.
- [x] Internal rules came from the user (H-01, H-02) or an identified project source.
- [x] Implementation details remain in the TechSpec.
