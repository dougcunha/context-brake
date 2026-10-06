import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const CHECKED_VERSION = '2.1.289';
const MINIMUM_VERSION = '2.1.287';

async function read(path: string): Promise<string> {
  return readFile(path, 'utf8');
}

function section(text: string, heading: string): string {
  const start = text.indexOf(heading);
  if (start === -1) return '';
  const next = text.indexOf('\n### ', start + heading.length);
  return text.slice(start, next === -1 ? undefined : next);
}

describe('automatic restart documentation (FR-11, TC-26)', () => {
  it('describes switching on and off, the per-mode gate, requirements and doctor codes in the README', async () => {
    const readme = section(await read('README.md'), '### Automatic Restart in Claude Code');
    for (const topic of ['--auto-restart', '--no-auto-restart', 'full mode', 'light mode', 'CONTEXT_BRAKE_AUTO_RESTART=0', 'disableAllHooks', '--safe-mode', 'WSL', 'AUTO_RESTART_NOT_LOADED', 'context-brake remove']) expect(readme).toContain(topic);
    expect(readme).toContain(MINIMUM_VERSION);
    expect(readme).toContain(`verified on ${CHECKED_VERSION}`);
  });

  it('tells the agent in the protocol that Claude Code clears the session itself', async () => {
    const protocol = await read('docs/context-brake-protocol.md');
    expect(protocol).toContain('context-brake init --auto-restart');
    expect(protocol).toContain('[REQUEST_SESSION_RESET]');
  });

  it('records the verified mods behavior with date and version in the research file', async () => {
    const research = await read('docs/research/harness-integrations.md');
    expect(research).toContain('verificado em 04/10/2026 na versão 2.1.289');
    expect(research).toContain('Implementação conferida em 05/10/2026');
    expect(research).toContain('$.command.run');
    expect(research).not.toContain('nenhum hook documentado abre sessão nova.');
  });
});
