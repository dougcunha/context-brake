import { describe, expect, it } from 'vitest';
import { SHARED_INSTRUCTION_EVIDENCE, type DetectionSources } from '../../src/core/contracts/harness.js';
import { DetectionSelectionError, detectHarnesses } from '../../src/core/services/detection-service.js';
import { normalizeVersion } from '../../src/core/services/version-service.js';

describe('harness detection policy: evidence rules (RF1, RF3)', () => {
  it('ignores shared instructions as harness evidence (UT-01, CA-03)', () => {
    const sources: Partial<DetectionSources> = {
      'codex-cli': { project: [{ origin: 'project', kind: SHARED_INSTRUCTION_EVIDENCE, value: 'AGENTS.md' }] },
    };
    expect(detectHarnesses(sources)).toEqual([]);
  });

  it('keeps machine-only evidence as a versioned candidate (UT-03, CA-03)', () => {
    const sources: Partial<DetectionSources> = {
      'codex-cli': {
        project: [],
        machine: [{ origin: 'machine', kind: 'executable', value: 'codex' }],
        version: normalizeVersion({ display: 'codex-cli 2.4.0' }),
      },
    };
    const detections = detectHarnesses(sources);
    expect(detections).toMatchObject([{ harness: 'codex-cli', state: 'candidate', selectedExplicitly: false, version: '2.4.0', versionSource: 'executable' }]);
    expect(detections.filter(({ state }) => state === 'project')).toEqual([]);
  });
});

describe('harness detection policy: selection and exclusion (RF2, RF4)', () => {
  it('applies explicit inclusion and exclusion after deduplication (UT-02, CA-04)', () => {
    const repeated = { origin: 'machine' as const, kind: 'executable', value: 'copilot' };
    const sources: Partial<DetectionSources> = {
      cursor: { project: [{ origin: 'project', kind: 'configuration', value: '.cursor/hooks.json' }] },
      'github-copilot-cli': { project: [], machine: [repeated, repeated] },
    };
    const detections = detectHarnesses(sources, { include: ['github-copilot-cli', 'github-copilot-cli'], exclude: ['cursor', 'cursor'] });
    expect(detections.map(({ harness, state, selectedExplicitly }) => ({ harness, state, selectedExplicitly }))).toEqual([
      { harness: 'cursor', state: 'excluded', selectedExplicitly: false },
      { harness: 'github-copilot-cli', state: 'project', selectedExplicitly: true },
    ]);
    expect(detections[1]?.evidence).toEqual([repeated]);
  });

  it('rejects a harness included and excluded together (UT-02, CA-04)', () => {
    expect(() => detectHarnesses({}, { include: ['cursor'], exclude: ['cursor'] })).toThrow(DetectionSelectionError);
    try {
      detectHarnesses({}, { include: ['cursor'], exclude: ['cursor'] });
    } catch (error) {
      expect((error as DetectionSelectionError).harness).toBe('cursor');
    }
  });
});
