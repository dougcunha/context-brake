import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { FileSnapshot } from '../../src/core/contracts/changes.js';
import { checkConfig, checkInstructionFiles, checkProtocolFile, checkStateFiles } from '../../src/core/services/doctor-checks.js';
import { CURRENT_START_MARKER } from '../../src/core/services/instruction-markers.js';

function makeSnap(path: string, content: string | null, exists = true): FileSnapshot {
  return { path, realPath: `/repo/${path}`, exists, content, sha256: 'h', isSymlink: false, fileIdentity: path };
}

describe('Doctor pure diagnostic checks: config and instructions', () => {
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
});

describe('Doctor pure diagnostic checks: protocol and state files', () => {
  it('checks protocol file mismatch and missing states', () => {
    const missing = makeSnap('docs/protocol.md', null, false);
    expect(checkProtocolFile(missing, DEFAULT_CONFIG)[0]?.code).toBe('PROTOCOL_FILE_MISSING');
    const mismatch = makeSnap('docs/protocol.md', 'wrong content');
    expect(checkProtocolFile(mismatch, DEFAULT_CONFIG)[0]?.code).toBe('PROTOCOL_FILE_MISMATCH');
  });

  it('checks state files validity with valid content', () => {
    const validPlan = JSON.stringify({ schemaVersion: 1, taskId: 't1', title: 'Task 1', currentStepId: 's1', steps: [{ id: 's1', title: 'Step 1', status: 'PENDING' }] });
    const validCp = JSON.stringify({ schemaVersion: 1, taskId: 't1', activeStepId: 's1', gitState: { branch: null, lastCommitHash: null, cleanWorkingTree: null }, workingMemory: {}, timestamp: '2026-09-21T12:00:00.000Z' });
    expect(checkStateFiles(makeSnap('task_plan.json', validPlan), makeSnap('state_checkpoint.json', validCp))).toHaveLength(0);
  });

  it('checks invalid json and schema violations in state files', () => {
    const invalidJson = makeSnap('state_checkpoint.json', '{bad json');
    const invalidSchema = makeSnap('task_plan.json', '{"schemaVersion":1}');
    expect(checkStateFiles(undefined, invalidJson)[0]?.message).toContain('invalid JSON');
    expect(checkStateFiles(invalidSchema, undefined)[0]?.message).toContain('taskId');
  });
});
