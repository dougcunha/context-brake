import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { FileSnapshot } from '../../src/core/contracts/changes.js';
import { renderReferenceBlock, CURRENT_START_MARKER, CURRENT_END_MARKER } from '../../src/core/services/instruction-markers.js';
import { planInstructionChanges } from '../../src/core/services/instruction-service.js';

describe('instruction reference block budgeting (RF11, CA-08)', () => {
  it('canonical reference block has three lines and points to protocol (UT-07, CA-08)', () => {
    const block = renderReferenceBlock('task_plan.json', 'docs/context-brake-protocol.md');
    const lines = block.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(CURRENT_START_MARKER);
    expect(lines[1]).toContain('task_plan.json');
    expect(lines[1]).toContain('docs/context-brake-protocol.md');
    expect(lines[2]).toBe(CURRENT_END_MARKER);
  });
});

describe('instruction target deduplication and missing files (RF12, RF13, CA-07, CA-09)', () => {
  it('deduplicates instruction targets sharing physical file identity (UT-06, CA-07)', () => {
    const snap1: FileSnapshot = { path: 'CLAUDE.md', realPath: '/repo/CLAUDE.md', exists: true, content: '# Claude\n', sha256: 'abc', isSymlink: false, fileIdentity: 'dev1:ino1' };
    const snap2: FileSnapshot = { path: 'AGENTS.md', realPath: '/repo/CLAUDE.md', exists: true, content: '# Claude\n', sha256: 'abc', isSymlink: true, fileIdentity: 'dev1:ino1' };
    const result = planInstructionChanges({ snapshots: [snap1, snap2], config: DEFAULT_CONFIG });
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]?.path).toBe('CLAUDE.md');
  });

  it('leaves missing instruction targets absent unless explicitly enabled (UT-08, CA-09)', () => {
    const missingSnap: FileSnapshot = { path: 'CLAUDE.md', realPath: '/repo/CLAUDE.md', exists: false, content: null, sha256: null, isSymlink: false, fileIdentity: '/repo/CLAUDE.md' };
    const defaultResult = planInstructionChanges({ snapshots: [missingSnap], config: DEFAULT_CONFIG, createInstructions: false });
    expect(defaultResult.changes).toHaveLength(0);
    const enabledResult = planInstructionChanges({ snapshots: [missingSnap], config: DEFAULT_CONFIG, createInstructions: true });
    expect(enabledResult.changes).toHaveLength(1);
    expect(enabledResult.changes[0]?.kind).toBe('create');
  });

  it('handles malformed and duplicate markers as isolated conflicts', () => {
    const brokenSnap: FileSnapshot = { path: 'CLAUDE.md', realPath: '/repo/CLAUDE.md', exists: true, content: '<!-- CONTEXTBRAKE:START -->\nNo end', sha256: '1', isSymlink: false, fileIdentity: 'id1' };
    const result = planInstructionChanges({ snapshots: [brokenSnap], config: DEFAULT_CONFIG });
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.code).toBe('MALFORMED_INSTRUCTION_MARKERS');
  });

  it('recognizes already matching reference block without planning change', () => {
    const block = renderReferenceBlock('task_plan.json', 'docs/context-brake-protocol.md', '\n');
    const matchingSnap: FileSnapshot = { path: 'CLAUDE.md', realPath: '/repo/CLAUDE.md', exists: true, content: `# Header\n${block}\n# Footer`, sha256: '2', isSymlink: false, fileIdentity: 'id2' };
    const result = planInstructionChanges({ snapshots: [matchingSnap], config: DEFAULT_CONFIG });
    expect(result.changes).toHaveLength(0);
    expect(result.conflicts).toHaveLength(0);
  });
});

describe('legacy instruction migration policy (RF14, CA-10)', () => {
  const legacyContent = '# Header\n<!-- CONTEXTOPS:START -->\nUser notes to keep.\n## [PROTOCOL] Gestão Autônoma\n- Regras Obrigatórias\n<!-- CONTEXTOPS:END -->\n# Footer\n';
  const legacySnap: FileSnapshot = { path: 'AGENTS.md', realPath: '/repo/AGENTS.md', exists: true, content: legacyContent, sha256: '123', isSymlink: false, fileIdentity: 'dev1:ino2' };

  it('preserves file unchanged without explicit migration decision (UT-09, CA-10)', () => {
    const result = planInstructionChanges({ snapshots: [legacySnap], config: DEFAULT_CONFIG, migrateLegacy: false });
    expect(result.changes).toHaveLength(0);
    expect(result.legacyDetected).toContain('AGENTS.md');
  });

  it('migrates legacy block while preserving non-protocol user text (UT-09, CA-10)', () => {
    const result = planInstructionChanges({ snapshots: [legacySnap], config: DEFAULT_CONFIG, migrateLegacy: true });
    expect(result.changes).toHaveLength(1);
    const newContent = result.changes[0]?.content ?? '';
    expect(newContent).toContain('User notes to keep.');
    expect(newContent).toContain(CURRENT_START_MARKER);
    expect(newContent).not.toContain('Gestão Autônoma');
  });
});
