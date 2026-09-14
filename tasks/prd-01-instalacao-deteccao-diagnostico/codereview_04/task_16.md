# T16 — Bind the corrected tree to a revision and capture complete CA-20 platform evidence

## Outcome

One immutable revision containing T12–T15 has reviewable, green evidence for the full Node 20/22/24 matrix on Ubuntu, macOS, and Windows, including E2E-10 execution for CA-01, CA-05, and CA-07 plus Windows PowerShell and Git Bash coverage. The task remains pending until that external evidence exists.

## Dependencies and boundaries

- Depends on: T12, T13, T14, T15, T17, T18, T19, T20, T21, T22.
- Unblocks: `codereview_04/CR-01`, `codereview_05/CR-01`, and the PRD-01 approval decision.
- In scope: identifying one immutable corrected revision, running the existing CI matrix or equivalent recorded platform runs, proving E2E-10 executed rather than skipped, and recording durable job/artifact references in this task's Handoff.
- Out of scope: claiming success from workflow declaration or local Windows output, weakening link tests, changing product behavior or CI workflow configuration, creating a remote without explicit authorization, or treating an uncommitted worktree as immutable evidence.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| `codereview_04/CR-01` | `codereview.md#findings` | The repository has no commit, remote, or CI artifact; current execution proves only Windows PowerShell and Scoop Git Bash, so Linux/macOS CA-20 evidence is missing. |
| `codereview_05/CR-01` | `codereview.md#findings` | Same obligation, still open at the `codereview_05` review: no commit, remote, or CI artifact; T16 pending. Added by `codereview_05` correction planning, which reuses this task instead of creating a duplicate. |
| PRD | CA-20 and platform restriction | CA-01, CA-05, and CA-07 must pass on Linux, macOS, and Windows with the required shell coverage. |
| TechSpec | E2E-10 and build-order item 8 | Critical built-CLI scenarios and the full Linux/macOS/Windows CI matrix must pass before feature completion. |

## Requirements

- Use a commit SHA or equivalent immutable revision that contains the completed T12–T15 corrections and exactly matches every recorded run.
- That revision must also contain the completed `codereview_05` corrections T17–T22 (added by `codereview_05` planning). Runs from the initial commit `8401e7f` predate them and do not satisfy this task.
- Execute Node 20, 22, and 24 on Ubuntu, macOS, and Windows: nine successful matrix combinations with install, schema, dependency, build, typecheck, lint, test, coverage, and package-smoke gates.
- In every required platform slice, retain evidence that E2E-10 CA-01/CA-05/CA-07 test bodies executed. After T14, any required CI link-capability failure must fail the job rather than produce a misleading green result.
- Retain Windows evidence for both PowerShell and Git Bash launch variants and record runner OS/image, Node version, shell variant, immutable revision, timestamps, job URL/artifact identifier, and outcome.
- Do not mark T16 complete when any matrix cell is missing, rerun against a different revision, skipped at the required link boundary, or accessible only as an unbound local log.

## Context to recover on demand

- TechSpec: `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md` — E2E-10 and build-order item 8.
- Rules and skills: `.agents/rules/node.md`, `.agents/rules/tests.md`, `AGENTS.md`, `sdd-execute-task`, `sdd-review-code` evidence/status rules.
- Code: `.github/workflows/ci.yml` — declared 3×3 matrix and gates; `tests/e2e/e2e-10.test.ts` and its cross-platform helpers — CA-01/CA-05/CA-07 and shell execution; T14 — enforced link-scenario execution.

## Work

- [ ] T16.1 Confirm T12–T15 are complete and all local gates are green, then identify the immutable revision to validate; record the exact SHA and clean/dirty state.
- [ ] T16.2 With explicit repository/CI authorization in place, run the 3×3 Node/platform matrix from that revision using `.github/workflows/ci.yml` or an equivalent recorded runner setup.
- [ ] T16.3 Inspect all nine jobs for complete gate execution and retain per-platform E2E-10 output proving CA-01, CA-05, and CA-07 ran; retain separate Windows PowerShell and Git Bash evidence.
- [ ] T16.4 Record job URLs or durable artifacts, revision, runner details, shell variants, timestamps, and outcomes in the Handoff; leave the task pending and name every missing cell if evidence is incomplete.

## Acceptance criteria

- All nine combinations of Node 20/22/24 and Ubuntu/macOS/Windows pass from one immutable corrected revision.
- Each required runner executes E2E-10 CA-01, CA-05, and CA-07 without a silent link-capability return; Windows evidence covers both PowerShell and Git Bash.
- The recorded SHA matches the source used by every job, and the Handoff provides durable, reviewable references plus runner and timestamp metadata.
- No result is inferred from YAML configuration alone; missing infrastructure or authorization leaves the task explicitly pending.

## Verification

- Unit: not applicable; T16 validates previously tested code.
- Integration: included in every matrix job through `npm test` and `npm run coverage`.
- End-to-end: E2E-10 executes CA-01, CA-05, and CA-07 on Linux, macOS, and Windows; Windows uses PowerShell and Git Bash variants.
- Manual: verify the immutable SHA and inspect every job/artifact for actual E2E-10 execution and absence of required skips.
- Platforms: Ubuntu, macOS, and Windows × Node 20, 22, and 24; Windows PowerShell and Git Bash.
- Environment dependency: **PENDING** — the current repository has zero commits, no `HEAD`, no remote, and no CI run artifact. Execution requires explicit authority and access to create/use an immutable revision and multi-platform runners.
- Environment update (added by `codereview_05` planning, 2026-09-14): **still PENDING**.
  - A local initial commit `8401e7f` exists, with no remote; it predates T17–T22.
  - Linux runner available: WSL 2 Ubuntu 26.04 (kernel `6.18.33.2-microsoft-standard-WSL2`), nvm v0.40.7, Node 20.20.2, 22.23.2, and 24.21.0.
  - That WSL PATH includes 50 Windows `/mnt` entries, which make Windows `node.exe` and `npm.cmd` reachable. Linux runs must strip `/mnt` entries from PATH and clone the SHA into the Linux filesystem.
  - Open HIL decision: whether a SHA-bound WSL log counts as a durable equivalent recorded run instead of a CI job URL.
  - Still unavailable: any macOS runner, and Windows runs on Node 20 and 22.
- Commands: `npm ci --ignore-scripts`, `npm run schemas:check`, `npm run dependencies:check`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`, `npm run package:smoke` in every matrix job.
- Expected evidence: nine green, SHA-bound job records; E2E-10 case output for each platform; Windows shell-variant output; no required link skips.

## Affected files

- Modify: this task's Handoff only after external evidence exists.
- Create: external CI run records/artifacts; no new repository artifact is required.

## Observability and recovery

- Operational signal: immutable job URLs/artifact IDs map one SHA to all matrix cells and show E2E-10 execution.
- Recovery: failed or incomplete jobs leave T16 pending with exact missing evidence; rerun the same SHA after correcting runner infrastructure, never relabel a partial run as complete.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Pending execution.
- Changed files: Pending execution.
- Checks: Pending execution.
- Validated state: Pending execution (code or diff, configuration, platform, and environment).
- Open items: Current blocker is the absence of an immutable revision, remote/runner access, and Linux/macOS CI artifacts.
