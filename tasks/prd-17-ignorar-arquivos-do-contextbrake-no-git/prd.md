# PRD — init keeps ContextBrake's own files out of Git

## Problem and context

`init` creates files that belong to the developer's machine and not to the project history: `context-brake.config.json`, the hook scripts, the Claude Code mod under `.context-brake/claude-mod/`, and `.context-brake/manifest.json`. They are regenerable by `init`. Today they appear in `git status` as untracked files, and in this repository they were committed by mistake and show up as modified after every `init` (for example when the person tried the wizard, `context-brake.config.json`, the hooks, and the manifest all changed).

The person has to know which files to ignore and maintain the list by hand. The list changes with the options: automatic restart adds the mod files and `.context-brake/.gitignore`, and a second harness adds its own scripts. A fixed list in the README goes stale, and ignoring whole folders would hide files the person put there.

Since prd-12 the product never edits the project `.gitignore` (`.agents/rules/file-changes.md`, "Touch Only What ContextBrake Owns"; `README.md`, "It does not touch `.gitignore`"). The only ignore file `init` writes is `.context-brake/.gitignore`, for handoffs and runtime state, and it cannot cover the configuration file in the project root or the scripts in the harness folders. This PRD reverses that rule for one managed block, listed file by file.

Decisions already taken by the person (this conversation): the block lists the files one by one and not folders; `init` writes it by default; the assistant asks about it with the answer preselected; a flag turns it off.

## Outcomes and metrics

| ID | Expected outcome | Metric or evidence |
| --- | --- | --- |
| OBJ-01 | After `init`, ContextBrake's own files never show in `git status` | In a fixture Git repository, after `init --yes` with every optional feature on, `git status --porcelain` lists no ContextBrake-owned file (FR-01, FR-03) |
| OBJ-02 | The ignore list stays exact as options change | After turning automatic restart or a harness on and off, the block equals the manifest's file list with no stale line (FR-02) |
| OBJ-03 | Nothing else in `.gitignore` changes | A fixture `.gitignore` with comments, blank lines, mixed line endings, and no final newline keeps every byte outside the block, including after a second run (FR-04, NFR-01) |
| OBJ-04 | A team can keep versioning the files | `init --no-gitignore` writes no block, removes an existing one, and a later plain `init` keeps that choice (FR-05) |
| OBJ-05 | `remove` leaves no ContextBrake trace in `.gitignore` | After `init` and `remove` on a fixture, `.gitignore` equals its original content (FR-06) |

## Stories and journeys

| ID | User | Need | Benefit | Flow or edge |
| --- | --- | --- | --- | --- |
| US-01 | Developer installing ContextBrake in a Git project | The installed files stay out of `git status` without editing `.gitignore` by hand | A clean working tree and no accidental commit of machine-local files | Runs `init`; the plan shows the `.gitignore` block; confirms once |
| US-02 | Developer changing the options | The list follows the options | No stale lines and no missing file | Runs `init --auto-restart` or `--no-auto-restart`; the block gains or loses the mod files |
| US-03 | Team that shares the configuration and hooks | Keep them in version control | Everyone gets the same telemetry | Runs `init --no-gitignore` once; later runs keep the choice |
| US-04 | Developer who already committed the files | To be told how to stop tracking them | The ignore rule takes effect | `init` names the tracked files and the `git rm --cached` command; it does not change the index |
| US-05 | Developer answering the assistant (prd-16) | To decide this in the wizard | One place for every choice | The question is asked with the current state preselected; the printed command carries the answer |

## Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FR-01 | `init` maintains one marked block in the `.gitignore` at the project root, with one line per file that ContextBrake creates in full: the configuration file, the manifest, and every asset recorded in the manifest (hook scripts, mod files, `.context-brake/.gitignore`), plus the state files `init` writes in full under `.context-brake/runtime/` (DEC-HIL-03). Each line is anchored to the project root | In a fixture with Claude Code and automatic restart, the block names exactly those files and `git status --porcelain` shows none of them as untracked |
| FR-02 | The block is rebuilt from the manifest on every `init`. A file ContextBrake stops managing leaves the list; with no managed file left, the block is removed | Turning automatic restart off removes the mod lines; turning a harness off removes its script lines; a second run plans no change |
| FR-03 | Files that ContextBrake edits but does not own, such as `.claude/settings.json`, `.claude/settings.local.json`, and `.codex/hooks.json`, are never listed. When a harness folder is a link inside the repository (a symbolic link or a Windows junction), the block lists both the link path and the target path, because Git reaches the file through the target of a symbolic link and walks a junction as a folder (DEC-HIL-06) | No harness configuration file appears in the block; in a fixture where `.claude` links to `.agents`, the block has both the `.claude/...` and the `.agents/...` hook script lines |
| FR-04 | The block is a change in the plan: it appears in `--dry-run` and `--json` as a planned change, is written only after the usual confirmation, and every byte outside the markers stays as it was (line endings, final newline, comments). A missing `.gitignore` is created with only the block. A start marker without its end marker, or the reverse, is reported as a conflict and the file is left untouched while the rest of `init` continues | The fixtures in OBJ-03 pass; the malformed-marker fixture yields a conflict finding naming `.gitignore` and writes nothing to it |
| FR-05 | `--no-gitignore` writes no block and removes an existing one; `--gitignore` turns it back on. The choice is stored in the configuration so a plain `init` keeps it. The default, with no stored choice, is on | `init --no-gitignore`, then `init --yes`: no block; `init --gitignore`: the block returns; the configuration records the choice only when it differs from the default |
| FR-06 | `remove` deletes the block, leaves the rest of `.gitignore` unchanged, and deletes the file only if it became empty and `remove` created nothing else in it | After `init` then `remove`, `.gitignore` equals the original; a `.gitignore` that held only the block is deleted |
| FR-07 | Outside a Git working tree (no `.git` file or folder in the project root or an ancestor), `init` writes no `.gitignore` and reports an informational finding | A fixture without `.git` has no `.gitignore` after `init`, and the report carries `GITIGNORE_NO_GIT` |
| FR-08 | When a listed file is already tracked by Git, `init` reports an informational finding naming the files and the `git rm --cached` command to run. It never changes the Git index and does not change the exit code | A fixture with a committed `context-brake.config.json` yields the finding with the exact command; the exit code is unchanged |
| FR-09 | The prd-16 assistant asks whether to keep ContextBrake's files out of Git, with the current state preselected (on when nothing is stored). The answer becomes `--gitignore` or `--no-gitignore` only when it differs from the stored state, and the printed equivalent command reproduces the plan | Scripted sessions for both answers equal the typed-flag plan (prd-16 TC-10 pattern) |
| FR-10 | `README.md`, `AGENTS.md`, `.agents/rules/file-changes.md`, and the earlier PRD statements that say `.gitignore` is never edited are updated to describe the managed block and the opt-out | A search for the old statements returns none; the README documents `--gitignore` and `--no-gitignore` |

## Non-functional requirements

| ID | Attribute | Limit or criterion |
| --- | --- | --- |
| NFR-01 | Safety (`file-changes.md`) | Plan before write; write through a temporary file and rename; symlinks resolved; applying the same plan twice changes nothing; byte preservation outside the block |
| NFR-02 | Compatibility | `--json` documents stay valid against their schemas (the schemas gain the new change owner in a versioned, backward-compatible way if needed); scripts that pass `--yes` keep exit codes |
| NFR-03 | Platforms | Linux, macOS, and Windows (PowerShell and Git Bash); LF and CRLF `.gitignore` files; no process is started to build the block (Git is queried only for FR-08, through the injected runner, and skipped when Git is absent) |
| NFR-04 | Test budget | The new tests run in process within the 180 s budget of `AGENTS.md` |

## User experience

The plan lists `[update] .gitignore` or `[create] .gitignore` with the summary `Keep ContextBrake's files out of Git` like any other change. The block is self-explanatory:

```text
# >>> context-brake (managed by `context-brake init`; do not edit) >>>
/context-brake.config.json
/.context-brake/manifest.json
...
# <<< context-brake <<<
```

The assistant question reads `Keep ContextBrake's files out of Git (adds them to .gitignore)? [Y/n]`.

## Constraints and dependencies

- Depends on prd-16 for the assistant question (FR-09); the rest does not depend on it.
- Reverses the "never edits the project `.gitignore`" rule for this block only. Instruction files (`CLAUDE.md`, `AGENTS.md`) stay untouched.
- Only the `.gitignore` at the project root is edited; no `.git/info/exclude`, no global ignore file.
- The Git index is never changed by ContextBrake.

## Out of scope

- Ignoring files ContextBrake only edits (harness configuration files).
- Running `git rm --cached` for the person.
- `.git/info/exclude` and global ignore files.
- A `doctor` check for the block (can follow).
- Editing instruction files.

## Assumptions and sources

- Assumption: the manifest lists every file ContextBrake creates in full except the manifest itself, which `init` adds to the list explicitly (`src/core/contracts/manifest.ts`, `.context-brake/manifest.json`). Impact if wrong: a file stays untracked-visible; covered by OBJ-01.
- Assumption: `remove` deleting an otherwise empty `.gitignore` is safe because the file held only the block. Impact if wrong: a user-created empty file disappears; the rule keeps it when anything else remained.
- Clarification (exception HIL, DEC-HIL-03, review CR-02): the manifest does not record the state files `init` writes under `.context-brake/runtime/` (`claude-mod-install.json`, `claude-statusline.json`, and the status line opt-out marker), so FR-01 lists them too while they exist or are planned. OBJ-01 does not cover `.claude/settings.local.json`, a harness file ContextBrake only edits (FR-03); the README already tells the person to keep it ignored.
- Clarification (HIL 2, DEC-HIL-02, OI-01): for a `.gitignore` whose last line has no line break, the insertion adds one line break before the block and `remove` leaves it, so the byte-identical results of OBJ-03 and OBJ-05 hold for files that end with a line break.
- Source: person's decisions in this conversation (file-by-file list, on by default, assistant question preselected, opt-out flag).
- Source: `.agents/rules/file-changes.md` and `README.md` ("Updating and Removal"), the rule being amended.

## PRD acceptance gate

- [x] Every requirement has an ID and an observable criterion.
- [x] Metrics, boundaries, and out-of-scope items are explicit.
- [x] Internal rules came from the user or an identified project source.
- [x] Implementation details remain in the TechSpec.
