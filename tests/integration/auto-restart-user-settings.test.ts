import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MOD_OWNERSHIP_FILE } from '../../src/infrastructure/harnesses/claude-code/auto-restart-ownership.js';
import { createStatuslineWorld, LOCAL_PATH, readWorldFile, removeStatuslineWorld, runJson, type StatuslineWorld } from '../helpers/statusline-world.js';

const INIT = ['init', '--yes', '--json'];
const USER_FILES = [['an empty object', '{}\n'], ['a comment only', '{\n  // mine\n}\n']] as const;
const BRIDGE_FLAGS = [['on', []], ['off', ['--no-statusline-bridge']]] as const;
const SWITCH_OFFS = [['remove', ['remove', '--yes', '--json']], ['opt-out of both', [...INIT, '--no-auto-restart', '--no-statusline-bridge']]] as const;

type UserFileCase = { readonly file: string; readonly bridge: string; readonly off: string; readonly text: string; readonly flags: readonly string[]; readonly argv: readonly string[] };

const CASES: readonly UserFileCase[] = USER_FILES.flatMap(([file, text]) => BRIDGE_FLAGS.flatMap(([bridge, flags]) => SWITCH_OFFS.map(([off, argv]) => ({ file, bridge, off, text, flags, argv }))));
let world: StatuslineWorld;

beforeEach(async () => { world = await createStatuslineWorld(); });
afterEach(async () => { await removeStatuslineWorld(world); });

function withoutWhitespace(text: string | null): string | undefined {
  return text?.replace(/\s/g, '');
}

describe('switch-off keeps a local settings file the user created (FR-09, file-changes, codereview_03 CR-01)', () => {
  it.each(CASES)('keeps $file with the bridge $bridge after $off', async ({ text, flags, argv }) => {
    await writeFile(join(world.root, LOCAL_PATH), text, 'utf8');
    await runJson(world, [...INIT, '--auto-restart', ...flags]);
    await runJson(world, argv);
    expect(withoutWhitespace(await readWorldFile(world, LOCAL_PATH))).toBe(withoutWhitespace(text));
    expect(await readWorldFile(world, MOD_OWNERSHIP_FILE)).toBeNull();
  });
});
