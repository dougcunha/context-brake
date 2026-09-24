# Context snapshot — prd-05-automacao-de-release-e-publicacao

> Hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-orchestrate-tasks/references/session-continuity.md`.

## Header

- status: closed
- generated: 2026-09-24
- stage: acceptance
- stage_source: tasks.md
- covers_through: HIL 3 accepted (feature completed)
- authored_code: yes
- git_head: eb2f386
- worktree: uncommitted prd-04 and prd-05 files (clean baseline at eb2f386)
- next_step: none — feature completed
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

- Why next: All implementation tasks (T01–T03) are completed and verified; the next SDD stage is Step 5 (Code Review via `sdd-review-code`).
- Read first: `tasks/prd-05-automacao-de-release-e-publicacao/tasks.md` and `techspec.md#test-approach`.
- Known change points: `.github/workflows/release.yml`, `scripts/check-release-tag.ts`, `docs/release-guide.md`, `package.json`, `eslint.config.js`, `tests/unit/check-release-tag.test.ts`, `tests/unit/release-workflow.test.ts`.
- Applicable entries: D-01, D-02, L-01, L-02, O-01.
- Watch out: The SDD independence rule requires running code review in a session that did not author the implementation code. If continuing in this session, the limitation must be documented.

## Decisions

- [D-01] (when: on-select: review; DEC-01) Single-job GitHub Actions workflow with minimal permissions (`contents: write`, `id-token: write`) for OIDC provenance publishing — src: tasks/prd-05-automacao-de-release-e-publicacao/techspec.md#technical-decisions; until: review closed
- [D-02] (when: on-select: review; DEC-06) `docs/release-guide.md` kept out of npm package tarball to avoid footprint bloat — src: tasks/prd-05-automacao-de-release-e-publicacao/techspec.md#technical-decisions; until: review closed

## Learnings

- [L-01] (when: on-run: npm run lint) ESLint config ignores `tasks/**` and `.agents/**` to prevent pre-existing non-source scripts in older task folders from causing lint failures — src: tasks/prd-05-automacao-de-release-e-publicacao/tasks.md#problems-and-solutions; until: repository cleanup
- [L-02] (when: on-run: npm test) `tests/integration/boot-git-delivery.test.ts` has a tight 1000ms budget that can timeout under heavy parallel test load; test lane passes cleanly when run in isolation — src: —; until: test suite optimization

## Code map

- [M-01] (when: on-edit: scripts/check-release-tag.ts) Validates tag string matching package.json version with cross-platform argv / env fallback — src: scripts/check-release-tag.ts; until: feature complete
- [M-02] (when: on-edit: .github/workflows/release.yml) GitHub Actions release pipeline with provenance publishing and GitHub Release creation — src: .github/workflows/release.yml; until: feature complete

## Open threads

- [O-01] (when: now) Step 5 Code Review (`sdd-review-code`) pending; independence rule recommends running review in a new session — src: tasks/prd-05-automacao-de-release-e-publicacao/workflow.md#human-decisions-log; until: review started
