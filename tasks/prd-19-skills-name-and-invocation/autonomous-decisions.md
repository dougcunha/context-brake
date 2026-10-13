# Autonomous decisions — 19-skills-name-and-invocation

## AUTO-01 — ContextBrake check — 2026-10-13

- Question: is ContextBrake configured for an unattended run?
- Options: proceed (recommended) — no warning applies; warn and suggest the fix command.
- Choice: proceed. `context-brake.config.json` lists `claude-code` in `activeHarnesses`, has `autoRestart.maxConsecutiveRestarts` 10, `snapshot.command` `/sdd-snapshot`, and `snapshot.resumeCommand` `/sdd-orchestrate-flow`.
- Reason: `context-brake.config.json` at the repository root.
- Reversal: none needed.

## AUTO-02 — HIL 0, process level — 2026-10-13

- Question: which process level, given the rubric recommends `sdd-full`?
- Options: sdd-lean (recommended: the user already chose it, H-03); sdd-full (the rubric level).
- Choice: sdd-lean. Not escalated: an explicit human decision exists and the autonomous protocol takes the rubric level only when nobody decided.
- Reason: `workflow.md` H-03; `tasks/triage-log.jsonl` 2026-10-13.
- Reversal: switch to full by recording a new decision; the PRD and TechSpec gain the separate HIL 1 and HIL 2 stops.

## AUTO-03 — PRD drafting, config key names — 2026-10-13

- Question: keep the keys `snapshot.command` and `snapshot.resumeCommand` (value becomes a bare skill name) or rename them to `skill` and `resumeSkill`?
- Options: keep the keys (recommended: smallest scope, the contract the user described changes only in the value; the flags and prompts stay recognizable); rename (honest names, but touches the published schemas, flags, doctor report, README, and AGENTS.md).
- Choice: keep the keys. Descriptions, prompts, and errors say "skill name".
- Reason: H-02 asks only for the value to become a name; autonomous-mode.md prefers the option with the smallest scope.
- Reversal: a later slice can rename the keys; with no users, the cost is the same as today.

## AUTO-04 — PRD drafting, how a harness without an explicit syntax is addressed — 2026-10-13

- Question: which form does the text use for OpenCode and Antigravity CLI, whose docs describe no explicit invocation syntax that works without extra setup?
- Options: plain-language instruction naming the skill (recommended: works without setup, no wrong sigil); the `/name` form (only works in OpenCode when the skill sets `opencode/slash`, and Antigravity documents no slash for skills).
- Choice: plain-language instruction. For oh-my-pi, `/skill:name` is documented but needs `skills.enableSkillCommands`; the PRD records it as an assumption and the TechSpec decides the form.
- Reason: vendor docs checked 2026-10-13 (see the PRD sources).
- Reversal: change the formatter of one adapter.

## AUTO-05 — TechSpec, Oh-My-Pi form — 2026-10-13

- Question: `/skill:name` or the plain sentence for Oh-My-Pi, whose skill commands exist only with `skills.enableSkillCommands` (default not documented)?
- Options: plain sentence (recommended: works without setup, reversible by one line); `/skill:name` (documented but setting-dependent).
- Choice: plain sentence. Pi keeps `/skill:name`, which its docs describe as always available.
- Reason: PRD 19 A-05; `https://github.com/can1357/oh-my-pi/blob/main/docs/slash-command-internals.md` (checked 2026-10-13).
- Reversal: change the constant in `src/infrastructure/harnesses/oh-my-pi/skill-invocation.ts`.

## AUTO-06 — TechSpec, where the per-harness form lives — 2026-10-13

- Question: add `skillInvocation` to the `HarnessAdapter` classes, or keep one constant per harness shared by the runtime descriptor and a resolver?
- Options: per-harness constant + `RuntimeDescriptor.skillInvocation` + a `Record<HarnessId, …>` resolver for the CLI (recommended: no adapter class grows, and `codex-cli/adapter.ts` is already at 101 lines; the Record makes a new harness fail to compile until it declares its form); a method on every adapter class.
- Choice: per-harness constant.
- Reason: `AGENTS.md` architecture (harness knowledge inside the harness folder); `code-standards.md` (100 lines per file).
- Reversal: move the constants behind an adapter method; callers use the resolver port only.

## AUTO-07 — Merged HIL 1 and HIL 2 (lean) — 2026-10-13

- Question: approve the PRD, TechSpec, DAG, and tasks, and authorize implementation and corrections within the contract?
- Options: approve (recommended); request changes.
- Choice: approve. Coverage check: every FR/NFR maps to a task and a TC (tasks.md traceability); IDs unique; DAG acyclic; commands exist in AGENTS.md; no blocking pending item; no escalation rubric item applies (the config format change was decided by the user in H-02; the zone text is decided by DEC-05; no external action).
- Reason: prd.md, techspec.md (DEC-01..DEC-09), tasks.md coverage gate.
- Reversal: stop before T01; no code changed yet.
- Sources: prd.md sha256 8adb9db4507c01ad4ab1ef8f3c5aa979f9da6aa739a11728ab318e9c9ce50700; techspec.md sha256 28a405d569dfb0e68161e349f0233633154319e49a67a1a586dd7150bc1da2c1; tasks.md sha256 1ed180094a644fcc1fa3b0764077f7c5b9e8276a1256bab855ecca0db82570bf.

## AUTO-08 — T03, wording of the doctor lines — 2026-10-13

- Question: label the sentence form `plain sentence` in the `doctor` text, as the PRD UX bullet said?
- Options: print the form as is (recommended: the resolver returns the text, so the doctor cannot tell a sentence from a slash form, and the sentence is already words); add a label by comparing the output to a known function.
- Choice: print as is. PRD UX bullet and TechSpec DEC-06 reworded; no requirement or acceptance criterion changed.
- Reason: PRD NFR-04/UX goal (never color or glyph only) holds; `src/cli/output/doctor-mode-text.ts`.
- Reversal: add a `kind` to the report entry in a later change.

## AUTO-09 — T04, where the per-harness preview appears — 2026-10-13

- Question: show the form each selected harness will receive right after the name is typed, or in the summary card shown before the confirmation?
- Options: summary card (recommended: the wizard knows the harnesses and the resume skill only at the end; no new prompt-port method; one place to read); a note after each answer (needs a new `note` method on the prompt port and runs before the choices are complete).
- Choice: summary card, rows `In <harness>` under the Snapshot card. FR-06 acceptance is met through `AssistantFacts.invocations` (tested) and the summary rows.
- Reason: `src/cli/assistant/summary-rows.ts`, `invocation-facts.ts`; PRD FR-06 asks that the person sees the forms before accepting, and the summary precedes the confirmation (prd-16 FR-07).
- Reversal: add a note method to `PromptPort` later.

## AUTO-10 — T05, refreshing the installed hook assets of this repository — 2026-10-13

- Question: run `context-brake init --yes` here so `doctor` stops reporting ASSET_OUTDATED?
- Options: leave it and report (recommended: the installed hook script is the one running this session and the area is critical in AGENTS.md; no spec decides it); run `init --yes`.
- Choice: escalate-by-report, not by blocking: the work needs no answer; the final summary asks the user to run it.
- Reason: .agents/rules/file-changes.md and AGENTS.md critical areas; autonomous-mode.md escalation rubric (harness settings or hooks, files ContextBrake writes).
- Reversal: none needed.

## AUTO-11 — Corrections plan for codereview_01 — 2026-10-13

- Question: which findings of the REJECTED review become correction tasks?
- Options: A (recommended) — plan CR-01 (the block) and CR-02 (unmet TechSpec contract), accept CR-03..CR-06 as open items; B — plan all six, which widens the round into optional test additions and wording changes.
- Choice: A
- Reason: CR-01 is the only block (FR-08/T05); CR-02 is a TechSpec "Contracts and data" obligation (NFR-05) the review marked NO. CR-03 has "cause pending" for the wording, CR-04/CR-05 are optional tests the reviewer marked optional, CR-06 is a 3-line reservation on a test file; none is required by the PRD acceptance. Autonomous mode: reservations that fit the contract without widening scope are corrected, the others become accepted open items (autonomous-mode.md, Gates).
- Reversal: add tasks to `codereview_01/` for the accepted items, or take them at HIL 3.

## AUTO-12 — Reservations HIL after codereview_02 — 2026-10-13

- Question: `codereview_02` is APPROVED WITH RESERVATIONS (four Low items carried from codereview_01: CR-03, CR-04, CR-05, CR-06). Correct them or finalize?
- Options: A (recommended) — finalize with the four as accepted open items, as AUTO-11 already decided; B — open a correction round for the test additions and the wording, which needs a third review.
- Choice: A
- Reason: none leaves an essential requirement, security, or validation pending (the reviewer states so); each is marked optional; the correction round would widen the optional test scope and cost another independent review. Autonomous-mode Gates: reservations that do not fit the contract without widening scope become accepted open items.
- Reversal: add correction tasks for the four items in a new round, or take them at HIL 3.

## AUTO-13 — QA REJECTED (qa_01, BUG-01): open a correction round — 2026-10-13

- Question: `qa_01/qa.md` is REJECTED with one Low bug, BUG-01 (the `init` flag error does not name the flag or the file), the same gap as the accepted `codereview_01/CR-03`. Correct it or accept it?
- Options: A (recommended) — correct it, then a new review and a new QA run; B — accept it as an open item.
- Choice: A
- Reason: autonomous-mode.md Gates: "QA `REJECTED` opens a correction round automatically". The PRD FR-02 acceptance says the flag case names the file or flag, so this is an unmet obligation, not an optional improvement; the fix is a one-line message change inside the contract. It supersedes the AUTO-11 acceptance of CR-03 only; CR-04..CR-06 stay accepted.
- Reversal: revert `snapshot-merge.ts` and the two test expectations.

## AUTO-14 — Reservations after codereview_03 — 2026-10-13

- Question: `codereview_03` is APPROVED WITH RESERVATIONS: BUG-01 is closed, one new Low item (CR-01: the wizard re-ask shows the flag advice, which a wizard user cannot act on) and three carried ones. Correct them or finalize?
- Options: A (recommended) — finalize with the four as accepted open items; B — correct CR-01 (give `mergeSnapshot` a way to omit the advice for the wizard), which invalidates the review and QA evidence and needs another review and QA run.
- Choice: A
- Reason: the reviewer marks all four optional and none leaves an essential requirement, security, or validation pending; the wizard message still carries the key, the rule, and the bare name, and the advice is accurate for `init` flags. A further code change would restart the review and QA cycle for a cosmetic wizard wording.
- Reversal: a new correction task: split the advice out of `mergeSnapshot`'s message (for example return it as a separate field) and let only `init-arguments` append it.

## AUTO-15 — HIL 3, automatic acceptance — 2026-10-13

- Question: accept the delivery of 19-skills-name-and-invocation?
- Options: A (recommended) — automatic acceptance; B — escalate.
- Choice: A
- Reason: latest review `codereview_03/codereview.md` is APPROVED WITH RESERVATIONS with the reservations routed (AUTO-11, AUTO-12, AUTO-14); latest QA `qa_02/qa.md` is APPROVED; no blocking obligation open; TechSpec manual acceptance is "none"; no visual check applies (CLI). Accepted open items: wizard re-ask shows flag advice (codereview_03/CR-01), no stored old-format config test through doctor or a hook (CR-02), per-harness exact RED/CRITICAL/resume text asserted by composition (CR-03), `tests/unit/assistant-output.test.ts` at 104 lines (CR-04). Outside the slice: installed hook assets of this repository are outdated until the user runs `context-brake init --yes` (AUTO-10, O-02). Highest-impact decisions: AUTO-03 (keys stay `command`/`resumeCommand`), AUTO-04/05 (plain sentence for OpenCode, Oh-My-Pi, Antigravity), AUTO-09 (preview in the summary card), AUTO-13 (BUG-01 corrected).
- Reversal: reopen the checkpoint (`phase: acceptance`) and add correction tasks.

## AUTO-16 — 20-skills-wizard-discovery, HIL 1 (PRD) — 2026-10-13

- Question: approve the PRD of slice 20 (skill discovery in the init wizard)?
- Options: A (recommended) — approve after the coverage check; B — revise first.
- Choice: A
- Reason: the PRD covers H-01 (suggest best snapshot and resume skills, list alternatives, allow another value, every harness), every requirement has an observable criterion, the dependency on slice 19 is satisfied (accepted, AUTO-15), and no blocking pending item exists; the three assumptions (folders re-checked per adapter, name from frontmatter or folder, three alternatives) are explicit in the PRD. Level stays sdd-lean (H-03): HIL 1 and HIL 2 merge after TechSpec and tasks.
- Reversal: reopen the PRD; derivatives are invalidated by content hash (403df4ed21f910929a457f5b4a302372e06aaceabdc3b675b4688de6a85bff4a).

## AUTO-17 — 20-skills-wizard-discovery, merged HIL 2 (TechSpec and plan) — 2026-10-13

- Question: approve the TechSpec and the task plan of slice 20 and authorize implementation and corrections within them?
- Options: A (recommended) — approve after the coverage gate; B — revise first.
- Choice: A
- Reason: every FR/NFR/OBJ maps to a DEC, a component, a task, and a test (tasks.md coverage gate); the quality profile and terrain baseline are measured (no preparatory refactoring needed); the only judgment calls are recorded as assumptions: the typed question stays the fallback when nothing matches (US-03), and FR-06 coverage ranking applies among equal scores so a name match is never outranked (DEC-04, OBJ-04). CLI QA is enabled: the TechSpec keeps the built-CLI `init` smoke (TC-14) as a regression case, and slice 19's QA found a real defect the review had not.
- Reversal: reopen the TechSpec; tasks are invalidated by content hash.

## AUTO-18 — 20-skills-wizard-discovery, codereview_01 REJECTED (resume `none`) — 2026-10-13

- Question: the review rejects the resume question's `none` (no flag clears only the resume skill, so the choice is silently ignored). Drop `none` from the resume question, or add a way to clear the resume skill?
- Options: A (recommended) — drop `none` from the resume question and refuse the typed word `none` with a message naming `--no-snapshot-command`; B — add a `--no-resume-command` flag, a schema-visible and CLI change outside the PRD.
- Choice: A
- Reason: TechSpec DEC-06 already said the resume question has no `none`; the PRD scope forbids new flags ("the flags ... behave as in slice 19", FR-07); the option with the smallest scope that preserves the approved contract. Autonomous-mode.md Gates: REJECTED review opens a correction round.
- Reversal: add the flag in a new slice and restore `none` for the resume role.

## AUTO-19 — 20-skills-wizard-discovery, reservations after codereview_02 — 2026-10-13

- Question: `codereview_02` is APPROVED WITH RESERVATIONS (OI-01 a configured resume skill equal to the newly chosen snapshot skill is still preselected; OI-02..OI-05 optional). Correct them or finalize?
- Options: A (recommended) — finalize with the five as accepted open items; B — fix OI-01 (ignore a configured resume skill equal to the chosen snapshot skill), which invalidates the review evidence and needs another review and QA.
- Choice: A
- Reason: the reviewer states none leaves an essential requirement pending and that FR-04 and FR-05 conflict on OI-01 with both explicit acceptance criteria passing; the case needs a stored resume skill that the user then also picks as the snapshot skill. It is recorded for HIL 3 and for the final summary as the most useful follow-up.
- Reversal: in `askCommandOptions` pass `current` as undefined for the resume question when it equals the chosen snapshot skill, and add a unit case.

## AUTO-20 — 20-skills-wizard-discovery, HIL 3, automatic acceptance — 2026-10-13

- Question: accept the delivery of 20-skills-wizard-discovery?
- Options: A (recommended) — automatic acceptance; B — escalate.
- Choice: A
- Reason: latest review `codereview_02/codereview.md` is APPROVED WITH RESERVATIONS with the reservations routed (AUTO-19); latest QA `qa_01/qa.md` is APPROVED with no bugs; no blocking obligation open; TechSpec manual acceptance is "none". Accepted open items: a configured resume skill equal to the newly chosen snapshot skill stays preselected (OI-01, the most useful follow-up); two test-double `new Error` (QA-07); tie-break by `localeCompare`; a redundant scan of a folder shared by several harnesses; the resume-refusal message wording when no resume skill is configured. Not verifiable: Linux and macOS, the POSIX-only EACCES test, a real-terminal clack select (the QA runner drove the wizard through `winpty` in both prompt modes; `winpty` reported exit code 3 on teardown). `test:budget` has a thin margin under load (one run at 179.1 s of 180 s, then 122.7 s). Highest-impact decisions: AUTO-16 and AUTO-17 (approvals), AUTO-18 (no `none` for the resume skill), AUTO-19.
- Reversal: reopen the checkpoint (`phase: acceptance`) and add correction tasks.
