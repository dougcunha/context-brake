# TechSpec — [feature name]

## Sources and traceability

- PRD: `tasks/prd-[slug]/prd.md`
- Applicable instructions, rules, and skills: [names]
- Research: [`docs/research/` sections used]
- Evidence in existing code: [paths and symbols]

## Solution summary

[Approach and boundaries in up to two paragraphs.]

## Technical decisions

| ID | PRD obligations | Decision | Reason and evidence | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-01 | FR-01, NFR-01 | [decision] | [evidence] | [alternatives] |

## Components and flow

| ID | Component | New or modified | Responsibility | Dependencies |
| --- | --- | --- | --- | --- |
| CMP-01 | `[name/path]` | [state] | [function] | [IDs] |

[Describe the flow between components without transcribing code.]

## Contracts and data

[Include only changed contracts: configuration, plan and checkpoint files, harness payloads, agent-facing text, `--json` output, and exit codes. For each one, document fields, types, requiredness, validation, schema version, compatibility, and necessary examples. Remove the section when it does not apply.]

## Integrations and interfaces

[Include only affected harness hooks or plugins, CLI commands, files, and processes. Document applicable input, output, errors, timeout, idempotency, and failure policy.]

## Errors, security, and recovery

- Errors and edges: [behavior]
- User files and sensitive data: [control, if applicable]
- Concurrency and idempotency: [guarantee, if applicable]
- Rollback or reversal: [procedure]

## Sequencing

| Step | Depends on | Verifiable result |
| --- | --- | --- |
| [step] | [IDs or —] | [evidence] |

## Test approach

- Profile: [runtime surfaces, Node.js version, TypeScript configuration, test runner, and commands from `AGENTS.md`]
- End-to-end: [built CLI against fixture repositories and scenarios | not applicable]
- Platforms: [Linux, macOS, Windows, or the justified subset]
- Command prerequisites and exclusions: [environment and fixtures]
- Manual acceptance: [script, expected result, and owner, when needed]

| ID | Obligations | Level | Scenario | Expected result | Command or suite |
| --- | --- | --- | --- | --- | --- |
| TC-01 | FR-01 | [unit/integration/end-to-end/manual] | [scenario] | [result] | `[command or test file]` |

## Quality profile

Rules this feature can violate. A blocking hit prevents task completion and rejects the review; a reservation becomes an optional improvement and counts toward escalation. A hit covered by `DEC-NN` is expected, not a finding.

| ID | Rule | Class | Verification command | Prior justification |
| --- | --- | --- | --- | --- |
| QA-01 | [rule] | blocking/reservation | `[rg command scoped to the diff]` | `DEC-NN` or — |

- Verification scope: [files in the task diff]
- Escalation trigger: [8+ reservations, a touched file above 200 lines, or duplication in 3+ places]

### Terrain baseline

Hits that already existed in the target files before implementation. A hit listed here is not a task finding; a new hit is. A target file without a row in this table counts as unmeasured, and every hit in it will be treated as new.

| File | Lines | Exported members | Max parameters | Cases | Pre-existing hits | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| `[path]` | [n] | [n] | [n] | [n] | `QA-NN: file:line` | recorded / absorbed in `DEC-NN` / prior refactoring |

- Preparatory refactoring: [not recommended | recommended — minimal scope, reason, and what it makes easy]

## Observability and rollout

- Signals: [applicable logs or diagnostic output]
- Migration and compatibility: [strategy, if applicable]
- Rollout and rollback: [steps and gates]

## Risks and open items

- Risk: [probability, impact, and mitigation]
- Open item: [decision, owner, and affected items]

## Relevant files

- Modify: `[path]`
- Create: `[path, if needed]`
