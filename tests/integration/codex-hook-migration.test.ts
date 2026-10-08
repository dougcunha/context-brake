import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CODEX_CONFIG_FILE, planCodexInstall } from '../../src/infrastructure/harnesses/codex-cli/planner.js';

const EVENTS = ['PostToolUse', 'SessionStart', 'Stop'] as const;
const THIRD_PARTY_GROUP = { matcher: '*', hooks: [{ type: 'command', command: 'echo third-party' }] };
type Group = { matcher: string; hooks: { type: string; command: string; commandWindows?: string }[] };
let root = '';

function shellNeutralCommand(event: string): string {
  return `git -c "alias.contextbrake=!node .codex/hooks/context-brake.mjs" contextbrake ${event}`;
}
function twoFormGroup(event: string): Group {
  const matcher = event === 'SessionStart' ? 'startup|resume|clear|compact' : '*';
  const command = `node "$(git rev-parse --show-toplevel)/.codex/hooks/context-brake.mjs" ${event}`;
  const commandWindows = `for /f "delims=" %i in ('git rev-parse --show-toplevel') do @node "%i/.codex/hooks/context-brake.mjs" ${event}`;
  return { matcher, hooks: [{ type: 'command', command, commandWindows }] };
}
async function plannedConfig(): Promise<string> {
  const plan = await planCodexInstall(root);
  return plan.changes.find((change) => change.path === CODEX_CONFIG_FILE)?.content ?? '';
}

describe('Codex hook registration migrates from the cmd-only form (DEC-04, CR-06)', () => {
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'cb-codex-migration-'));
    await mkdir(join(root, '.codex'), { recursive: true });
    const hooks = Object.fromEntries(EVENTS.map((event) => [event, [THIRD_PARTY_GROUP, twoFormGroup(event)]]));
    await writeFile(join(root, CODEX_CONFIG_FILE), JSON.stringify({ hooks }, null, 2), 'utf8');
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it('replaces the two-form entries with one shell-neutral command and keeps other hooks', async () => {
    const config = JSON.parse(await plannedConfig()) as { hooks: Record<string, Group[]> };
    for (const event of EVENTS) {
      const owned = config.hooks[event]?.filter((group) => group.hooks.some((hook) => hook.command.includes('context-brake.mjs')));
      expect(owned, event).toHaveLength(1);
      expect(owned?.[0]?.hooks).toEqual([{ type: 'command', command: shellNeutralCommand(event) }]);
      expect(config.hooks[event]).toContainEqual(THIRD_PARTY_GROUP);
    }
  });

  it('changes nothing when the migrated registration is planned again', async () => {
    const migrated = await plannedConfig();
    await writeFile(join(root, CODEX_CONFIG_FILE), migrated, 'utf8');
    expect(await plannedConfig()).toBe(migrated);
  });
});
