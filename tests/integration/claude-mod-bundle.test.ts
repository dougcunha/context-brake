import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { ASSET_ENTRIES, bundleAsset } from '../../scripts/asset-bundler.js';
import type { HookRegistrar } from '../../src/infrastructure/harnesses/claude-code/mod/host.js';
import { PERSON_PROMPT_ORIGINS, MOD_VERSION } from '../../src/infrastructure/harnesses/claude-code/mod/mod-info.js';
import { register } from '../../src/infrastructure/harnesses/claude-code/mod/register.js';

const MOD_ENTRY = 'assets/runtime/claude-code-mod.ts';
const OBSERVED = 'tests/fixtures/harnesses/claude-code/mod/observed-events.json';
const FORBIDDEN = /node:|readFileSync|writeFileSync|existsSync|spawnSync|execSync|process\.stdout|process\.env/;

type Observed = { 'turn.complete': { keys: string[] }; 'prompt.submit': { origins: { typed: { kind: string } } }; classicEvents: { interactive: string } };

function registeredEvents(): string[] {
  const events: string[] = [];
  function on(event: string): unknown {
    return events.push(event);
  }
  register(on satisfies HookRegistrar);
  return events;
}

describe('bundled mod (NFR-01, DEC-11, TC-15)', () => {
  it('is built from the mod entry and exports register', async () => {
    const entry = ASSET_ENTRIES.find((candidate) => candidate.source === MOD_ENTRY);
    expect(entry?.destination).toBe('dist/assets/runtime/claude-code-mod.mjs');
    const bundled = await bundleAsset(entry ?? { source: MOD_ENTRY, destination: '' });
    expect(bundled.text).toMatch(/export\s*\{[^}]*\bregister\b/);
  });

  it('contains no Node module import and no synchronous file or process API', async () => {
    const bundled = await bundleAsset({ source: MOD_ENTRY, destination: '' });
    expect(bundled.text.match(FORBIDDEN)).toBeNull();
  });
});

describe('contract with the observed Claude Code behavior (DEC-13, TC-16)', () => {
  it('registers only events the real session delivered, never classic.* events', async () => {
    const observed = JSON.parse(await readFile(OBSERVED, 'utf8')) as Observed;
    expect(observed.classicEvents.interactive).toBe('not delivered');
    expect(registeredEvents()).toEqual(['session.start', 'turn.start', 'tool.call', 'turn.complete', 'prompt.submit']);
  });

  it('reads only turn.complete fields and prompt origins the fixture shows', async () => {
    const observed = JSON.parse(await readFile(OBSERVED, 'utf8')) as Observed;
    expect(observed['turn.complete'].keys).toEqual(expect.arrayContaining(['answer', 'reason', 'isAborted']));
    expect(PERSON_PROMPT_ORIGINS).toContain(observed['prompt.submit'].origins.typed.kind);
  });
});

describe('mod version (DEC-10)', () => {
  it('matches the package version so doctor can detect drift', async () => {
    const pkg = JSON.parse(await readFile('package.json', 'utf8')) as { version: string };
    expect(MOD_VERSION).toBe(pkg.version);
  });
});
