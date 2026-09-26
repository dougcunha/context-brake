import { describe, expect, it } from 'vitest';
import type { FileSnapshot } from '../../src/core/contracts/changes.js';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { planInstructionChanges } from '../../src/core/services/instruction-service.js';
import { removeReferenceFromBody } from '../../src/core/services/removal-helper.js';

function inserted(content: string): string {
  const snapshot: FileSnapshot = { path: 'CLAUDE.md', realPath: '/repo/CLAUDE.md', exists: true, content, sha256: 'x', isSymlink: false, fileIdentity: '/repo/CLAUDE.md' };
  const change = planInstructionChanges({ snapshots: [snapshot], config: DEFAULT_CONFIG }).changes[0];
  if (change?.content == null) throw new Error('expected an instruction change');
  return change.content;
}

describe('reference block removal restores the original bytes (codereview_01 CR-01, FR-09)', () => {
  it.each([
    ['an empty file', ''],
    ['a file without a trailing newline', '# Project\nrules'],
    ['a file with a trailing newline', '# Project\nrules\n'],
    ['a file ending with a blank line', '# Project\n\n'],
    ['a CRLF file without a trailing newline', '# Project\r\nrules'],
    ['a CRLF file with a trailing newline', '# Project\r\nrules\r\n'],
  ])('round-trips %s', (_, original) => {
    expect(removeReferenceFromBody(inserted(original))).toBe(original);
  });
});
