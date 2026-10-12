# Context snapshot — prd-18-mod-como-fonte-do-contexto

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-snapshot/SKILL.md`.

## Header

- status: closed
- generated: 2026-10-11
- stage: acceptance
- stage_source: codereview_01/ (corrections T01-T03 in codereview_01/done/)
- covers_through: codereview_02 (APPROVED WITH RESERVATIONS)
- authored_code: yes
- git_head: 63fd5cb
- worktree: 51 changed paths, uncommitted (src/, tests/, docs/, schemas/, README.md, tasks/)
- next_step: sdd-orchestrate-flow — HIL 3 acceptance (reservations of codereview_02 accepted: CR-01 test-lanes 103 lines, CR-02 MOD_VERSION at release); no CLI QA
- other_eligible: —
- superseded_by: —

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

- Why next: every task is approved; the lean flow keeps the independent review. The reviewer reads only paths, never this conversation.
- Read first: `checkpoint.json` (active_work, review_status, correction_round 1), then `codereview_02/codereview.md` (APPROVED WITH RESERVATIONS); codereview_01 was REJECTED and its corrections are done.
- Known change points: see the three handoffs in `done/`.
- Applicable entries: D-01, L-01 to L-04, O-01, O-02, O-03.
- Watch out: the author session writes nothing while the reviewer runs; no commit has been made (none requested).

## Decisions

- [D-01] (when: now) sdd-lean was chosen by the human against the sdd-full rubric; HIL 1 and HIL 2 merged; the plan has three tasks — src: workflow.md#Decisions; until: feature completed

## Learnings

- [L-01] (when: on-edit: src/infrastructure/harnesses/claude-code/mod/**) `claude plugin validate` refuses `$` passed to anything but a function declared at the top of the file, so the mod keeps no closure with `$`; the publisher skips an unchanged pair by reading the file it wrote — src: docs/research/harness-integrations.md; until: replaced
- [L-02] (when: on-edit: src/infrastructure/harnesses/claude-code/context-source.ts) The real CLI injects no process runner, so `claude --version` was never probed; `detectContextSource` probes with its own `NodeProcessRunner`. Tests must inject a runner (`tests/helpers/claude-version-runner.ts`) or `init` spawns the real `claude` (2.1.296 here) and picks mod-first — src: tasks.md#Problems and solutions; until: replaced
- [L-03] (when: on-run: npm test; npm run coverage) `CLAUDE_CONFIG_DIR` is set on this machine to the personal config folder; an injected `userHome` wins over it; the user-level marketplace `context-brake-local` points to the ContextBrake repository itself, so other repositories load that copy of the mod — src: docs/research/harness-integrations.md; until: replaced
- [L-04] (when: now) A tool-call hook in the mod is awaited: `usage()` plus the write cost 1 to 3 ms; the mod's `tool.call` ran 0.55 to 2.7 s before the settings `PostToolUse` hook (2.1.296, Windows) — src: docs/research/harness-integrations.md; until: replaced

## Open threads

- [O-00] (when: now) HIL 3 is next: present paths (prd, techspec, tasks, done/, codereview_01 REJECTED then codereview_02 APPROVED WITH RESERVATIONS), the validations of the integrated state (lint, typecheck, build, coverage 252 files 1259 tests, schemas:check, package:smoke, test:budget 111 s, plus the end-to-end run in the T03 handoff), the accepted reservations, and the open items below; then offer the commit skill (it offers removing the finished feature's artifacts) — src: checkpoint.json; until: HIL 3 answered

- [O-01] (when: now) The user still has to try mod-first on their own repository: the older mod registered under the shared marketplace name there will shadow the new one until updated — src: done/task_03.md#Handoff; until: user decides
- [O-02] (when: now) A per-project marketplace name (prd-11 install) was not changed; it needs its own decision — src: techspec.md#Risks and open items; until: user decides
- [O-03] (when: now) The runs left one entry in the user-level installed_plugins.json (context-brake-restart@context-brake-local, scope local, projectPath in the scratchpad); local commits 854d42f, adb04d1, 63fd5cb and the whole T01-T03 diff are uncommitted or unpushed — src: workflow.md; until: user decides
