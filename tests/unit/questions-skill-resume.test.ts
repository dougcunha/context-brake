import { afterEach, describe, expect, it, vi } from 'vitest';
import { runScripted } from '../helpers/assistant-context.js';
import { BLANK_ANSWERS, fakeCatalog, skill, throwingCatalog } from '../helpers/skill-catalog-fake.js';

const PROJECT = fakeCatalog({
  'claude-code': [skill('sdd-snapshot', 'Writes the context; continue after a reset'), skill('sdd-orchestrate-flow'), skill('commit', 'Writes a commit')],
});

function answers(...first: readonly string[]): string[] {
  return [...first, ...BLANK_ANSWERS];
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('resume skill picker (prd-20 FR-04, US-04, TC-04, TC-05)', () => {
  it('excludes the snapshot skill, recommends the flow skill, and keeps commit out', async () => {
    const { asked, result } = await runScripted(answers('', '', '', ''), { config: null, catalog: PROJECT });
    const resume = asked[3] ?? '';
    expect(resume).toContain('1) sdd-orchestrate-flow (recommended)');
    expect(resume).not.toContain('sdd-snapshot');
    expect(resume).not.toContain('commit');
    expect(result?.facts.resumeCommand).toBe('sdd-orchestrate-flow');
    expect(result?.flags).toEqual(expect.arrayContaining(['--snapshot-command', 'sdd-snapshot', '--resume-command', 'sdd-orchestrate-flow']));
  });

  it('asks no resume question when no snapshot skill is set', async () => {
    const { asked } = await runScripted(answers('', '3'), { config: null, catalog: PROJECT });
    expect(asked.some((question) => question.includes('Resume skill'))).toBe(false);
  });
});

describe('skill picker fallbacks and safety (prd-20 FR-08, NFR-01, TC-08, TC-09)', () => {
  it('shows the typed question and writes one warning when the catalog throws', async () => {
    const write = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const { asked, result } = await runScripted(answers('', 'typed-skill'), { config: null, catalog: throwingCatalog('EPERM') });
    expect(asked[1]).toContain('Snapshot skill name (Enter keeps');
    expect(result?.facts.snapshotCommand).toBe('typed-skill');
    expect(write).toHaveBeenCalledWith(expect.stringContaining('WARN: Could not read the project skills (EPERM)'));
  });

  it('writes reader warnings and keeps the picker when skills were still found', async () => {
    const write = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const { asked } = await runScripted(answers('', ''), { config: null, catalog: fakeCatalog({ 'claude-code': [skill('sdd-snapshot')] }, ['.claude/skills/x: EACCES']) });
    expect(asked[1]).toContain('1) sdd-snapshot (recommended)');
    expect(write).toHaveBeenCalledWith(expect.stringContaining('.claude/skills/x: EACCES'));
  });

  it('never shows or stores a description', async () => {
    const hostile = fakeCatalog({ 'claude-code': [skill('sdd-snapshot', 'checkpoint; rm -rf / /evil')] });
    const { asked, result } = await runScripted(answers('', ''), { config: null, catalog: hostile });
    expect(asked.join('\n')).not.toContain('rm -rf');
    expect(JSON.stringify(result)).not.toContain('rm -rf');
  });
});
