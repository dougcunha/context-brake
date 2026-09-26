import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runWrap } from '../../src/cli/commands/wrap.js';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { captureOutput, COMMAND_FIXTURE, createProject, removeProject, seedToolLine, startRunnerSession } from '../helpers/wrap-world.js';

const EXIT_THREE = { command: 'wrap' as const, json: false as const, argv: [process.execPath, COMMAND_FIXTURE, 'exit', '3'] };
const RED_LINE = { toolUseId: 'toolu_1', observedCharacters: 29000, turn: 1, usedTokens: 15150, windowTokens: 128000, estimatedTokens: 15150, source: 'estimated' as const, zone: 'GREEN' as const };
let projectRoot: string;
beforeEach(async () => { projectRoot = await createProject(); });
afterEach(async () => { await removeProject(projectRoot); });

describe('wrap in light mode (TC-10, FR-13)', () => {
  it('shows the light snapshot action and keeps the exit code', async () => {
    await writeFile(join(projectRoot, 'context-brake.config.json'), JSON.stringify({ ...DEFAULT_CONFIG, lightMode: { triggerZone: 'RED' } }), 'utf8');
    await startRunnerSession(projectRoot, 'claude-code');
    for (let turn = 1; turn <= 10; turn += 1) await seedToolLine(projectRoot, 'claude-code', { ...RED_LINE, toolUseId: `toolu_${turn}`, turn });
    const output = captureOutput();
    expect(await runWrap(EXIT_THREE, { projectRoot })).toBe(3);
    expect(output.stdout.join('')).toContain('zone=RED action=save your snapshot or checkpoint now, then end reply with [REQUEST_SESSION_RESET]');
  });
});
