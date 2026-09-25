# ContextBrake Protocol

Applies while this repository has a `task_plan.json` or tool results include a ContextBrake telemetry block. The limits below are defaults; `context-brake.config.json` overrides them.

## Telemetry

A telemetry block reports the session turn, context usage and window size with a percentage, whether usage is measured by the harness or estimated, the current zone, and a recommended action. A turn is one completed tool call. When turn limits are configured, the turn also shows where `RED` starts. Turns never block tool calls; only context usage reaches `CRITICAL`.

In `YELLOW` and `RED`, the action depends on whether `task_plan.json` exists. Without it, keep doing the requested work; never stop only because no plan exists.

## Zones

When several conditions match, the highest zone applies.

| Zone | Default condition | What to do |
| --- | --- | --- |
| `GREEN` | Usage below 50% | Work normally. |
| `YELLOW` | Usage from 50% to 65% | With `task_plan.json`: Finish the current edit, do not start a new plan step, and run the step's validation command. Without it: Keep working, and prefer finishing the current unit of work before starting large new explorations. |
| `RED` | Usage above 65% | With `task_plan.json`: Stop editing. Update `task_plan.json` and `state_checkpoint.json`. If validation passes, commit with `checkpoint: <step title>`. End the response with `[REQUEST_SESSION_RESET]`. Without it: Finish or pause the current unit of work. Record progress where the project already keeps state, or tell the user what remains. End the response with `[REQUEST_SESSION_RESET]`. |
| `CRITICAL` | Usage at 75% or more | Other tool calls are blocked. Only reading or writing the plan and checkpoint, running the validation command, `git status`, `git add`, and `git commit` are allowed. Complete the `RED` actions. |

## Checkpoint

Record discovered constraints, decisions, blocked items, and breaking changes in their own fields of `state_checkpoint.json` instead of a free-form summary. Never write secrets to the checkpoint.

## Starting a new session

After `/clear` or `/new`:

1. If the session starts with a ContextBrake boot summary, use it for steps 2 to 4 and open the files only for details it points to.
2. Read `task_plan.json` and find the `IN_PROGRESS` step, or the first `PENDING` step.
3. Read `state_checkpoint.json` and apply every discovered constraint.
4. Check that the recorded commit exists in the current branch history and that the working tree is clean; report any divergence before editing.
5. Run the validation command of the active step, or of the last completed step, before editing code. If it fails, fix the inherited state before continuing.
6. Continue the active step.
