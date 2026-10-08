# FR-06 probe (prd-14 T01)

Throwaway probe modules. Not shipped and not run by `npm test` (NFR-03). Each module writes one JSON line per event to `<probe project>/probe-captures/<harness>.jsonl`. Results go to `docs/research/harness-integrations.md`, and minimal payloads go to `tests/fixtures/harnesses/<harness>/`.

## Items

| Item | Question |
| --- | --- |
| P1 | The installed `.js` file loads (`loaded` line) |
| P2 | The end-of-turn handler sees the final assistant text (`agent_end`, `session_stop`, `idle_text`) |
| P3 | From that handler, a new session opens (`command` then `new_session_result` with `cancelled: false`, or `tui.executeCommand`) |
| P4 | The new session receives the first prompt (`seed_sent`, and the agent answers `SEEDED`) |
| P5 | Module state survives the switch (same `loadId`, `state.restarts` grows in `session_start`) |
| P6 | Interactive test and typed-prompt signal (`mode`, `hasUI`, `input.source`; OpenCode `hasTTY`, `chat.message`) |

Pass = P1-P4 all yes.

## Setup

From the repository root:

```bash
node tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/probe/setup.mjs <probe-project-dir>
```

The project directory is outside the repository; trust it when the harness asks.

## Script, per harness

Run in a terminal inside the probe project. Use the same prompt in each harness:

> Reply with exactly two lines: first the word READY, then [REQUEST_SESSION_RESET]

1. Pi: run `pi`, trust the project, send the prompt. Expected if P3/P4 pass: a new session opens by itself and the agent answers `SEEDED`. Then type `hello` once (typed-prompt signal) and exit with `/quit` or Ctrl+C.
2. Oh-My-Pi: run `omp`, trust the project, send the prompt.
   - First marker reply: strategy A (`pi.sendUserMessage("/…")`). Note whether a new session opened.
   - Send the prompt again: strategy B puts `/context-brake-probe-restart` in the editor. Note whether it is there, press Enter, and note whether a new session opens and answers `SEEDED`.
   - Exit.
3. OpenCode: run `opencode`, send the prompt. Expected if P3/P4 pass: a new session opens and the agent answers `SEEDED`. Then exit.

After each run, tell the coordinator what you saw on screen; the coordinator reads `probe-captures/`.
