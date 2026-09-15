import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { FileSnapshot } from '../../src/core/contracts/changes.js';
import { planProtocolChange, renderProtocol } from '../../src/core/services/protocol-service.js';

describe('protocol service rendering and planning (RF10, CA-08)', () => {
  it('renders protocol document using normalized zone thresholds and files', () => {
    const text = renderProtocol(DEFAULT_CONFIG);
    expect(text).toContain('# ContextBrake Protocol');
    expect(text).toContain('`task_plan.json`');
    expect(text).toContain('`state_checkpoint.json`');
    expect(text).toContain('| `GREEN` | Usage below 50% and at most 7 turns |');
    expect(text).toContain('| `CRITICAL` | Usage at 75% or more, or 12 turns or more |');
  });

  it('plans creation when protocol file is absent', () => {
    const snap: FileSnapshot = { path: 'docs/context-brake-protocol.md', realPath: '/repo/docs/context-brake-protocol.md', exists: false, content: null, sha256: null, isSymlink: false, fileIdentity: 'proto' };
    const { change } = planProtocolChange(DEFAULT_CONFIG, snap, false);
    expect(change).toBeDefined();
    expect(change?.kind).toBe('create');
    expect(change?.owner).toBe('protocol');
  });

  it('flags unmanaged conflicting protocol as a conflict', () => {
    const snap: FileSnapshot = { path: 'docs/context-brake-protocol.md', realPath: '/repo/docs/context-brake-protocol.md', exists: true, content: '# Unrelated user document', sha256: 'xyz', isSymlink: false, fileIdentity: 'proto' };
    const { conflict } = planProtocolChange(DEFAULT_CONFIG, snap, false);
    expect(conflict).toBeDefined();
    expect(conflict?.code).toBe('UNMANAGED_PROTOCOL_CONFLICT');
  });
});

describe('protocol CRITICAL row wording (FR-11, DEC-06)', () => {
  it('lists git status, git add, and git commit as allowed at the CRITICAL ceiling', () => {
    const text = renderProtocol(DEFAULT_CONFIG);
    const criticalRow = text.split('\n').find((line) => line.startsWith('| `CRITICAL`'));
    expect(criticalRow).toBe('| `CRITICAL` | Usage at 75% or more, or 12 turns or more | Other tool calls are blocked. Only reading or writing the plan and checkpoint, running the validation command, `git status`, `git add`, and `git commit` are allowed. Complete the `RED` actions. |');
  });

  it('lists the same CRITICAL allowlist with a custom plan and checkpoint file configuration', () => {
    const customConfig: ContextBrakeConfig = { ...DEFAULT_CONFIG, stateStorage: { ...DEFAULT_CONFIG.stateStorage, planFile: 'custom_plan.json', checkpointFile: 'custom_checkpoint.json' } };
    const text = renderProtocol(customConfig);
    const criticalRow = text.split('\n').find((line) => line.startsWith('| `CRITICAL`'));
    expect(criticalRow).toContain('`git status`, `git add`, and `git commit` are allowed');
  });

  it('matches the packaged docs/context-brake-protocol.md byte-for-byte', async () => {
    const packaged = await readFile('docs/context-brake-protocol.md', 'utf8');
    expect(packaged).toBe(renderProtocol(DEFAULT_CONFIG));
  });
});
