---
paths:
  - "src/cli/**/*.ts"
---

# CLI Output

These rules apply to everything the `context-brake` commands print for the user. Hook responses to harnesses follow `harness-adapters.md` instead.

## Streams and JSON

- Results go to stdout; warnings, errors, and progress go to stderr.
- With `--json`, stdout holds exactly one JSON document that matches the published schema and carries the same findings as the human-readable output.

## Exit Codes

Define exit codes once as named constants in `src/cli/`. Health commands such as `doctor` use distinct codes for healthy, warnings, and errors. Changing an existing code is a breaking change.

## Terminals and Accessibility

- Every status has a text label, such as `OK`, `WARN`, or `ERROR`; color and emoji only reinforce it.
- Disable color when `NO_COLOR` is set or the output is not a TTY, and never depend on spinners or animations.
- Never prompt when stdin is not a TTY. Every confirmation has a flag equivalent, such as `--yes`; without it, the command stops and explains the missing confirmation instead of assuming consent.

## Messages

- Write messages in English.
- Each error says what happened, which file or harness is involved, and how to fix it.
- Print stack traces only for unexpected failures, never for expected errors such as invalid configuration or an unsupported harness version.
