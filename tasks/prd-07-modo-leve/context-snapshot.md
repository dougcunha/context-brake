# Context snapshot — prd-07-modo-leve

> These are hints for the next session, not an authority: artifacts, manifests, handoffs, reports, and code win on conflict. Protocol: `.agents/skills/sdd-snapshot/SKILL.md`.

## Header

- status: closed
- generated: 2026-09-26
- stage: acceptance
- stage_source: codereview_02/
- covers_through: HIL 3 (DEC-HIL-03); feature completed
- authored_code: no
- git_head: c3fb6a8
- worktree: about 62 changed paths, all uncommitted:
  - `src/`, `tests/`, `schemas/`, `README.md`, and `tasks/prd-07-modo-leve/`;
  - the pre-existing dogfood install in `.agents/`, `.context-brake/`, `.gitignore`, and `context-brake.config.json`.
- next_step: — (feature closed)
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

## Next step brief

- **Why next:** `codereview_02` is `APPROVED WITH RESERVATIONS`. Its only reserved item is `OI-01`: `tests/test-lanes.ts` has grown to 106 lines (QA-09). CLI QA is skipped (`DEC-HIL-02`).
- **Reservations HIL:** correct `OI-01`, or finalize with it accepted as an open item. If it is corrected, a new review is required, run in a session that did not make the change.
- **HIL 3:** accept the delivery, covering open threads O-02 and O-03.
- **Read first:** `codereview_02/codereview.md` (`Summary`, `Optional improvements`, `Limitations and open items`) and `workflow.md#Milestone History` item 10.
- **Applicable entries:** O-02, O-03, L-03.

## Decisions

- [D-01] (when: on-select: review; DEC-01) Light mode is the presence of a top-level `lightMode: { triggerZone }` section. It is checked before the plan and the delegated section, with no port calls. It has no snapshot command (HIL 2). — src: techspec.md#Technical decisions; until: feature closed

## Learnings

- [L-02] (when: on-edit: tests/**) ESLint applies `max-lines` 100, `max-lines-per-function` 30, and `max-params` 3 to source and tests. New process-spawning tests must be registered in `tests/test-lanes.ts`. `code-standards.md` forbids code comments. — src: tasks.md#Problems and solutions; until: feature closed
- [L-03] (when: on-run: npm run coverage; on failure: e2e-support-limitations) The full suite takes about 10 minutes here. Rebuild `dist/` before e2e. Process-lane tests can flake under load: rerun the file alone. — src: tasks.md#Problems and solutions; until: feature closed
- [L-04] (when: on-run: bash) A Node heredoc that writes a JS template literal turns `\\*` and `\\n` into broken regex text. Edit regexes with the Edit tool. — src: —; until: feature closed
- [L-05] (when: on-edit: tests/**/doctor*; on-demand: FR-14) Ledgers live in `.context-brake/runtime/sessions/<harness>/*.jsonl`, not in `.context-brake/sessions/` as the PRD words it. — src: src/infrastructure/runtime/runtime-paths.ts; until: feature closed
- [L-06] (when: on-run: node dist/src/cli/main.js) The built CLI entrypoint is `dist/src/cli/main.js`. `init` exits 1 when it applies changes with a warning finding, which is the existing convention. — src: package.json#bin; until: feature closed

## Open threads

- [O-02] (when: now: acceptance) These items remain open:
  - Accepted edge case: with an unparseable config, light mode falls back to the plan failure policy.
  - Linux and macOS are verified only through CI, which needs a commit and a push that the user has not authorized.
  - The optional manual acceptance in a real Claude Code session is pending with the user.

  — src: codereview_02/codereview.md#Limitations and open items; until: HIL 3
- [O-03] (when: now: acceptance) Three NFR-01 deviations need human acceptance at HIL 3. All three are bug fixes:
  - `inSchemaOrder` changes the key order of the first delegated config write;
  - `remove` restores the original bytes for a block that ends a file, both with and without a trailing newline.

  — src: codereview_02/codereview.md#Limitations and open items; until: HIL 3
- [O-04] (when: now: acceptance) `codereview_02/OI-01` (QA-09 reservation, `tests/test-lanes.ts` at 106 lines) awaits the reservations HIL decision. — src: codereview_02/codereview.md#Optional improvements; until: reservations HIL answered
