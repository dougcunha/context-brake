import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { RESTART_REASON_CODES } from '../../src/core/contracts/auto-restart.js';
import { renderRestartNotice, seedText } from '../../src/core/services/auto-restart-notices.js';

const CORE_RESTART_FILES = [
  'src/core/contracts/auto-restart.ts',
  'src/core/contracts/restart-log.ts',
  'src/core/contracts/restart-host.ts',
  'src/core/services/auto-restart-policy.ts',
  'src/core/services/auto-restart-notices.ts',
  'src/core/services/restart-flow.ts',
  'src/core/services/restart-guards.ts',
];
const HARNESS_NAMES = /claude|codex|cursor|copilot|antigravity|opencode|oh-my-pi|\bpi\b|\/clear\b|DISABLE_AUTO_COMPACT/i;

describe('harness-neutral restart core (prd-14 FR-05, TC-06)', () => {
  it.each(CORE_RESTART_FILES)('names no harness in %s', async (path) => {
    expect(await readFile(path, 'utf8')).not.toMatch(HARNESS_NAMES);
  });
  it('names no harness in the notices or the seed', () => {
    const texts = [seedText(), ...RESTART_REASON_CODES.map((code) => renderRestartNotice(code) ?? '')];
    expect(texts.join('\n')).not.toMatch(HARNESS_NAMES);
  });
});
