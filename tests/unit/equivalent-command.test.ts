import { describe, expect, it } from 'vitest';
import { formatEquivalentCommand } from '../../src/cli/assistant/equivalent-command.js';
import { parseInit } from '../../src/cli/init-arguments.js';
import { splitWords } from '../helpers/shell-words.js';

const BASE = ['--harness', 'claude-code', '--auto-restart', '--max-restarts', '3'];

describe('formatEquivalentCommand (prd-16 FR-06, TC-08)', () => {
  it('prints bare values unquoted on one line (FR-06, TC-08)', () => {
    expect(formatEquivalentCommand([...BASE, '--snapshot-command', '/sdd-snapshot'])).toEqual(['context-brake init --harness claude-code --auto-restart --max-restarts 3 --snapshot-command /sdd-snapshot']);
  });
  it.each([['my command with spaces'], ['$HOME'], ['a"b'], ['x;y'], ['']])('single-quotes %j so no shell expands it (FR-06, TC-08)', (value) => {
    const [line] = formatEquivalentCommand(['--snapshot-command', value]);
    expect(line).toBe(`context-brake init --snapshot-command '${value}'`);
  });
  it('round-trips quoted values through parseInit (FR-06, TC-08)', () => {
    const flags = [...BASE, '--snapshot-command', 'my command with spaces', '--resume-command', '$HOME/x'];
    const words = splitWords(formatEquivalentCommand(flags)[0] ?? '', "'\\''").slice(2);
    expect(parseInit(words)).toEqual(parseInit(flags));
  });
  it('prints one labeled line per shell family when a value has a single quote (FR-06, TC-08)', () => {
    const flags = ['--snapshot-command', "it's here"];
    const [posix, powershell] = formatEquivalentCommand(flags);
    expect(posix).toBe("POSIX shells: context-brake init --snapshot-command 'it'\\''s here'");
    expect(powershell).toBe("PowerShell: context-brake init --snapshot-command 'it''s here'");
    expect(parseInit(splitWords((posix ?? '').replace('POSIX shells: ', ''), "'\\''").slice(2))).toEqual(parseInit(flags));
    expect(parseInit(splitWords((powershell ?? '').replace('PowerShell: ', ''), "''").slice(2))).toEqual(parseInit(flags));
  });
});
