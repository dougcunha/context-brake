import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { checkpointModeReport, delegatedSnapshotFindings } from '../../src/core/services/delegated-diagnostics.js';
import { applyDelegatedSnapshot, mergeDelegatedSnapshot, type DelegatedSnapshotFlags } from '../../src/core/services/delegated-snapshot-merge.js';
import { renderProtocol } from '../../src/core/services/protocol-service.js';
import { delegatedConfig, SNAPSHOT_SECTION } from '../helpers/delegated-fixtures.js';

const NO_FLAGS: DelegatedSnapshotFlags = { allowedPaths: [], allowedSkills: [], remove: false };

describe('delegated snapshot merge (FR-09, FR-10, DEC-08)', () => {
  it('keeps the section when no flag is given', () => {
    expect(mergeDelegatedSnapshot(SNAPSHOT_SECTION, NO_FLAGS)).toEqual({ update: { kind: 'keep' } });
  });
  it('replaces only the given fields', () => {
    const merge = mergeDelegatedSnapshot(SNAPSHOT_SECTION, { ...NO_FLAGS, allowedSkills: ['save'] });
    expect(merge).toEqual({ update: { kind: 'set', section: { ...SNAPSHOT_SECTION, allowedSkills: ['save'] } } });
  });
  it('removes the key and keeps every other field in order', () => {
    const config = applyDelegatedSnapshot(delegatedConfig(), { kind: 'remove' });
    expect(JSON.stringify(config)).toBe(JSON.stringify(DEFAULT_CONFIG));
  });
  it('returns the same object when keeping', () => {
    expect(applyDelegatedSnapshot(DEFAULT_CONFIG, { kind: 'keep' })).toBe(DEFAULT_CONFIG);
  });
});

describe('delegated protocol section (FR-09, NFR-01)', () => {
  it('adds the section only when configured', () => {
    expect(renderProtocol(DEFAULT_CONFIG)).not.toContain('## Delegated snapshot');
    const text = renderProtocol(delegatedConfig({ triggerZone: 'YELLOW', allowedSkills: ['save'] }));
    expect(text.startsWith(renderProtocol(DEFAULT_CONFIG))).toBe(true);
    expect(text).toContain('- From `YELLOW` on, the telemetry action is `run "/sdd-snapshot", then end reply with [REQUEST_SESSION_RESET]`.');
    expect(text).toContain('Only reading or writing `tasks/**/context-snapshot.md`, the `save` skill, the `sdd-snapshot` skill, `git status`, `git add`, `git commit` are allowed.');
    expect(text).not.toContain('After `/clear` or `/new`, run');
  });
});

describe('delegated diagnostics (FR-11, FR-13, DEC-09)', () => {
  it('derives the mode and reason', () => {
    expect(checkpointModeReport(null, false)).toEqual({ effective: 'plan', reason: 'no_section', delegatedSnapshot: null });
    expect(checkpointModeReport(delegatedConfig(), true)).toMatchObject({ effective: 'plan', reason: 'plan_present' });
    expect(checkpointModeReport(delegatedConfig(), false)).toMatchObject({ effective: 'delegated', reason: 'plan_missing' });
  });
  it('reports missing paths and harnesses that hide skill calls', () => {
    const findings = delegatedSnapshotFindings(delegatedConfig({ allowedPaths: [] }), ['claude-code', 'opencode']);
    expect(findings.map((finding) => [finding.code, finding.severity, finding.harness])).toEqual([['DELEGATED_SNAPSHOT_NO_PATHS', 'warning', null], ['DELEGATED_SKILL_UNRECOGNIZED', 'ok', 'opencode']]);
    expect(delegatedSnapshotFindings(DEFAULT_CONFIG, ['opencode'])).toEqual([]);
  });
});
