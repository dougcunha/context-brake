# TechSpec — Refactoring [target]

## Sources and traceability

- PRD: `prd.md`
- Current code and tests: [paths]
- Applicable instructions, rules, and skills: [names]

## Technical decisions

| ID | Requirements | Decision | Evidence and reason | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-01 | R-01 | [decision] | [evidence] | [alternatives] |

## Affected components

| ID | Component | Current state | Allowed change | Risk and dependencies |
| --- | --- | --- | --- | --- |
| CMP-01 | `[name/path]` | [responsibility] | [change] | [risk/IDs] |

## Safety net

- Profile: [runtime surfaces, Node.js version, TypeScript configuration, test runner, and commands from `AGENTS.md`]
- End-to-end: [built CLI against fixture repositories | not applicable]
- Command prerequisites and exclusions: [environment, fixtures, and platforms]
- Manual acceptance: [script, expected result, and owner, when needed]

| ID | Requirement | Level | Scenario | Expected result | Command or script |
| --- | --- | --- | --- | --- | --- |
| TC-01 | R-01 | [unit/integration/end-to-end/manual] | [scenario] | [expected result] | `[verification]` |

## Dependency sequencing

| Step | Depends on | Change | Evidence to advance | Reversal |
| --- | --- | --- | --- | --- |
| [step] | [IDs or —] | [action] | [gate] | [procedure] |

## Compatibility and rollout

- Preserved contracts: [IDs]
- Migration or coexistence: [if applicable]
- Observability: [regression signal]
- Rollback: [procedure]

## Quality profile

Rules this refactoring must satisfy at the end. Here the baseline is the target to reduce, not debt to tolerate: a pre-existing hit the refactoring sets out to eliminate is an obligation, and a new hit is a regression in any class.

| ID | Rule | Class | Verification command | Baseline | Target |
| --- | --- | --- | --- | --- | --- |
| QA-01 | [rule] | blocking/reservation | `[rg command scoped to the target]` | [n hits today] | [n hits at the end, or zero] |

- Target measures today: [lines, exported members, max parameters, cases]
- Expected measures at the end: [the same, after the refactoring]

## Risks and open items

- Risk: [probability, impact, and mitigation]
- Open item: [decision and affected items]
