# Stable execution context

Load in this exact order:

1. `tasks/prd-13-refatoracao-modo-leve-testes-rapidos/codereview_02/codereview.md`
2. This file

---

# T11 — Record the human decision that keeps T10

## Outcome

T10 traces to a recorded human decision: DEC-EXC-02 in `workflow.md`.

## Dependencies and boundaries

- Depends on: —
- Unblocks: re-review of codereview_02
- In scope: the DEC-EXC-02 row in `../workflow.md`, and the traceability and open item in `../codereview_01/done/task_10.md`.
- Out of scope: code.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_02/CR-01 | `codereview.md#Findings` | T10 reverses a recorded choice without a decision |
| DEC-EXC-02 | `../workflow.md#Human Decisions Log` | Human choice "Manter a T10 (Recommended)" |

## Work

- [x] T11.1 Record DEC-EXC-02 with the human text and choices.
- [x] T11.2 Replace T10's "conversation" source with DEC-EXC-02 and update its open item.

## Acceptance criteria

- `workflow.md` holds DEC-EXC-02, and `task_10.md` cites it.

## Handoff

- Produced result: `workflow.md` gains DEC-EXC-02, with the user's report text, the choice "Manter a T10 (Recommended)", and the dialog status "Não observei ainda". `codereview_01/done/task_10.md` now traces to DEC-EXC-02 instead of "conversation", and its open item points to HIL 3.
- Changed files: `workflow.md`, `codereview_01/done/task_10.md`.
- Checks: both files contain `DEC-EXC-02` (grep). No code changed in this round, so the test, lint, and budget evidence from codereview_02 still applies.
- Validated state: artifacts only.
- Open items: whether the dialogs stop goes to HIL 3.
