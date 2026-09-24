import { mkdir, mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import type { HarnessSessionExit, SessionLauncher, SessionStreamEvent } from '../../src/core/contracts/run-ports.js';
import { NodeHarnessSessionProcess } from '../../src/infrastructure/runner/harness-session-process.js';
import { fakeHarnessEnvironment, installFakeHarness, writeScenario, type FakeScenario } from '../support/fake-harness/install.js';

export const FAKE_PROMPT = 'Work only on step s1: "quoted" & | < > % title.';

export type FakeWorld = { readonly root: string; readonly bin: string };
export type StartedSession = { readonly events: SessionStreamEvent[]; readonly exit: Promise<HarnessSessionExit>; readonly stop: () => Promise<void> };
export type SessionInput = { readonly launcher: SessionLauncher; readonly scenario: FakeScenario; readonly harnessArgs?: readonly string[] };

export async function createFakeWorld(prefix: string): Promise<FakeWorld> {
  const root = await realpath(await mkdtemp(join(tmpdir(), prefix)));
  const bin = join(root, 'bin');
  await mkdir(bin);
  await installFakeHarness(bin);
  return { root, bin };
}

export async function removeFakeWorld(world: FakeWorld): Promise<void> {
  await rm(world.root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

export async function startFakeSession(world: FakeWorld, input: SessionInput): Promise<StartedSession> {
  const scenarioPath = join(world.root, 'scenario.json');
  await writeScenario(scenarioPath, input.scenario);
  const environment = { ...fakeHarnessEnvironment(world.bin, scenarioPath), CONTEXT_BRAKE_RUN_ID: 'run-t07' };
  const host = { platform: process.platform, environment: { ...process.env, ...environment } };
  const events: SessionStreamEvent[] = [];
  const { launcher } = input;
  const session = new NodeHarnessSessionProcess({ cwd: world.root, graceMilliseconds: 500, host }).start({
    command: launcher.buildCommand({ prompt: FAKE_PROMPT, harnessArgs: input.harnessArgs ?? [] }),
    environment,
    parseLine: (line) => launcher.parseLine(line),
    onEvent: (event) => events.push(event),
  });
  return { events, exit: session.exit, stop: () => session.stop() };
}
