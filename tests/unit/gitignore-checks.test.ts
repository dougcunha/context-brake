import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { FileSnapshot } from '../../src/core/contracts/changes.js';
import { GITIGNORE_START_MARKER, renderIgnoreBlock } from '../../src/core/services/gitignore-markers.js';
import { checkGitignore } from '../../src/core/services/gitignore-checks.js';

function snap(content: string | null, exists = true): FileSnapshot {
  return { path: '.gitignore', realPath: '/repo/.gitignore', exists, content, sha256: exists ? 'h' : null, isSymlink: false, fileIdentity: '/repo/.gitignore' };
}

const current = `${renderIgnoreBlock('task_plan.json', 'state_checkpoint.json')}\n`;

describe('doctor gitignore check (UT-25, RF21, RF24)', () => {
  it('returns no finding for a valid current block', () => {
    expect(checkGitignore(snap(current), DEFAULT_CONFIG)).toHaveLength(0);
  });
  it('warns STATE_FILES_NOT_IGNORED when the file is missing', () => {
    const findings = checkGitignore(snap(null, false), DEFAULT_CONFIG);
    expect(findings[0]).toMatchObject({ code: 'STATE_FILES_NOT_IGNORED', severity: 'warning', scope: 'file', harness: null, path: '.gitignore' });
    expect(findings[0]?.impact).toBe('Plan and checkpoint files can be committed accidentally.');
    expect(findings[0]?.remediation).toBe('Run context-brake init --yes to add the ContextBrake block to .gitignore.');
  });
  it('warns STATE_FILES_NOT_IGNORED when the block is missing or outdated', () => {
    expect(checkGitignore(snap('# user\n'), DEFAULT_CONFIG)[0]?.code).toBe('STATE_FILES_NOT_IGNORED');
    expect(checkGitignore(snap(`${renderIgnoreBlock('old.json', 'old2.json')}\n`), DEFAULT_CONFIG)[0]?.code).toBe('STATE_FILES_NOT_IGNORED');
  });
  it('errors MALFORMED_GITIGNORE_MARKERS for malformed markers', () => {
    const unbalanced = checkGitignore(snap(`${GITIGNORE_START_MARKER}\n/foo\n`), DEFAULT_CONFIG);
    expect(unbalanced[0]).toMatchObject({ code: 'MALFORMED_GITIGNORE_MARKERS', severity: 'error', scope: 'file', path: '.gitignore' });
    expect(unbalanced[0]?.message).toBe('The ContextBrake markers in .gitignore are malformed: Mismatched ContextBrake ignore markers.');
    expect(checkGitignore(snap(`${current}${current}`), DEFAULT_CONFIG)[0]?.code).toBe('MALFORMED_GITIGNORE_MARKERS');
  });
});
