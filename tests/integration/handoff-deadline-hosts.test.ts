import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { RuntimeDescriptor, RuntimeEvent, SessionKey } from '../../src/core/contracts/runtime.js';
import { createInProcessRuntime } from '../../src/infrastructure/runtime/in-process-host.js';
import { runProcessHook, type ProcessHarnessAdapter } from '../../src/infrastructure/runtime/process-hook-host.js';
import { NodeHandoffStore } from '../../src/infrastructure/storage/node-handoff-store.js';

const KEY: SessionKey = { harness: 'codex-cli', sessionId: 'host-deadline', agentId: null };
const DESCRIPTOR: RuntimeDescriptor = { harness: 'codex-cli', capabilities: [{ id: 'session_boot', state: 'supported' }], estimation: { baselineTokens: 15000, tokensPerTurn: 150 }, newSessionCommand: '/new' };
const HANDOFF_CONFIG = { ...DEFAULT_CONFIG, autoRestart: { maxConsecutiveRestarts: 2 } };
const START: RuntimeEvent = { kind: 'session_reset', session: KEY, reason: 'new' };
const DEADLINE_MS = 40;
const ARCHIVED_PATH = /\.context-brake\/handoffs\/[^"]+\.md/;

let root: string;
let pending: string;
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  root = await mkdtemp(join(tmpdir(), 'cb-handoff-hosts-'));
  pending = join(root, '.context-brake', 'handoff.md');
  await mkdir(join(root, '.context-brake'), { recursive: true });
  await writeFile(pending, '# goal\n', 'utf8');
});
afterEach(async () => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

function elapseDeadline(): void {
  vi.advanceTimersByTime(DEADLINE_MS * 10);
}
function watchClaims(afterClaim: () => void): Promise<string | null>[] {
  const claims: Promise<string | null>[] = [];
  const original = NodeHandoffStore.prototype.claim;
  vi.spyOn(NodeHandoffStore.prototype, 'claim').mockImplementation(function claimThenRun(this: NodeHandoffStore, deadline) {
    const claim = original.call(this, deadline).then((result) => { afterClaim(); return result; });
    claims.push(claim);
    return claim;
  });
  return claims;
}
async function expectDelivered(text: string): Promise<void> {
  const archived = ARCHIVED_PATH.exec(text)?.[0];
  expect(archived).toBeDefined();
  await expect(access(join(root, archived ?? ''))).resolves.toBeUndefined();
  await expect(access(pending)).rejects.toThrow();
}
function inProcessStart(): Promise<unknown> {
  return createInProcessRuntime({ projectRoot: root, descriptor: DESCRIPTOR, config: HANDOFF_CONFIG, deadlines: { event: DEADLINE_MS, sessionStart: DEADLINE_MS } }).handle(START);
}

describe('in-process host passes its deadline to the handoff claim (prd-14 FR-02, FR-03, codereview_06 CR-01)', () => {
  it('keeps the handoff pending when the deadline answers before the claim', async () => {
    const claims = watchClaims(() => undefined);
    const decision = inProcessStart();
    elapseDeadline();
    expect(JSON.stringify(await decision)).not.toMatch(ARCHIVED_PATH);
    await vi.waitFor(() => { expect(claims).toHaveLength(1); });
    await expect(claims[0]).resolves.toBeNull();
    await expect(readFile(pending, 'utf8')).resolves.toBe('# goal\n');
  });
  it('delivers the resume text when the deadline elapses after the commit', async () => {
    watchClaims(elapseDeadline);
    await expectDelivered(JSON.stringify(await inProcessStart()));
  });
});

describe('process hook host passes its deadline to the handoff claim (prd-14 FR-02, FR-03, codereview_06 CR-01)', () => {
  it('writes the resume text when the deadline elapses after the commit', async () => {
    await writeFile(join(root, 'context-brake.config.json'), JSON.stringify(HANDOFF_CONFIG), 'utf8');
    watchClaims(elapseDeadline);
    const stdout: string[] = [];
    const adapter: ProcessHarnessAdapter = { descriptor: DESCRIPTOR, mapEvent: () => START, mapInput: async () => ({}), renderDecision: (decision) => JSON.stringify(decision), resolveProjectRoot: async () => root };
    const context = { argv: ['node', 'hook', 'SessionStart'], readStdin: async () => '{}', writeStdout: (text: string) => { stdout.push(text); }, writeStderr: () => undefined, deadlineMilliseconds: DEADLINE_MS, sessionStartDeadlineMilliseconds: DEADLINE_MS };
    await runProcessHook(adapter, context);
    await expectDelivered(stdout.join(''));
  });
});
