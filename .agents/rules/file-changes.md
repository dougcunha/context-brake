---
paths:
  - "src/infrastructure/**/*.ts"
  - "src/cli/**/*.ts"
---

# Changes to User Files

ContextBrake edits files it does not own: harness configuration files such as `.claude/settings.json` and `.codex/hooks.json`. It never edits instruction files such as `CLAUDE.md` and `AGENTS.md`, or the project `.gitignore`. These rules apply to every code path that creates, changes, or removes files.

## Plan Before Writing

Compute every file change as a change plan before touching the disk. `init --dry-run` prints that plan, and a real run applies the same plan, so the preview and the execution cannot diverge.

## Touch Only What ContextBrake Owns

- Change only the entries ContextBrake registered in harness configuration files, and the files listed in its manifest.
- Preserve everything else byte for byte: key order, indentation, comments where the format allows them, line endings, and the final newline.
- Applying the same plan twice changes nothing the second time.
- `remove` deletes only what ContextBrake created: its registered entries, the assets in its manifest that were not edited, its configuration, its manifest, and the runtime files under `.context-brake/runtime/`.

## Refuse Files You Cannot Parse

When a file ContextBrake must edit does not parse, leave it untouched, report its path and the parse error, and continue with the other harnesses.

## Write Safely

- Resolve symbolic links and junctions before writing and write to their target, so the link survives.
- Write to a temporary file in the same directory and rename it over the target, so an interrupted run never leaves a partial file.
- Write only inside the repository root, unless the user explicitly selects a user-level scope.
- Use LF line endings in files ContextBrake creates.
