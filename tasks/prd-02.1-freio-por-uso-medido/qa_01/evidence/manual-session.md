# Manual acceptance — real Claude Code session (DEC-HIL-06)

- Harness: Claude Code 2.1.282, headless `claude -p`, Windows 11, Git Bash, Node v24.19.0, 2026-09-25.
- Scratch repo: git repo in the QA scratchpad (`manual-AaxO`), `node dist/src/cli/main.js init --yes` (default config, no `task_plan.json`), 32 small `src/file*.ts`, 5 large `big/part*.md` copied from `docs/research/`.
- Command: `claude -p "<read src/file01..32.ts, then big/part1..5.md, one Read per message; follow ContextBrake telemetry; report last zone and source>" --allowedTools Read --max-turns 80 --output-format json`
- Executed by: the QA agent session bdc9931c, authorized by the user (DEC-HIL-06). Cost reported by the harness: US$ 1.03.

## Observed

- Ledger (`manual-session-ledger.jsonl`): 1 reset (startup), 1 session line, 37 tool lines; every tool line has `source: measured` and window 128000.
- Turns 1–34: 21%–42%, zone GREEN; no telemetry injected (threshold_only), no deny; `blocks.jsonl` was never created (0 blocks).
- Turn 35 (57%) and 36 (63%): YELLOW; turn 37 (69%): RED.
- Blocks injected, extracted from the session transcript:
  - `[ContextBrake v2] turn=35 usage=57% tokens=73500/128000 source=measured zone=YELLOW action=keep working; finish the current unit before large new explorations`
  - `[ContextBrake v2] turn=36 usage=63% tokens=81260/128000 source=measured zone=YELLOW action=keep working; finish the current unit before large new explorations`
  - `[ContextBrake v2] turn=37 usage=69% tokens=88745/128000 source=measured zone=RED action=finish or pause the current unit, record progress, end reply with [REQUEST_SESSION_RESET]`
- Cross-check: every ledger `usedTokens` value equals `input_tokens + cache_creation_input_tokens + cache_read_input_tokens` of the main-thread assistant message that issued that call in the session transcript (OBJ-02).
- Agent behavior: kept working in YELLOW without a plan and finished all 37 reads; its final reply was "Last ContextBrake telemetry: zone=RED, source=measured (turn 37, 69%). All reads are finished; I did not record progress in files because you limited me to the Read tool. [REQUEST_SESSION_RESET]" (US-05, OBJ-03).

## Result

PASSED: 30+ tool calls below 50% with no block and no deny, then a YELLOW block with `source=measured` once usage passed 50%.
