# Stable execution context

Load in this exact order:

1. `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_07/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T26 — Stop auto-approving Antigravity CLI tool calls and register the documented hook structure

## Outcome

Installing ContextBrake no longer changes whether Antigravity asks before running a tool. The integration registers only a `PreInvocation` handler that injects nothing, in the `hooks.json` structure the Antigravity documentation defines. The `PreToolUse` registration and its `{"decision": "allow"}` response are gone until PRD-02 needs a pre-tool decision.

Existing installs migrate on the next `init`, and `remove` cleans up both the old and the new shape. The research file records why Antigravity has no neutral pre-tool response and what Cursor's `permission: "allow"` means today. The PRD-01 TechSpec records the decision as `DEC-03`.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T28 (edits the same TechSpec section and research file afterwards), T27, and the successor re-review of `codereview_07/CR-02`
- In scope:
  - `antigravity-cli` planner, adapter diagnosis, detector, hooks-file schema, and runtime asset;
  - Antigravity config fixtures and the tests that pin the registration or the asset output;
  - `DEC-03` and the Antigravity Integration Points row in the PRD-01 TechSpec;
  - the Antigravity and Cursor sections of `docs/research/harness-integrations.md`.
- Out of scope:
  - Antigravity payload field names and benchmark fixtures, owned by PRD 1.1 `DEC-04` and `DEC-05` (see cross-feature effects);
  - capability declarations and support levels (PRD 1.1 `DEC-02`);
  - any change to the Cursor hook or its registration (research record only);
  - unparsable-config handling in `planRemove` (T27).
- Cross-feature effects, recorded here and not edited by this task:
  - PRD 1.1 TechSpec `DEC-04` benchmark table uses the Antigravity event `PreToolUse`; while `DEC-03` holds, the measured event must be `PreInvocation`.
  - PRD-02 TechSpec, Antigravity row of the adapter table, answers below the ceiling with `{ "decision": "allow" }`; that must be re-decided before the PRD-02 Antigravity adapter task.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_07/CR-02 | `codereview.md#findings` | `assets/runtime/antigravity-cli-hook.ts:3-4,8` answers every `PreToolUse` with `decision: "allow"`, which the Antigravity docs define as automatic approval |
| codereview_07 | `codereview.md#limitations-and-open-items` | Whether Cursor `permission: "allow"` bypasses approvals was not verifiable |
| `.agents/rules/harness-adapters.md` | Source of Truth | Implement only behavior the harness documentation confirms |
| Antigravity hooks docs, checked 2026-09-14 during correction planning | Configuration | Found while planning CR-02 and grouped here because the same registration code is rewritten; the successor review verifies it. See the note below the table. |

The mismatch found during planning is between the documented shape and what the code writes:
- **Documented:** `hooks.json` maps hook names to event configurations. `PreToolUse` and `PostToolUse` take `matcher` groups; `PreInvocation`, `PostInvocation`, and `Stop` take handler arrays directly.
- **Written by the adapter:** `{"hooks": {"<Event>": {"context-brake": {"command": …}}}}`. The detector and all config fixtures assume the same undocumented shape.

## Requirements

- **DEC-03, delegated HIL decision of 2026-09-14.**
  - **Decision:** register `{"context-brake": {"PreInvocation": [{"type": "command", "command": "node .agents/hooks/context-brake.mjs PreInvocation"}]}}`, with no `PreToolUse` registration until PRD-02 needs one.
  - **Reason:** the docs require `decision` in every `PreToolUse` response and offer no pass-through value. `allow` "Automatically allows the tool execution"; `ask` prompts the user; `force_ask` and `deny_unless_prior_grant` are stricter. PRD-01 hooks contain no brake logic, so a pre-tool registration only adds risk. An empty `PreInvocation` response is documented as optional.
  - **Rejected:** `ask` below the ceiling adds approval prompts, and a published integration reports that unobtainable approvals are denied in headless CLI runs. Keeping `allow` bypasses the user's approvals. Keeping the current shape contradicts the documentation.
- **Install:**
  - The top-level `context-brake` hook is written or replaced with exactly the `PreInvocation` handler above, as a token-span edit. Other top-level hooks stay byte-identical.
  - Legacy ContextBrake entries `hooks.PreToolUse.context-brake` and `hooks.PreInvocation.context-brake` are removed when their event value is an object.
  - The legacy `hooks` key is deleted only when every value left in it is an empty object. A hook named `hooks` that uses the documented shape (event arrays) is user content and stays untouched.
  - A second install plans no config change.
- **Runtime asset:** it answers `PreInvocation` with `{"injectSteps":[]}` and writes nothing, exiting 0, for any other event.
- **Manifest:** the only managed entry is `PreInvocation`, `context-brake`, `.agents/hooks/context-brake.mjs`, in the existing identity format.
- **Removal:** deletes the top-level `context-brake` hook and the legacy entries under the same rules, and nothing else.
- **Detection:**
  - `.agents/hooks.json` is project evidence when a top-level hook object holds at least one documented event key with an array value, or when the file holds a legacy ContextBrake entry.
  - `.agents/` alone, `AGENTS.md`, and unrelated JSON stay non-evidence (IT-16).
- **Doctor:**
  - The integration is present when `context-brake.PreInvocation` holds a handler whose `command` contains `.agents/hooks/context-brake.mjs`.
  - A file holding only legacy entries reports `INTEGRATION_MISSING`, whose remediation runs `context-brake init --yes`.
- **Schema:** `antigravityHooksFileSchema` models the documented structure and stays non-strict.
- **`docs/research/harness-integrations.md`:**
  - Antigravity: the documented structure and handler fields; the decision table; the absence of a pass-through decision; the undocumented working directory. The fail-closed and soft-deny observations are labeled as third-party reports with their links, not as documentation.
  - Cursor: `preToolUse` enforces only `deny` today, so `permission: "allow"` does not bypass allowlists or approval prompts. Source: Cursor staff reply of 2026-05-23 on the forum, with an open bug. If Cursor makes hook verdicts authoritative, `allow` would auto-approve and the Cursor response must be re-decided.
  - The summary table row for Antigravity reflects the new registration.
- **PRD-01 TechSpec:** add `DEC-03` after `DEC-02` in `Key Decisions`, in the existing format. The Antigravity row of `Integration Points` states that only `PreInvocation` is registered and that `PreToolUse` is deferred to PRD-02 by `DEC-03`.
- **Size rules:** `code-standards.md` limits hold for every touched TypeScript file.

## Context to recover on demand

- TechSpec: `Integration Points` (Antigravity CLI row); `Key Decisions` (`DEC-01` and `DEC-02` format); `Testing Approach` IT-16.
- Rules and skills: `.agents/rules/harness-adapters.md`, `file-changes.md`, `node.md` (stdout rule), `tests.md`, `code-standards.md`; `AGENTS.md` research rule; `sdd-execute-corrections`.
- Code:
  - `src/infrastructure/harnesses/antigravity-cli/planner.ts:10-34` and `:67-79` — registration shape, manifest entries, removal
  - `src/infrastructure/harnesses/antigravity-cli/adapter.ts:46-71` — diagnosis checks `hooks.PreToolUse['context-brake']`
  - `src/infrastructure/harnesses/antigravity-cli/detector.ts` — requires a top-level `hooks` object
  - `src/infrastructure/harnesses/antigravity-cli/schemas.ts` — `antigravityHooksFileSchema`
  - `assets/runtime/antigravity-cli-hook.ts` — `PreToolUse` allow response
  - `tests/integration/package-assets.test.ts:27-28`, `tests/unit/harness-schemas-process.test.ts:75`, `tests/integration/minified-config.test.ts:75-76`
  - `tests/fixtures/harnesses/antigravity-cli/{user-hooks,valid-hooks,minified-hooks}.json`
- External sources: [Antigravity hooks](https://antigravity.google/docs/hooks/); [third-party report on fail-closed hooks and soft-denied approvals](https://agenticcontrolplane.com/blog/antigravity-acp-integration); [Cursor forum: authoritative hook verdicts](https://forum.cursor.com/t/support-authoritative-allow-deny-and-ask-verdicts-from-hooks/161342); [Cursor hooks](https://cursor.com/docs/hooks).

## Work

- [x] T26.1 Add failing tests:
  - the built asset writes nothing for `PreToolUse`;
  - install writes the documented structure with only `PreInvocation`;
  - legacy entries migrate.
- [x] T26.2 Update the runtime asset, the planner install and removal edits, and the manifest entries.
- [x] T26.3 Update the detector, the hooks-file schema, doctor diagnosis, and the config fixtures.
- [x] T26.4 Record `DEC-03` and the Integration Points row in the TechSpec, and update the Antigravity and Cursor research sections.
- [x] T26.5 Run the gates, the TechSpec quality profile over the task diff, and the feature-wide Markdown link check.

## Acceptance criteria

- **Asset:** built `dist/assets/runtime/antigravity-cli-hook.mjs` exits 0 with empty stdout for `PreToolUse`, and prints `{"injectSteps":[]}` for `PreInvocation`.
- **Install over fixtures:** installing over an absent file, a documented-shape user-hooks fixture, a minified fixture, and a legacy fixture yields:
  - a `context-brake` hook holding only the `PreInvocation` handler;
  - byte-identical user hooks;
  - no legacy entry;
  - no config change on a second install.
- **Removal:** `remove --yes` leaves user hooks byte-identical and no ContextBrake entry in either shape.
- **Detection and doctor:** detection and the IT-16 cross-signal fixtures pass. `doctor` reports the integration present after install, missing without it, and missing with `init --yes` remediation for a legacy-only file.
- **No auto-approval left:** a search over `src/` and `assets/` finds no Antigravity `PreToolUse` registration and no `decision` value of `allow`.
- **Documentation:** `DEC-03`, the Integration Points row, and both research sections are updated; the feature link check reports 0 broken local links.

## Verification

- Unit: asset event responses; install and removal edits on byte-exact fixtures; detection shapes; schema parsing of documented and legacy files.
- Integration: `planInstall` and `planRemove` over the fixture set; three installs keep user bytes identical; diagnosis over installed, missing, and legacy files.
- End-to-end: the built CLI in a temporary repository whose `.agents/hooks.json` holds a documented user hook. It runs `init --yes`, then `doctor --json` (Antigravity installed, no `PreToolUse` registration), then `remove --yes`. A second repository starts from a legacy install and runs `init --yes` to migrate. Both run in the process lane.
- Manual: read the updated research sections against the linked sources; owner: executor.
- Platforms: Windows locally; Ubuntu, macOS, and Windows × Node 20, 22, and 24 in CI.
- Environment dependency: none.
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run assets:check`, `npm run package:smoke`; TechSpec quality profile QA-01 to QA-06 over the TypeScript files in the task diff.
- Expected evidence: failing-then-passing tests, asset stdout per event, byte comparisons, the search result, green gates, and the CI run ID.

## Affected files

- Modify:
  - `assets/runtime/antigravity-cli-hook.ts`
  - `src/infrastructure/harnesses/antigravity-cli/{planner,adapter,detector,schemas}.ts`
  - `tests/fixtures/harnesses/antigravity-cli/{user-hooks,valid-hooks,minified-hooks}.json`
  - `tests/integration/package-assets.test.ts`, `tests/unit/harness-schemas-process.test.ts`, `tests/integration/minified-config.test.ts`
  - `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md` (`Key Decisions`, `Integration Points`)
  - `docs/research/harness-integrations.md` (summary table, Antigravity CLI and Cursor sections)
- Create:
  - `src/infrastructure/harnesses/common/antigravity-hooks-updater.ts`
  - `tests/fixtures/harnesses/antigravity-cli/legacy-hooks.json`
  - `tests/integration/antigravity-registration.test.ts`
  - `tests/e2e/e2e-antigravity-registration.test.ts`

## Observability and recovery

- Operational signals:
  - the dry-run preview shows the `.agents/hooks.json` update and the legacy cleanup;
  - `doctor` reports `INTEGRATION_MISSING` for legacy-only installs until `init --yes` runs.
- Recovery: revert this task. Reinstalling with the previous package restores the old registration, including its auto-approval.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result:
  - Fixed CR-02 by removing blanket auto-approval (`decision: "allow"`) from Antigravity CLI hook.
  - Implemented documented named-hook structure (`{"context-brake": {"PreInvocation": [...]}}`) in `antigravity-hooks-updater.ts` and `antigravity-cli/planner.ts`.
  - Registered only `PreInvocation` with runtime payload `{"injectSteps":[]}`; `PreToolUse` registration is deferred to PRD-02 (`DEC-03`).
  - Added token-span migration of legacy `hooks.PreToolUse.context-brake` and `hooks.PreInvocation.context-brake` entries, deleting legacy `hooks` wrapper only when empty.
  - Updated detector, doctor diagnosis, and schema validation.
  - Documented `DEC-03` and updated Integration Points in `techspec.md`, and updated Cursor and Antigravity research sections in `docs/research/harness-integrations.md`.
- Changed files:
  - `assets/runtime/antigravity-cli-hook.ts`
  - `src/infrastructure/harnesses/antigravity-cli/adapter.ts`
  - `src/infrastructure/harnesses/antigravity-cli/detector.ts`
  - `src/infrastructure/harnesses/antigravity-cli/planner.ts`
  - `src/infrastructure/harnesses/antigravity-cli/schemas.ts`
  - `src/infrastructure/harnesses/common/antigravity-hooks-updater.ts`
  - `tests/fixtures/harnesses/antigravity-cli/user-hooks.json`
  - `tests/fixtures/harnesses/antigravity-cli/valid-hooks.json`
  - `tests/fixtures/harnesses/antigravity-cli/minified-hooks.json`
  - `tests/fixtures/harnesses/antigravity-cli/legacy-hooks.json`
  - `tests/integration/package-assets.test.ts`
  - `tests/unit/harness-schemas-process.test.ts`
  - `tests/integration/minified-config.test.ts`
  - `tests/integration/antigravity-registration.test.ts`
  - `tests/e2e/e2e-antigravity-registration.test.ts`
  - `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md`
  - `docs/research/harness-integrations.md`
- Checks:
  - `npm run lint && npm run typecheck`: clean, 0 errors, 0 warnings.
  - `npm run build`: clean asset bundling, schema generation, and tsc compilation.
  - `npm test`: 70 test files passed, 265 unit/integration/e2e tests passed.
  - `npm run coverage`: Stmts 91.67%, Branches 83.8%, Functions 95.77%, Lines 91.67% (threshold: 80%).
  - `npm run schemas:check`: clean.
  - `npm run assets:check`: clean.
  - `npm run package:smoke`: 198 packaged files verified, executable smoke tested.
  - `npm run dependencies:check`: clean.
  - Quality Profile (QA-01 to QA-06): all files ≤ 80 lines (limit 100), all functions ≤ 30 lines (limit 30), 0 `any`, 0 comments, 0 generic throws, 0 core imports of infra/cli.
  - Ripple search: `rg '"allow"' src/ assets/` returned 0 hits.
- Validated state: master branch with T25 and T26 changes on Windows 11 (pwsh, Node v24.19.0).
- Open items: None for CR-02. Proceed to T28 (CR-07) and T27 (CR-06).
