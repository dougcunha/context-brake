import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { FileSnapshot } from '../../src/core/contracts/changes.js';
import { detectLegacyFindings, legacyFinding } from '../../src/core/services/legacy-preview.js';

const base: FileSnapshot = { path: 'AGENTS.md', realPath: '/repo/AGENTS.md', exists: true, content: '', sha256: '1', isSymlink: false, fileIdentity: 'id' };
const legacy: FileSnapshot = { ...base, content: '<!-- CONTEXTOPS:START -->\nKeep me.\n## [PROTOCOL]\n<!-- CONTEXTOPS:END -->\n' };

describe('legacy preview findings (CR-02, RF14, CA-10)', () => {
  it('emits a warning naming the block, the proposed change, and the flag', () => {
    const findings = detectLegacyFindings([legacy], DEFAULT_CONFIG);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.code).toBe('LEGACY_BLOCK_DETECTED');
    expect(findings[0]?.severity).toBe('warning');
    expect(findings[0]?.path).toBe('AGENTS.md');
    expect(findings[0]?.impact).toContain('CONTEXTBRAKE:START');
    expect(findings[0]?.remediation).toContain('--migrate-legacy');
  });

  it('emits nothing when the instruction file has no legacy block', () => {
    expect(detectLegacyFindings([{ ...base, content: '# Title\n' }], DEFAULT_CONFIG)).toHaveLength(0);
  });

  it('renders the configured protocol path in the proposed change', () => {
    expect(legacyFinding('AGENTS.md', DEFAULT_CONFIG).impact).toContain(DEFAULT_CONFIG.instructionFiles.protocolFile);
  });

  it('surfaces malformed legacy markers instead of dropping them', () => {
    const broken: FileSnapshot = { ...base, content: '<!-- CONTEXTOPS:START -->\nNo end\n' };
    expect(detectLegacyFindings([broken], DEFAULT_CONFIG).some((f) => f.code === 'MALFORMED_LEGACY_MARKERS')).toBe(true);
  });
});
