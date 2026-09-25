import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CliArgumentError, parseCliArgs } from '../../src/cli/argument-parser.js';
import { createClaudeProject, PROTOCOL_PATH, readConfig, readProjectFile, removeProject, runCli, USER_CLAUDE } from '../helpers/delegated-world.js';

const ADD = ['init', '--yes', '--json', '--snapshot-command', '/sdd-snapshot', '--snapshot-path', 'tasks/**/context-snapshot.md', '--resume-command', '/sdd-orchestrate-flow'];
let root: string;
beforeEach(async () => { root = await createClaudeProject('cb-init-delegated-'); });
afterEach(async () => { await removeProject(root); });

describe('init adds the delegated snapshot section (TC-11, FR-09)', () => {
  it('writes the section, the protocol section, and keeps user content', async () => {
    expect((await runCli(root, ADD)).code).toBe(0);
    expect((await readConfig(root))['delegatedSnapshot']).toEqual({ snapshotCommand: '/sdd-snapshot', triggerZone: 'RED', resumeCommand: '/sdd-orchestrate-flow', allowedPaths: ['tasks/**/context-snapshot.md'], allowedSkills: [] });
    const protocol = await readProjectFile(root, PROTOCOL_PATH);
    expect(protocol).toContain('## Delegated snapshot');
    expect(protocol).toContain('- From `RED` on, the telemetry action is `run "/sdd-snapshot", then end reply with [REQUEST_SESSION_RESET]`.');
    expect(await readProjectFile(root, 'CLAUDE.md')).toContain(USER_CLAUDE.trim());
  });
  it('changes nothing on a second identical run', async () => {
    await runCli(root, ADD);
    const before = [await readProjectFile(root, 'context-brake.config.json'), await readProjectFile(root, PROTOCOL_PATH), await readProjectFile(root, 'CLAUDE.md')];
    expect((await runCli(root, ADD)).code).toBe(0);
    expect([await readProjectFile(root, 'context-brake.config.json'), await readProjectFile(root, PROTOCOL_PATH), await readProjectFile(root, 'CLAUDE.md')]).toEqual(before);
  });
  it('updates only the given fields on a later run', async () => {
    await runCli(root, ADD);
    await runCli(root, ['init', '--yes', '--json', '--snapshot-trigger', 'YELLOW']);
    expect((await readConfig(root))['delegatedSnapshot']).toMatchObject({ snapshotCommand: '/sdd-snapshot', triggerZone: 'YELLOW' });
  });
});

describe('init removes the delegated snapshot section (TC-11, FR-10)', () => {
  it('restores the plan-only protocol and keeps existing plan files', async () => {
    await runCli(root, ['init', '--yes', '--json']);
    const planOnly = await readProjectFile(root, PROTOCOL_PATH);
    await runCli(root, ADD);
    await writeFile(join(root, 'task_plan.json'), '{"keep":true}\n', 'utf8');
    expect((await runCli(root, ['init', '--yes', '--json', '--no-delegated-snapshot'])).code).toBe(0);
    expect('delegatedSnapshot' in (await readConfig(root))).toBe(false);
    expect(await readProjectFile(root, PROTOCOL_PATH)).toBe(planOnly);
    expect(await readProjectFile(root, 'task_plan.json')).toBe('{"keep":true}\n');
  });
});

describe('init rejects invalid delegated snapshot options (TC-11, FR-02)', () => {
  it.each([
    ['a path without a snapshot command', ['init', '--yes', '--snapshot-path', 'a/*.md'], '--snapshot-command is required'],
    ['removal combined with a command', ['init', '--yes', '--no-delegated-snapshot', '--snapshot-command', '/x'], 'cannot be combined'],
    ['an unknown trigger zone', ['init', '--yes', '--snapshot-command', '/x', '--snapshot-trigger', 'GREEN'], 'delegatedSnapshot.triggerZone'],
    ['a traversal pattern', ['init', '--yes', '--snapshot-command', '/x', '--snapshot-path', '../x'], 'delegatedSnapshot.allowedPaths.0'],
  ])('exits 64 for %s', async (_, argv, message) => {
    const result = await runCli(root, argv);
    expect(result.code).toBe(64);
    expect(result.stderr).toContain(message);
  });
  it('parses repeated path and skill flags', () => {
    const parsed = parseCliArgs(['init', '--snapshot-command', '/x', '--snapshot-path', 'a/*', '--snapshot-path', 'b/*', '--snapshot-skill', 'save']);
    expect(parsed).toMatchObject({ delegatedSnapshot: { snapshotCommand: '/x', allowedPaths: ['a/*', 'b/*'], allowedSkills: ['save'], remove: false } });
    expect(() => parseCliArgs(['init', '--snapshot-bogus'])).toThrow(CliArgumentError);
  });
});
