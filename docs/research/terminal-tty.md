# Terminal TTY probe for the init assistant

Purpose: record what Node.js reports as `process.stdin.isTTY` and `process.stdout.isTTY` in the terminals ContextBrake users run `context-brake init` from, so the assistant's trigger is known to behave on each of them. The requirement is `prd-16` FR-10 and the technical decision is DEC-09 in `tasks/prd-16-configuracao-guiada-assistente-no-init/techspec.md`.

## What the assistant does with the result

`init` starts the assistant only when both streams are terminals (`isTTY === true` on stdin and on stdout) and no `--yes`, `--json`, or configuration flag is given. `init --interactive` requires the same two streams.

- Where Node sees a terminal on both streams: a plain `init` asks the questions.
- Where Node sees no terminal on either stream (for example Git Bash in mintty without its pseudo-console option): a plain `init` behaves as before, so it still stops with `CONFIRMATION_REQUIRED` without `--yes`, and `init --interactive` exits with code 64 and prints:

  ```text
  The terminal is not interactive (stdin or stdout is not a TTY). Use flags such as --harness, --snapshot-command, --auto-restart, --max-restarts, or --yes.
  ```

The behavior reads the streams at run time, so it needs no per-terminal code; the measurements below only document it.

## Probe

Run both steps in each terminal, in an empty folder or a project you can discard:

```bash
node -p "[process.stdin.isTTY, process.stdout.isTTY]"
npx context-brake init --interactive --dry-run
```

`true` is a terminal; `undefined` or `false` is not. In Git Bash on Windows, also run both steps with `winpty` in front of `node` and `npx`, and in a mintty window started with and without its pseudo-console option where the version has one. Answer the questions once in the terminals where the assistant starts; `--dry-run` writes nothing.

Record Node version, shell version, terminal program and version, the two values, and what `init --interactive --dry-run` did.

## Results

| Terminal | Node | Shell and terminal version | `stdin.isTTY` | `stdout.isTTY` | `init --interactive --dry-run` | Measured by |
| --- | --- | --- | --- | --- | --- | --- |
| Git Bash (mintty), pseudo-console on | not measured | not measured | not measured | not measured | not measured | pending: the person |
| Git Bash (mintty), pseudo-console off | not measured | not measured | not measured | not measured | not measured | pending: the person |
| PowerShell 7 | not measured | not measured | not measured | not measured | not measured | pending: the person |
| Windows PowerShell 5.1 | not measured | not measured | not measured | not measured | not measured | pending: the person |
| Claude Code Bash tool (piped, no terminal) | 24.20.0 | Git Bash, no terminal | `undefined` | `undefined` | not run (the assistant would need a terminal) | the agent, 8 October 2026 |

Status on 8 October 2026: the four terminal rows are **not measured**. The person deferred the measurement at HIL 2 of `prd-16` (DEC-HIL-02), so OBJ-05 stays an open limitation until these cells are filled. The fallback above is covered by in-process tests (`tests/integration/init-interactive-gate.test.ts`), not by a real terminal. Linux and macOS terminals are not driven in this repository's environment and are unverified.
