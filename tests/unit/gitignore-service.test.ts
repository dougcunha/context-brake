import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { FileSnapshot } from '../../src/core/contracts/changes.js';
import { escapeGitignorePath, GITIGNORE_END_MARKER, GITIGNORE_START_MARKER, renderIgnoreBlock } from '../../src/core/services/gitignore-markers.js';
import { planGitignoreInstall, planGitignoreRemoval } from '../../src/core/services/gitignore-service.js';

function snap(content: string | null, exists = true): FileSnapshot {
  return { path: '.gitignore', realPath: '/repo/.gitignore', exists, content, sha256: exists ? 'h' : null, isSymlink: false, fileIdentity: '/repo/.gitignore' };
}

function block(eol = '\n'): string {
  return renderIgnoreBlock('task_plan.json', 'state_checkpoint.json', eol);
}

function install(content: string, config: ContextBrakeConfig = DEFAULT_CONFIG): string {
  return planGitignoreInstall({ snapshot: snap(content), config }).changes[0]?.content ?? content;
}

describe('ignore block rendering (UT-21, CA-21)', () => {
  it('renders configured paths in order, root-anchored', () => {
    expect(block()).toBe(`${GITIGNORE_START_MARKER}\n/task_plan.json\n/state_checkpoint.json\n${GITIGNORE_END_MARKER}`);
  });
  it('escapes metacharacters and a trailing space', () => {
    expect(escapeGitignorePath('a*b?c[d!e#f ')).toBe('a\\*b\\?c\\[d\\!e\\#f\\ ');
    expect(renderIgnoreBlock('plan #1?.json', 'state ')).toBe([GITIGNORE_START_MARKER, '/plan \\#1\\?.json', '/state\\ ', GITIGNORE_END_MARKER].join('\n'));
  });
  it('renders custom configuration paths', () => {
    const custom: ContextBrakeConfig = { ...DEFAULT_CONFIG, stateStorage: { ...DEFAULT_CONFIG.stateStorage, planFile: 'a.json', checkpointFile: 'b.json' } };
    const content = planGitignoreInstall({ snapshot: snap(null, false), config: custom }).changes[0]?.content;
    expect(content).toBe(`${renderIgnoreBlock('a.json', 'b.json')}\n`);
  });
});

describe('ignore block planning (UT-22, CA-21)', () => {
  it('creates only the block with LF for a missing file', () => {
    const result = planGitignoreInstall({ snapshot: snap(null, false), config: DEFAULT_CONFIG });
    expect(result.conflicts).toHaveLength(0);
    expect(result.changes[0]).toMatchObject({ kind: 'create', owner: 'ignore_block' });
    expect(result.changes[0]?.content).toBe(`${block()}\n`);
  });
  it('appends preserving EOL style and final-newline state', () => {
    expect(install('# user\n*.log\n')).toBe(`# user\n*.log\n\n${block()}\n`);
    expect(install('# user\r\n*.log\r\n')).toBe(`# user\r\n*.log\r\n\r\n${block('\r\n')}\r\n`);
    expect(install('# user')).toBe(`# user\n${block()}`);
  });
  it('treats a current block as a no-op and updates an outdated block in place', () => {
    expect(planGitignoreInstall({ snapshot: snap(`${block()}\n`), config: DEFAULT_CONFIG }).changes).toHaveLength(0);
    expect(install(`# user\n${renderIgnoreBlock('old.json', 'old2.json')}\n`)).toBe(`# user\n${block()}\n`);
  });
  it('is byte-identical after one, two, and three applications', () => {
    const once = install('# user\n*.log\n');
    const twice = install(once);
    const thrice = install(twice);
    expect(twice).toBe(once);
    expect(thrice).toBe(once);
    expect(once).toContain('# user\n*.log\n');
  });
});

describe('malformed ignore markers (UT-23, CA-06, CA-21)', () => {
  it('reports duplicates without planning a write', () => {
    const content = `${block()}\n${block()}\n`;
    const result = planGitignoreInstall({ snapshot: snap(content), config: DEFAULT_CONFIG });
    expect(result.changes).toHaveLength(0);
    expect(result.conflicts[0]).toMatchObject({ path: '.gitignore', code: 'DUPLICATE_GITIGNORE_MARKERS', detail: 'Multiple ContextBrake ignore blocks' });
    expect(snap(content).content).toBe(content);
  });
  it('reports unbalanced and out-of-order markers', () => {
    expect(planGitignoreInstall({ snapshot: snap(`${GITIGNORE_START_MARKER}\n/foo\n`), config: DEFAULT_CONFIG }).conflicts[0]).toMatchObject({ code: 'MALFORMED_GITIGNORE_MARKERS' });
    expect(planGitignoreInstall({ snapshot: snap(`${GITIGNORE_END_MARKER}\n/foo\n${GITIGNORE_START_MARKER}\n`), config: DEFAULT_CONFIG }).conflicts[0]).toMatchObject({ code: 'MALFORMED_GITIGNORE_MARKERS', detail: 'Start marker after end marker' });
  });
});

describe('ignore block removal (UT-24, CA-12)', () => {
  it('is inert by default and removes the block with explicit state', () => {
    const content = `# user\n*.log\n\n${block()}\n`;
    expect(planGitignoreRemoval({ snapshot: snap(content), removeState: false }).changes).toHaveLength(0);
    expect(planGitignoreRemoval({ snapshot: snap(content), removeState: true }).changes[0]?.content).toBe('# user\n*.log\n');
  });
  it('deletes the file when only the block remains', () => {
    const change = planGitignoreRemoval({ snapshot: snap(`${block()}\n`), removeState: true }).changes[0];
    expect(change).toMatchObject({ kind: 'delete', owner: 'ignore_block', content: null });
  });
  it('never modifies user bytes across remove and restore', () => {
    for (const original of ['# user\n*.log\n', '# user', '# user\r\n*.log\r\n']) {
      const installed = install(original);
      const stripped = planGitignoreRemoval({ snapshot: snap(installed), removeState: true }).changes[0]?.content;
      expect(stripped).toBe(original);
      expect(install(stripped ?? '')).toBe(installed);
    }
  });
});
