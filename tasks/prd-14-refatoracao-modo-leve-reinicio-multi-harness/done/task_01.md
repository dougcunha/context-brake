# Stable execution context

Load in this exact order:

1. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/prd.md`
2. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T01 — Probe automatic restart on real harness installations

## Outcome

For Pi 1.0.4 and OpenCode 2.0.18 and Oh-My-Pi (installed for the probe, DEC-HIL-02), the research doc records verified answers to probe items P1-P6, with version and date, and the captured payloads are fixtures. Each harness has a fixed destination: automatic (P1-P4 pass) or its DEC-10 fallback.

## Dependencies and boundaries

- Depends on: — (HIL 2 approval and OI-14-02 authorization)
- Unblocks: T06, T07
- In scope: throwaway probe modules and a manual script under `probe/`; captures; research sections; fixture files.
- Out of scope: any change under `src/` or `assets/`; any test in `npm test`; harnesses other than Pi, Oh-My-Pi, and OpenCode.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-06 | `prd.md#functional-requirements` | Probe before adapter work, research updated with version and date |
| NFR-03 | `prd.md#non-functional-requirements` | Probes recorded as fixtures, outside `npm test` |
| DEC-09, DEC-10 | `techspec.md#technical-decisions` | Probe items P1-P6, runner, destinations |
| CMP-09 | `techspec.md#components-and-flow` | Research, fixtures, probe folder |
| TC-08 | `techspec.md#test-approach` | Probe evidence |

## Context to recover on demand

- Applicable rules: `.agents/rules/harness-adapters.md` (source of truth, version gating).
- Harness reference: `docs/research/harness-integrations.md` Pi (145-161), Oh-My-Pi (163-180), OpenCode (128-143), restart line 26.
- Local vendor sources: Pi `docs/extensions.md:46,213-217` and `dist/core/extensions/types.d.ts:284-337,873-885` under the global npm package; OpenCode SDK `dist/gen/sdk.gen.d.ts:329-366` under `~/.config/opencode/node_modules/@opencode-ai/sdk`.
- Existing code: `src/infrastructure/harnesses/pi/runtime.ts`, `opencode/runtime.ts` (current event handling the probe compares against).

## Work

- [x] T01.1 Write `probe/README.md`: the manual script per harness (start session in a temp project, prompt that makes the agent end with the marker, what to type, what to observe), and the pass rule (P1-P4).
- [x] T01.2 Write `probe/pi-probe.ts` (and the Oh-My-Pi variant if approved): logs every relevant event to `probe/captures/`, registers `/context-brake-probe-restart`, and on a marker reply dispatches it through `pi.sendUserMessage`; the command calls `ctx.newSession({ withSession })` and seeds through `sendUserMessage`. Records `ctx.mode`, `ctx.hasUI`, `input.source`, and module state across the switch (P5, P6). Installed as `.js` in `.pi/extensions/` to settle P1.
- [x] T01.3 Write `probe/opencode-probe.ts`: logs `event` payloads (turn end, busy/idle), reads the last assistant text through the SDK, then calls `tui.executeCommand({ command: "session_new" })`, `tui.appendPrompt`, `tui.submitPrompt`. Records which client version the plugin receives and how a typed prompt and TUI presence show up.
- [x] T01.4 Run each probe with the person driving the interactive steps; save captures.
- [x] T01.5 Update each research section with the P1-P6 answers, version, and date; close or update OI-03 and OI-04; note the stale references listed in TechSpec "Risks and open items".
- [x] T01.6 Copy the minimal captured payloads to `tests/fixtures/harnesses/{pi,oh-my-pi,opencode}/` with names matching the events; record each harness's destination in the handoff and in `tasks.md` "Problems and solutions" if it changes T06 or T07 scope.

## Acceptance criteria

- Each probed harness's research section states P1-P6 as verified yes/no with version and date.
- A harness is marked automatic only when P1-P4 all pass with captures that show it.
- No file under `src/`, `assets/`, or `tests/` other than fixtures changes.

## Verification

- Unit: not applicable.
- Integration: not applicable; fixtures are consumed by T06 and T07.
- End-to-end: not applicable.
- Manual: the probe script in `probe/README.md`; expected result is a capture set per harness; owner: the person with the coordinator.
- Platforms: Windows only (this machine), recorded in the research notes.
- Commands: `npm run lint` (fixtures are JSON), `git status` to confirm scope.
- Environment dependency: authenticated Pi and OpenCode; Oh-My-Pi per OI-14-01; authorization OI-14-02.
- Expected evidence: `probe/captures/*`, research diff, fixture files.

## Affected files

- Create: `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/probe/{README.md,pi-probe.ts,opencode-probe.ts}`, `probe/captures/*`, new fixtures under `tests/fixtures/harnesses/{pi,oh-my-pi,opencode}/`.
- Modify: `docs/research/harness-integrations.md`.

## Observability and recovery

- Operational signal: capture files.
- Recovery: delete the probe extension or plugin from the temp project; nothing is installed in this repository.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: P1-P6 answered on real installations (Windows, 2026-10-07). Pi 1.0.4: all pass, destination automatic (DEC-21). Oh-My-Pi 18.8.1 (installed via Bun under DEC-HIL-02): handler cannot open a session; editor prefill + one Enter opens and seeds it, destination DEC-19 (DEC-HIL-03); new session arrives as `session_switch` (DEC-20). OpenCode CLI 2.0.18 / service 2.0.24: the v1 plugin shape is rejected; a v2 server plugin creates and seeds a session but the TUI does not switch; destination no restart mode (DEC-HIL-04) and a follow-up PRD for the 2.x migration.
- Changed files: `probe/{README.md,capture.js,pi-probe.js,omp-probe.js,opencode-probe.js,opencode-v2-server.js,opencode-v2-tui.js,setup.mjs}`, `probe/captures/{pi,omp,opencode-v2}.jsonl` (local paths replaced by `<project>`/`<home>`); `docs/research/harness-integrations.md` (Reinício consequence, Pi, Oh-My-Pi, OpenCode sections; closes OI-03 and OI-04); fixtures `tests/fixtures/harnesses/pi/{agent-start,agent-end-reset,input-interactive,input-extension,session-start-new}.json`, `oh-my-pi/{session-stop-reset,input-interactive}.json`, `opencode/v2/{session-text-ended,session-execution-succeeded,session-inbox-enqueued-user}.json`; TechSpec amended (DEC-19..DEC-21, "Probe results" section); T06 and T07 amended.
- Checks: `npm run lint` → "ESLint: No issues found". No test enumerates fixture directories (grep over `tests/`). No file under `src/` or `assets/` changed. The probe project lives in the session scratchpad; no global harness configuration was edited.
- Validated state: Git base a31e183 plus uncommitted planning and probe files; Windows 11, Node 24.19.0, Bun 1.4.0.
- Open items: the OpenCode 2.x migration PRD (to be created after prd-14 or when the person asks); the TUI-plugin path for OpenCode was only verified through global registration being the sole loaded TUI plugin (project-level TUI registration did not load). The Pi `/exit` the person typed went to the model as a prompt (Pi exits with `/quit`); no impact.

### ADR candidates

None - direct TechSpec implementation or local decision.
