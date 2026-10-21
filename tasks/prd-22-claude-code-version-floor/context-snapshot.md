# Context snapshot — prd-22-claude-code-version-floor

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-snapshot/SKILL.md`.

## Header

- status: closed
- generated: 2026-10-21
- stage: acceptance
- stage_source: codereview_02/
- covers_through: codereview_02
- authored_code: yes
- git_head: 419c0bd
- worktree: 9 changed: .gitignore (out of scope), src/, tests/, docs/, tasks/
- next_step: — (completed; commit on request)
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

- Why next: T01 and T02 done; codereview_02 is APPROVED; QA does not run (H-02).
- Read first: codereview_02/codereview.md#conclusion, workflow.md#r-02.
- Known change points: `src/infrastructure/harnesses/claude-code/adapter.ts:33` (`probeVersion`), `src/infrastructure/harnesses/claude-code/capabilities.ts` (new constant).
- Applicable entries: L-01.
- Watch out: tests that asserted the claude-code floor warning must not fix exit code 1 (DEC-05).

## Decisions

- [D-01] (when: on-select: T01; DEC-01) The floor constant lives in `capabilities.ts`, not next to the mod floor — src: techspec.md#technical-decisions; until: T01 done

## Learnings

- [L-01] (when: on-edit: docs/research/harness-integrations.md) Changelog copy with the verified lines is in the session scratchpad `cl/CHANGELOG.md`; it can be gone in a new session, so refetch https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md and check version headings with awk — src: prd.md#problem-and-context; until: T01 done
- [L-02] (when: on-run: npm test) Run only the touched suites by path between steps (user memory); e2e-09 needs `npm run build` first — src: —; until: T01 done

## Code map

- [M-01] (when: on-edit: tests/integration/adapter-version-probes.test.ts) The "every adapter without a runner" test expects `minimumVersion: null` for all adapters; it must special-case claude-code (DEC-04) — src: —; until: T01 done

## Open threads

- [O-01] (when: now) Feature accepted (H-04); not committed — src: workflow.md#h-04; until: commit
