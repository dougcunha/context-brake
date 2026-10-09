import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '../..');
const readme = readFileSync(join(root, 'README.md'), 'utf8');
const rule = readFileSync(join(root, '.agents/rules/file-changes.md'), 'utf8');
const agents = readFileSync(join(root, 'AGENTS.md'), 'utf8');

describe('docs describe the managed .gitignore block (prd-17 FR-10, TC-10)', () => {
  it('documents both flags, the opt-out, the findings, and removal in the README (FR-10, TC-10)', () => {
    expect(readme).toContain('`--gitignore`, `--no-gitignore` |');
    expect(readme).toContain('### Keeping ContextBrake Out of Git');
    expect(readme).toContain('`context-brake init --no-gitignore`');
    expect(readme).toContain('"gitIgnore": false');
    for (const code of ['GITIGNORE_MARKERS_MALFORMED', 'GITIGNORE_TRACKED_FILES', 'GITIGNORE_NO_GIT']) expect(readme).toContain(code);
  });
  it('lists the three runtime state files among the files the block names (FR-10, DEC-HIL-03, CR-01)', () => {
    expect(readme).toContain('and the state files `init` writes under `.context-brake/runtime/` (`claude-mod-install.json`, `claude-statusline.json`, and `claude-statusline-opt-out.json` when the status line bridge is off)');
  });
  it('no longer says ContextBrake never touches .gitignore (FR-10, TC-10)', () => {
    expect(readme).not.toContain('it does not touch `.gitignore`');
    expect(readme).not.toContain('it never edits instruction files or `.gitignore`');
    expect(rule).not.toContain('or the project `.gitignore`. These');
    expect(rule).toContain('its own marked block');
    expect(agents).toContain('marked block');
    expect(rule).toContain('and its own marked block in the project `.gitignore`.');
    expect(rule).toContain('its marked block in the project `.gitignore`, the assets in its manifest');
  });
});
