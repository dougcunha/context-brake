# PRD — Skill discovery and alternatives in the init wizard

## Problem and context

After slice `19-skills-name-and-invocation`, the configuration holds a bare skill name. The wizard still asks for it as free text, so the user has to remember which skill snapshots the session and which resumes the work. The project already has them as skills in its harness folders (this repository has `sdd-snapshot` and `sdd-orchestrate-flow`).

The user asked (H-01) for the wizard to look at the skills of the project, find the ones for snapshot/handoff/checkpoint and for resuming (including flow-orchestration skills), suggest the best match, list alternatives, and allow another value. It must work for every supported harness through a port in each adapter.

## Outcomes and metrics

| ID | Expected outcome | Metric or evidence |
| --- | --- | --- |
| OBJ-01 | The wizard proposes a snapshot skill and a resume skill found in the project | In a fixture project with `sdd-snapshot` and `sdd-orchestrate-flow`, the first option of each question is that skill |
| OBJ-02 | The user can pick an alternative or type another name | Up to 3 alternatives plus "type another" in each question |
| OBJ-03 | The mechanism is the same for the 8 harnesses | Each adapter implements the catalog port; a harness without folders yields no suggestion and no error |
| OBJ-04 | A wrong suggestion is unlikely | Scoring is by name first, with a fixture set of look-alike skills (commit, review, triage) that never wins |

## Stories and journeys

| ID | User | Need | Benefit | Flow or edge |
| --- | --- | --- | --- | --- |
| US-01 | Maintainer running `init` | See the project's snapshot skill suggested | No need to remember the name | Question shows the best match first, marked recommended |
| US-02 | Maintainer with several harnesses | Skills found in the folders of every selected harness | One config that works for all | A skill present in all selected harnesses ranks above one present in a few |
| US-03 | Maintainer with no matching skill | Still configure the snapshot | The wizard does not block | Only "type another" and "none" are offered |
| US-04 | Maintainer choosing the resume skill | A resume skill that is not the snapshot skill | No loop where resume repeats the snapshot | The snapshot skill is excluded; the question appears only with a snapshot skill |

## Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FR-01 | Each harness adapter exposes a read-only catalog of the project's skills: name, description, and the folder it came from, taken from the skill folders in the table of slice 19. | An integration test per adapter reads a fixture project and returns the expected names; a project without the folders returns an empty list |
| FR-02 | The catalog reads only the frontmatter of `SKILL.md`, accepts only names that pass the slice 19 rule, ignores unparseable files, resolves symbolic links, and bounds the work (file size and number of skills). | Fixtures with a malformed frontmatter, a name with `/` or spaces, a symlinked folder, and 1000 skills: the first two are ignored with no failure, the symlink resolves, the scan stays inside the bounds |
| FR-03 | Snapshot scoring: a name containing `snapshot`, `handoff`, or `checkpoint` weighs most; the same terms in the description add less; the skill body is never read. Ties break by name. | A fixture set returns the expected order; `sdd-snapshot` beats `commit` and `sdd-triage` even when their descriptions cite a checkpoint |
| FR-04 | Resume scoring: a name containing `resume`, `continue`, `retomar`, `retomada`, `continuar`, `orchestrate`, or `flow` weighs most; the description adds less. The skill chosen for the snapshot is excluded. The resume question is asked only when a snapshot skill is set. | `sdd-orchestrate-flow` ranks first in the fixture; with the snapshot skill equal to a resume candidate, that candidate is absent |
| FR-05 | The snapshot question offers the best match first (marked recommended), up to 3 alternatives, "type another", and "none"; the resume question offers the same without "none" being the default. A configured value is preselected. | A scripted session sees the options in that order; Enter keeps the configured value |
| FR-06 | With several selected harnesses, the candidates are the union of their catalogs, deduplicated by name; a skill in every selected harness ranks above one in only some, and each option says where it exists. | A fixture with `a` in two harnesses and `b` in one: `a` first, `b` annotated with its harness |
| FR-07 | Nothing is scanned when flags give the skills or the terminal is not interactive; the flags and the equivalent printed command behave as in slice 19. | `--yes` and `--snapshot-command x` runs read no skill folder (a spy on the catalog port) |
| FR-08 | A catalog failure (permission, unreadable folder) never stops the wizard; it falls back to the typed question. | A catalog that throws still leaves a working prompt, and a warning goes to stderr |

## Non-functional requirements

| ID | Attribute | Limit or criterion |
| --- | --- | --- |
| NFR-01 | Security | Only the validated name is stored or shown as a command; the description is shown as a hint and never executed or put into the config |
| NFR-02 | Performance | A scan of 200 skills in a temporary directory finishes within 500 ms (benchmark in `tests/bench/`, never in `npm test`) |
| NFR-03 | Architecture | The scoring is a pure `core` service over a catalog port; folder and format knowledge stays in each adapter |
| NFR-04 | Platform | Works on Linux, macOS, and Windows, with symlinks and junctions |
| NFR-05 | Accessibility | The recommended option and the origin of each option are words in the text, not only color |

## User experience

- The first option reads like `sdd-snapshot  (recommended) — found in .claude/skills`.
- "Type another" opens the text prompt of slice 19 with its validation and per-harness preview.
- No suggestion is shown as certain: the user always confirms.

## Constraints and dependencies

- Depends on slice 19: the name rule, the invocation formatter, and the research table of skill folders.
- The wizard changes only the questions in `src/cli/assistant/`; the `--json` output and the flags are unchanged.
- Hexagonal rules: the catalog port lives in `src/core/contracts/`, each implementation in its harness folder.

## Out of scope

- Skills in the user scope (`~/.claude/skills` and similar).
- Reading the body of a skill, running a skill, or installing one.
- Choosing a skill without the user's confirmation.
- Antigravity CLI user-scope folders, whose docs disagree (slice 19, A-04).

## Assumptions and sources

- Assumption: the folders listed in the slice 19 table are the project locations of each harness (verified 2026-10-13); this slice re-checks them before implementing each adapter.
- Assumption: `name` in the frontmatter, or the folder name when absent, is the skill name.
- Assumption: three alternatives are enough (user answered "show a list", the count came from the proposal).

## PRD acceptance gate

- [x] Every requirement has an ID and an observable criterion.
- [x] Metrics, boundaries, and out-of-scope items are explicit.
- [x] Internal rules came from the user (H-01) or an identified project source.
- [x] Implementation details remain in the TechSpec.
