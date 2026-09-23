import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import type { FileSnapshot } from '../../src/core/contracts/changes.js';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import { checkProtocolFile } from '../../src/core/services/doctor-checks.js';
import { renderProtocol } from '../../src/core/services/protocol-service.js';

function snapshotOf(content: string | null, exists = true): FileSnapshot {
  return {
    path: 'docs/context-brake-protocol.md',
    realPath: '/test/docs/context-brake-protocol.md',
    exists,
    content,
    sha256: 'hash',
    isSymlink: false,
    fileIdentity: 'id',
  };
}

function makeConfig(instructCheckpointCommit: boolean, planFile = 'task_plan.json', checkpointFile = 'state_checkpoint.json'): ContextBrakeConfig {
  return {
    ...DEFAULT_CONFIG,
    stateStorage: { ...DEFAULT_CONFIG.stateStorage, instructCheckpointCommit, planFile, checkpointFile },
  };
}

describe('protocol boot routine for harnesses without injection (RF13, CA-13, TC-13)', () => {
  it('includes all six numbered steps of the boot routine in sequence', () => {
    const text = renderProtocol(DEFAULT_CONFIG);
    expect(text).toContain('## Starting a new session\n\nAfter `/clear` or `/new`:');
    expect(text).toContain('1. If the session starts with a ContextBrake boot summary');
    expect(text).toContain('2. Read `task_plan.json` and find the `IN_PROGRESS` step');
    expect(text).toContain('3. Read `state_checkpoint.json` and apply every discovered constraint.');
    expect(text).toContain('4. Check that the recorded commit exists in the current branch history');
    expect(text).toContain('5. Run the validation command of the active step, or of the last completed step');
    expect(text).toContain('6. Continue the active step.');
  });

  it('customizes file names in the boot routine', () => {
    const text = renderProtocol(makeConfig(true, 'my_plan.json', 'my_checkpoint.json'));
    expect(text).toContain('2. Read `my_plan.json` and find the `IN_PROGRESS` step');
    expect(text).toContain('3. Read `my_checkpoint.json` and apply every discovered constraint.');
  });
});

describe('doctor protocol check with commit switch on and off (RF18, TC-14)', () => {
  it('reports no findings when protocol matches config for either switch setting', () => {
    const configOn = makeConfig(true);
    expect(checkProtocolFile(snapshotOf(renderProtocol(configOn)), configOn)).toEqual([]);
    const configOff = makeConfig(false);
    expect(checkProtocolFile(snapshotOf(renderProtocol(configOff)), configOff)).toEqual([]);
  });

  it('reports mismatch when protocol file content differs from configuration', () => {
    const configOff = makeConfig(false);
    const contentWithCommit = renderProtocol(makeConfig(true));
    const findings = checkProtocolFile(snapshotOf(contentWithCommit), configOff);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.code).toBe('PROTOCOL_FILE_MISMATCH');
    expect(findings[0]?.severity).toBe('warning');
  });

  it('reports missing finding when protocol file is absent', () => {
    const findings = checkProtocolFile(snapshotOf(null, false), DEFAULT_CONFIG);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.code).toBe('PROTOCOL_FILE_MISSING');
  });
});

describe('packaged protocol matches default configuration (RF13, RF17)', () => {
  it('is byte-identical to renderProtocol under default configuration', async () => {
    const onDisk = await readFile('docs/context-brake-protocol.md', 'utf8');
    expect(onDisk).toBe(renderProtocol(DEFAULT_CONFIG));
  });
});
