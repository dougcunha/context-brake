import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { FileSnapshot } from '../../src/core/contracts/changes.js';
import { checkConfig, checkInstructionFiles, checkProtocolFile, checkStateFiles } from '../../src/core/services/doctor-checks.js';
import { CURRENT_START_MARKER } from '../../src/core/services/instruction-markers.js';

function makeSnap(path: string, content: string | null, exists = true): FileSnapshot {
  return { path, realPath: `/repo/${path}`, exists, content, sha256: 'h', isSymlink: false, fileIdentity: path };
}

describe('Doctor pure diagnostic checks', () => {
  it('checks configuration states', () => {
    const errRes = checkConfig(null, new Error('invalid syntax'));
    expect(errRes.findings[0]?.code).toBe('INVALID_CONTEXTBRAKE_CONFIG');
    const missRes = checkConfig(null);
    expect(missRes.findings[0]?.code).toBe('CONFIG_MISSING');
    const validRes = checkConfig(DEFAULT_CONFIG);
    expect(validRes.findings).toHaveLength(0);
  });

  it('checks instruction file markers', () => {
    const snaps = [makeSnap('CLAUDE.md', 'no marker'), makeSnap('MISSING.md', null, false), makeSnap('AGENTS.md', `${CURRENT_START_MARKER} hello`)];
    const findings = checkInstructionFiles(snaps);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.code).toBe('INSTRUCTION_REFERENCE_MISSING');
  });

  it('checks protocol file mismatch and missing states', () => {
    const missing = makeSnap('docs/protocol.md', null, false);
    expect(checkProtocolFile(missing, DEFAULT_CONFIG)[0]?.code).toBe('PROTOCOL_FILE_MISSING');
    const mismatch = makeSnap('docs/protocol.md', 'wrong content');
    expect(checkProtocolFile(mismatch, DEFAULT_CONFIG)[0]?.code).toBe('PROTOCOL_FILE_MISMATCH');
  });

  it('checks state files validity', () => {
    const valid = makeSnap('task_plan.json', '{"tasks":[]}');
    const invalid = makeSnap('state_checkpoint.json', '{bad json');
    expect(checkStateFiles(valid, undefined)).toHaveLength(0);
    const findings = checkStateFiles(valid, invalid);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.code).toBe('INVALID_STATE_FILE');
  });
});
