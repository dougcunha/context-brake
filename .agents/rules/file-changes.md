---
paths:
  - "src/infrastructure/**/*.ts"
  - "src/cli/**/*.ts"
---

# Changes to User Files

ContextBrake edits files it does not own: harness configuration files, instruction files such as `CLAUDE.md` and `AGENTS.md`, and the project `.gitignore`. These rules apply to every code path that creates, changes, or removes those files.

## Plan Before Writing

Compute every file change as a change plan before touching the disk. `init --dry-run` prints that plan, and a real run applies the same plan, so the preview and the execution cannot diverge.

## Touch Only What ContextBrake Owns

- Change only the entries ContextBrake registered, the text between `<!-- CONTEXTBRAKE:START -->` and `<!-- CONTEXTBRAKE:END -->` in instruction files, and the lines between `# CONTEXTBRAKE:START` and `# CONTEXTBRAKE:END` in `.gitignore`.
- Preserve everything else byte for byte: key order, indentation, comments where the format allows them, line endings, and the final newline.
- Applying the same plan twice changes nothing the second time.
- Remove content from legacy `CONTEXTOPS` blocks only after explicit confirmation.
- `remove` deletes only what ContextBrake created; plan and checkpoint files are deleted only after explicit confirmation, and the `.gitignore` block that ignores them is removed only together with them.

## Refuse Files You Cannot Parse

When a file ContextBrake must edit does not parse, leave it untouched, report its path and the parse error, and continue with the other harnesses. Missing, duplicated, or out-of-order ContextBrake markers in an instruction file or `.gitignore` count as a parse error.

## Write Safely

- Resolve symbolic links and junctions before writing and write to their target, so the link survives.
- Write to a temporary file in the same directory and rename it over the target, so an interrupted run never leaves a partial file.
- Write only inside the repository root, unless the user explicitly selects a user-level scope.
- Use LF line endings in files ContextBrake creates.
