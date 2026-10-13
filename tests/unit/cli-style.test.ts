import { describe, expect, it } from 'vitest';
import { detectStyle, type StyleEnvironment } from '../../src/cli/output/style.js';

const ESCAPE = String.fromCharCode(27);
const LINUX_TTY: StyleEnvironment = { env: {}, platform: 'linux', isTty: true };

function paints(environment: StyleEnvironment): boolean {
  return detectStyle(environment).paint('good', 'ok').includes(ESCAPE);
}

describe('terminal style detection (cli-output rules, NFR-01)', () => {
  it('colors a TTY', () => {
    expect(paints(LINUX_TTY)).toBe(true);
  });
  it.each([
    ['output is not a TTY', { ...LINUX_TTY, isTty: false }],
    ['NO_COLOR is set', { ...LINUX_TTY, env: { NO_COLOR: '1' } }],
    ['TERM is dumb', { ...LINUX_TTY, env: { TERM: 'dumb' } }],
  ])('does not color when %s', (_reason, environment) => {
    expect(paints(environment)).toBe(false);
  });
  it('ignores an empty NO_COLOR and FORCE_COLOR', () => {
    expect(paints({ ...LINUX_TTY, env: { NO_COLOR: '' } })).toBe(true);
    expect(paints({ ...LINUX_TTY, isTty: false, env: { FORCE_COLOR: '1' } })).toBe(false);
  });
  it.each([
    ['a Linux terminal', LINUX_TTY, '┌─'],
    ['the Linux console', { ...LINUX_TTY, env: { TERM: 'linux' } }, '+-'],
    ['Windows Terminal', { ...LINUX_TTY, platform: 'win32' as const, env: { WT_SESSION: 'x' } }, '┌─'],
    ['herdr on Windows', { ...LINUX_TTY, platform: 'win32' as const, env: { TERM_PROGRAM: 'herdr', TERM: 'xterm-256color', COLORTERM: 'truecolor' } }, '┌─'],
    ['a bare Windows console', { ...LINUX_TTY, platform: 'win32' as const }, '+-'],
  ])('picks the card corner for %s', (_terminal, environment, corner) => {
    expect(detectStyle(environment).glyphs.top).toBe(corner);
  });
});
