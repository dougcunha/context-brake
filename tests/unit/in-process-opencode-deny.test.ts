import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createOpenCodePlugin } from '../../src/infrastructure/harnesses/opencode/runtime.js';
import { seedCriticalSession, writeRuntimeConfig } from '../helpers/runtime-seed.js';

describe('in-process OpenCode deny semantics (RF17, RF19, TC-32)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-t07-deny-oc-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('throws the block message from OpenCode tool.execute.before above the ceiling', async () => {
    await writeRuntimeConfig(root, 128000);
    const hooks = createOpenCodePlugin({ directory: root });
    const green = { tool: 'bash', sessionID: 'opencode-green', callID: 'call-green' };
    const critical = { tool: 'bash', sessionID: 'opencode-critical', callID: 'call-critical' };
    await expect(hooks['tool.execute.before']!(green, { args: { command: 'rm -rf src' } })).resolves.toBeUndefined();
    await seedCriticalSession(root, { harness: 'opencode', sessionId: 'opencode-critical', agentId: null });
    await expect(hooks['tool.execute.before']!(critical, { args: { command: 'rm -rf src' } })).rejects.toThrow('[ContextBrake v3] BLOCKED');
  });
});
