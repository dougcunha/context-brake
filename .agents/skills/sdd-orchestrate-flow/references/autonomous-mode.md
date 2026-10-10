# Autonomous mode

Applies when the feature's checkpoint has `mode: auto`. Without the key, or with `monitored`, this file does not apply and the flow runs as usual.

In auto mode, the user delegates the flow's decisions so the feature goes from request to acceptance without anyone following the session. This session answers the gates, backed by the specs; ContextBrake handles the context: it asks for the snapshot, clears the session, and resumes the flow in a new one. The quality of the PRD and TechSpec therefore decides the quality of the choices: every decision needs a basis in a requirement, a technical decision, `AGENTS.md` or `.agents/rules/`, or the code, and the log shows which.

## Enable and switch

- `--mode auto` on `sdd-orchestrate-flow` or on `sdd-triage`, which passes it to the flow. The flow writes `mode` into the checkpoint when creating it and records the activation in `workflow.md` as a human decision: that decision authorizes the autonomous decisions within this protocol.
- `decision_log` gets `autonomous-decisions.md` by default in auto mode. `--log-decisions <path>` changes the file (relative to the feature folder); `--log-decisions false` writes `null` and turns the log off, a decision that also goes to `workflow.md`.
- Resuming without `--mode` keeps the checkpoint's mode. A `--mode` different from the saved one switches the mode and is recorded in `workflow.md`. In `monitored`, earlier autonomous decisions remain valid.
- With slicing into several PRDs or workstreams, every checkpoint opened inherits `mode` and `decision_log`.
- The level `sdd-triage` chose in auto mode, before the feature folder exists, becomes the first log entry when the flow creates the folder.

## Check ContextBrake

Once per session, at the start, read `context-brake.config.json` at the repository root, and nothing else from ContextBrake. Warn in one line per item, without blocking, and record in the log only the warnings it does not have yet, because every restart is a new session:

| Condition | Consequence to report |
| --- | --- |
| File missing | No automatic restart: the session depends on harness compaction; the checkpoint saved at every boundary keeps resumption possible |
| Current harness not in `activeHarnesses` | No telemetry in this session |
| No `autoRestart` block | The snapshot is written, but the session is neither cleared nor resumed by itself |
| `autoRestart.maxConsecutiveRestarts` below 5 | A long run stops after a few restarts without a typed prompt |
| `snapshot.command` does not name `sdd-snapshot` | The snapshot request does not follow the Write branch |
| `snapshot.resumeCommand` does not name `sdd-orchestrate-flow` | The new session does not resume this flow |

When there is a warning, suggest the command that fixes everything at once: `npx context-brake init --auto-restart --max-restarts 10 --snapshot-command "/sdd-snapshot" --resume-command "/sdd-orchestrate-flow"` (in Git Bash on Windows, prefix it with `MSYS_NO_PATHCONV=1`).

## Decide without asking

At every point where monitored mode would ask the user — HIL 0 to 3, exception, reservations, visual check, questions from the stage skills this flow runs, and session pause choices:

1. Build the question as it would be asked: context, options, and the recommended one.
2. Check the escalation rubric below. If any item applies, escalate.
3. Without escalation, choose the recommended option. Without a clear recommendation, prefer, in this order, the one that preserves the approved contract, the most reversible one, and the one with the smallest scope. A product gap becomes an explicit assumption in the artifact itself, with the log ID.
4. Record it in the log before acting, and record the decision in `workflow.md` with provenance `autonomous` and the log ID; `approved_sources` points to that record. Proceed without waiting.

A problem during execution (failing test, unstable environment, implementation ambiguity) follows the retry and block rules of the stage skills. A blocked task stays recorded and execution continues with the other eligible units; escalation happens only when no independent unit remains.

A deviation the TechSpec does not decide, such as an implementation detail it leaves open, is resolved by the alternative consistent with the `DEC-NN` and the code's patterns, and recorded in the task handoff and in the log. A deviation that contradicts a `DEC-NN` or the PRD scope escalates.

### Escalation rubric

Ask the user only when the decision:

- is irreversible or destructive: deleting user files or data, changing a persisted format without a way back;
- triggers an external action not authorized in the request: push, release, publishing, sending messages, calling a paid or production service;
- touches an area `AGENTS.md` declares critical (e.g. the zone classification and actions, harness settings or hooks, files ContextBrake writes) and the PRD and TechSpec do not decide it;
- changes the approved PRD scope, adding or removing an obligation;
- depends on a contradiction between PRD, TechSpec, and code with no basis in the specs to choose;
- depends on an unavailable environment, credential, or essential manual validation, with no other eligible unit;
- reaches the flow's stagnation rule (two correction rounds without progress);
- has no option the sources sustain.

When escalating: first finish the independent units, save the checkpoint with `status: awaiting-hil` and `pending_hil`, write the snapshot, record the escalation in the log, and ask as in monitored mode. Do not end the reply with `[REQUEST_SESSION_RESET]`: the restart would land on the same question with nobody to answer it.

### Gates

| Gate | Autonomous decision |
| --- | --- |
| HIL 0 | Level from the `sdd-triage` rubric; `spot` follows its spot branch |
| PRD slicing or workstreams | The split the owning skill proposes |
| HIL 1 | Approves the PRD after the coverage check; a blocking pending item becomes a recorded assumption or an escalation |
| Preparatory refactoring | Follows the TechSpec recommendation |
| HIL 2 | Approves TechSpec and plan after the skill's checks; authorizes implementation and corrections within the contract. CLI QA runs when the TechSpec has end-to-end cases or essential manual acceptance |
| Exception | Escalation rubric |
| Reservations | Corrects the reservations that fit the approved contract without widening scope; the others become accepted open items in the log |
| Visual check | Records the script as pending manual acceptance and proceeds to the review |
| QA `REJECTED` | Opens a correction round automatically, as for a rejected review |
| QA `BLOCKED` | Escalation rubric; a missing environment or essential manual validation escalates when no other eligible unit remains |
| HIL 3 | Automatic acceptance, below |

**Automatic acceptance.** With the latest review `APPROVED`, or `APPROVED WITH RESERVATIONS` with the reservations routed, the latest `qa_[num]/qa.md` `APPROVED` when QA was enabled, no blocking obligation open, and no essential manual validation pending, mark the checkpoint `completed`, the snapshot `closed`, and record `automatic acceptance` in the log with the review and QA report paths. A pending visual check or other essential manual validation prevents completion: escalate, with the manual acceptance script and the log summary at HIL 3. ADR candidates and accepted open items go into the final summary: the candidates are moved to `docs/adr/` when the `commit` skill removes the artifacts, and the accepted open items would leave with them.

## Context and session

In auto mode, the flow neither estimates context usage nor asks about continuity. At every session pause boundary:

| Situation | Destination |
| --- | --- |
| No ContextBrake telemetry, or telemetry below the trigger zone | Move on, stating the unit finished and the next one |
| Telemetry asking for the snapshot (trigger zone, `RED`, or `CRITICAL`; its `action=` names the snapshot command) | At `RED`, finish the unit as in monitored mode; at `CRITICAL`, stop at the next consistent point with partial state in the handoff. Then save the checkpoint `paused` with `safe_to_stop: true` (an `active` checkpoint would make the new session suspect another coordinator), write the snapshot through `sdd-snapshot`, and end the reply with `[REQUEST_SESSION_RESET]`, with no question |
| Review or QA as next step, this session wrote the code, and no eligible delegated reviewer or QA runner | The same snapshot path with `[REQUEST_SESSION_RESET]`: the new session did not author the code and runs the review or QA |
| Escalation | Rubric above, without `[REQUEST_SESSION_RESET]` |

Without ContextBrake, the session runs until harness compaction; the checkpoint saved at every boundary is enough to resume.

## Resume without arguments

The new session arrives through ContextBrake's `resumeCommand`, without `--prd`. With more than one checkpoint not `completed`, resume the `mode: auto` one that is not `awaiting-hil` and was saved last (file modification time); among slices sharing a prefix, the next in dependency order. If doubt remains, escalate.

## Decision log

File at `tasks/prd-[slug]/[decision_log]`, append-only, never rewritten. Create it with the title `# Autonomous decisions — [slug]` and one entry per decision, warning, or escalation:

```markdown
## AUTO-NN — [gate or skill/step] — [YYYY-MM-DD HH:MM]

- Question: [as it would be asked to the user]
- Options: [A (recommended) — effect]; [B — effect]
- Choice: [option] | Escalated: [rubric item]
- Reason: [fact and source, with FR/NFR/DEC/TC/CR/BUG IDs or path:line]
- Reversal: [how to undo it and its cost]
```

`AUTO-NN` IDs are stable and cited in `workflow.md`, handoffs, and assumptions. The final HIL 3 summary, automatic or escalated, lists the highest-impact decisions by ID.
