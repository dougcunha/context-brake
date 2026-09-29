# Context snapshot — prd-10-statusline-powershell-e-modo-light

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-snapshot/SKILL.md`.

## Header

- status: closed
- generated: 2026-09-29
- stage: acceptance
- stage_source: qa_1/
- covers_through: feature accepted at HIL 3 on 2026-09-29 (DEC-HIL-03) after qa_1 APPROVED and codereview_2 APPROVED WITH RESERVATIONS; the diff is uncommitted in the worktree
- authored_code: yes
- git_head: 1906d41
- worktree: uncommitted feature diff in src/ (33), tests/ (50), docs/ (2), README.md, schemas/, tasks/; untracked .agents/settings.local.json
- next_step: none, the flow is closed; reopen only for a new request, and O-02 and O-03 stay with the user
- other_eligible: -
- superseded_by: -

## Load map

| Tier | Load when |
| --- | --- |
| `now` | Session start: header, next step brief, open threads waiting on the user |
| `on-select` | Chosen unit matches a trigger: task or finding ID, affected file, or traceability ID |
| `on-edit` | About to edit or create a path matching a trigger |
| `on-run` | About to run a matching command, or it just failed |
| `on-demand` | A gist is not enough: follow its `src:` pointer, that section only |

Review and QA sessions load only the header, next step brief, `Open threads`, and `on-run` entries.

Entry shape: `- [ID] (when: tier: trigger; trigger) gist — src: path#section; until: condition`

## Next step brief

- Why next: the human accepted the delivery at HIL 3, so the flow is closed; load this snapshot only if a new request reopens the feature.
- Read first: `qa_1/qa.md` (checklist, end-to-end runs, evidence under `qa_1/evidence/`), `codereview_2/codereview.md` (reservations), and `jev-summary.md` for the pilot.
- Known change points: the whole feature diff, `git diff 1906d41`. T01 delivered the shell-neutral bridge and the per-event deadline; T02 delivered the debug channel, the `fullMode` record, the light default, the bridge in light mode, and the docs.
- Applicable entries: O-02, O-03, O-04, O-05, O-06, L-06
- Watch out: no commit exists for the feature; the diff is the worktree, and nothing in the flow has published, committed, or pushed it.

## Decisions

- [D-01] (when: on-select: T01) T01 shipped with nine deviations from the TechSpec, all inside the contract, recorded in `done/task_01.md#Handoff`; the one that reached T02 was that PowerShell receives the command as `-EncodedCommand` — src: done/task_01.md#Handoff; until: feature closed
- [D-02] (when: on-select: T02) T02 shipped with five deviations, recorded in `done/task_02.md#Handoff`; the protocol paragraph is conditional and is now covered by `codereview_1/task_02.md` — src: done/task_02.md#Handoff; until: feature closed

## Learnings

- [L-06] (when: on-run: npm run coverage) The first `pwsh.exe` from a fresh Node process costs about 2.4 s here and about 430 ms warm, and jitters by hundreds of milliseconds under coverage: timing comparisons need both sides to spawn the same way, and a timing assertion needs repetition to be evidence — src: done/task_01.md#Handoff; until: feature closed
- [L-09] (when: on-edit: **) Scripted edits leave two fingerprints that `npm run lint` does not catch: a raw newline inside a template literal (`rg -n --type ts '^`\);$' src/`) and two statements on one line — src: codereview_1/codereview.md#Findings; until: feature closed
- [L-10] (when: on-edit: tests/**; on-run: npm run coverage) A rounded elapsed-time measurement is 0 for a sub-millisecond deadline: never assert a lower bound above zero on `elapsedMs`; assert the deadline selection instead, which is the actual obligation — src: codereview_1/codereview.md#Findings CR-01; until: feature closed

## Code map

- [M-03] (when: on-edit: src/core/services/light-mode-merge.ts; src/cli/commands/init.ts; src/cli/init-config-updates.ts) The `fullMode` key is read at three call sites: the default itself, the bridge choice, and the rejected options — src: done/task_02.md#Handoff; until: feature closed
- [M-05] (when: on-edit: src/core/services/instruction-markers.ts) Removing `debug` from `renderReferenceBlock` is what makes `init` rewrite a PRD-08 block, because `referenceBlockFor` feeds the instruction service and the legacy preview, which compare rendered text against the file — src: src/core/services/instruction-service.ts:32; until: feature closed

## Open threads

- [O-02] (when: now) Manual acceptance of T01 stays with the user: remove `CLAUDE_CODE_GIT_BASH_PATH`, restart the harness, check the status line and the `STATUSLINE_POWERSHELL_FALLBACK` warning, then restore the variable. QA exercised the same behavior mechanically (byte-identical output through Git Bash, PowerShell 7 and 5.1, and the warning in text and `--json`) and could not run the script — src: qa_1/qa.md#Manual acceptance; until: user confirms
- [O-03] (when: now) Manual step of T02 with the user: run `context-brake init --no-light` in this repository to keep dogfooding the full mode, then `doctor` clean. Until it runs, this repository is the state `LIGHT_MODE_DEFAULT_PENDING` describes and its next plain `init` switches to light mode — src: done/task_02.md#Handoff; until: user runs it
- [O-04] (when: now) Pre-existing load-dependent flakes under coverage, unchanged by this feature: `boot-git-delivery` and `runtime-overhead`; both green in the QA run. Rerun alone before calling one a regression — src: tasks.md#Problems and solutions; until: feature closed
- [O-05] (when: now) Three findings left open by decision: the NFR-02 bound is CI-gated (QA measured `delta p95=72.0 ms`, inside the PRD bound), the published JSON Schema cannot express the `lightMode` plus `fullMode` exclusion that the validator enforces, and the bridge buffers stdin without limit as a recorded deviation — src: qa_1/qa.md#Previous findings; until: feature closed
- [O-06] (when: now) Four Low reservations of `codereview_2` accepted as open items at the reservations HIL (`DEC-RES-01`): a 110-raw-line test file that the linter still passes, two handoff `Checks` lines that overstate a clean profile result, FR-11's `boot_git` record proven by composition in the suite (QA exercised it end to end and it holds), and FR-09's `window=harness` in light mode unexercised in the suite (QA exercised it and it holds) — src: codereview_2/codereview.md#Findings; until: feature closed
