import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderCliErrorText } from '../../src/cli/output/text.js';
import type { CliErrorDocument } from '../../src/core/contracts/diagnostics.js';

afterEach(() => { vi.restoreAllMocks(); });

describe('CLI error text', () => {
  it('prints the error code and message on stderr', () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const document: CliErrorDocument = { schemaVersion: 1, command: 'init', status: 'error', exitCode: 64, error: { code: 'INVALID_ARGUMENTS', message: 'bad flag' } };
    renderCliErrorText(document);
    expect(stderr.mock.calls.map((call) => String(call[0])).join('')).toBe('[ERROR] INVALID_ARGUMENTS: bad flag\n');
  });
});
