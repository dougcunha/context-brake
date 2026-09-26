import { describe, expect, it } from 'vitest';
import { bridgeCommand, firstPreviousStatusline, statuslineOptions, toCommandRoot } from '../../src/infrastructure/harnesses/claude-code/statusline-settings.js';
import { parseStatuslineState, serializeStatuslineState, type StatuslineState } from '../../src/infrastructure/harnesses/claude-code/statusline-state.js';

const LOCAL = { type: 'command', command: 'local.sh', padding: 1 };
const PROJECT = { type: 'command', command: 'project.sh', refreshInterval: 5 };
const USER = { type: 'command', command: '~/.claude/statusline.sh', padding: 2, refreshInterval: 10 };
const BRIDGE = { type: 'command', command: 'node "/repo/.claude/hooks/context-brake-statusline.mjs" --pipe | ( project.sh )' };
const SCRIPT = '.claude/hooks/context-brake-statusline.mjs';

describe('previous status line resolution (FR-02, DEC-09, TC-10)', () => {
  it.each([
    { name: 'local over project and user', scopes: [LOCAL, PROJECT, USER], expected: { source: 'local', command: 'local.sh' } },
    { name: 'project when local is absent', scopes: [undefined, PROJECT, USER], expected: { source: 'project', command: 'project.sh' } },
    { name: 'user when only user has one', scopes: [undefined, undefined, USER], expected: { source: 'user', command: '~/.claude/statusline.sh' } },
    { name: 'project when local is the bridge itself', scopes: [BRIDGE, PROJECT, USER], expected: { source: 'project', command: 'project.sh' } },
    { name: 'user when local and project are not command objects', scopes: [{ type: 'static' }, { type: 'command', command: '  ' }, USER], expected: { source: 'user', command: '~/.claude/statusline.sh' } },
  ])('picks $name', ({ scopes: [local, project, user], expected }) => {
    const previous = firstPreviousStatusline([{ source: 'local', value: local }, { source: 'project', value: project }, { source: 'user', value: user }]);
    expect(previous).toMatchObject(expected);
  });

  it('returns none when no scope has a command status line', () => {
    expect(firstPreviousStatusline([{ source: 'local', value: undefined }, { source: 'project', value: 'text' }, { source: 'user', value: null }])).toBeNull();
  });

  it('copies padding and refreshInterval and ignores other keys and non-numbers', () => {
    expect(statuslineOptions(USER)).toEqual({ padding: 2, refreshInterval: 10 });
    expect(statuslineOptions({ ...PROJECT, padding: '2', extra: true })).toEqual({ refreshInterval: 5 });
    expect(statuslineOptions(undefined)).toEqual({});
  });

  it('wraps the previous command in a pipeline and omits --pipe without one', () => {
    expect(bridgeCommand('/repo', '~/.claude/statusline.sh')).toBe(`node "/repo/${SCRIPT}" --pipe | ( ~/.claude/statusline.sh\n)`);
    expect(bridgeCommand('/repo', null)).toBe(`node "/repo/${SCRIPT}"`);
  });

  it('closes the subshell on its own line so a trailing comment stays inside it (codereview_01/CR-05)', () => {
    expect(bridgeCommand('/repo', 'ccstatusline # note')).toBe(`node "/repo/${SCRIPT}" --pipe | ( ccstatusline # note\n)`);
  });
});

describe('bridge command roots (FR-01, NFR-06, DEC-02, TC-11)', () => {
  it.each(['/tmp/re"po', '/tmp/re$po', '/tmp/re`po', '/tmp/re\\po'])('refuses the root %s', (root) => {
    expect(bridgeCommand(root, 'prev.sh')).toBeNull();
  });

  it('quotes a root with spaces and accents', () => {
    expect(bridgeCommand('/home/dev/Meus Projetos/ação', null)).toBe(`node "/home/dev/Meus Projetos/ação/${SCRIPT}"`);
  });

  it('converts a Windows root to forward slashes before quoting', () => {
    const root = toCommandRoot('D:\\Meus Projetos\\ação', '\\');
    expect(root).toBe('D:/Meus Projetos/ação');
    expect(bridgeCommand(root, 'prev.sh')).toBe(`node "D:/Meus Projetos/ação/${SCRIPT}" --pipe | ( prev.sh\n)`);
  });

  it('keeps a POSIX root unchanged', () => {
    expect(toCommandRoot('/home/dev/repo', '/')).toBe('/home/dev/repo');
  });
});

describe('status line bridge state file (DEC-07, CMP-09)', () => {
  const state: StatuslineState = { v: 1, installedCommand: 'node "/repo/x" --pipe | ( prev.sh )', previousLocal: { type: 'command', command: 'prev.sh' }, previousSource: 'local', previousCommand: 'prev.sh', createdLocalFile: false };

  it('round-trips through serialization', () => {
    expect(parseStatuslineState(serializeStatuslineState(state))).toEqual(state);
  });

  it.each([
    ['invalid JSON', '{'],
    ['an unknown field', JSON.stringify({ ...state, extra: 1 })],
    ['another version', JSON.stringify({ ...state, v: 2 })],
  ])('treats %s as absent', (_case, content) => {
    expect(parseStatuslineState(content)).toBeNull();
  });
});
