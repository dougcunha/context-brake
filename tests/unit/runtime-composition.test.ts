import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { RuntimeDescriptor, SessionKey } from '../../src/core/contracts/runtime.js';
import type { Clock } from '../../src/core/contracts/session-ledger.js';
import { InvalidConfigurationError } from '../../src/core/validation/configuration-validator.js';
import { composeRuntime, loadRuntimeConfiguration } from '../../src/infrastructure/runtime/runtime-composition.js';

const KEY: SessionKey = { harness: 'claude-code', sessionId: 'session-1', agentId: null };
const DESCRIPTOR: RuntimeDescriptor = { harness: 'claude-code', capabilities: [{ id: 'pre_tool_block', state: 'supported' }, { id: 'tool_coverage', state: 'supported' }], estimation: { baselineTokens: 15000, tokensPerTurn: 150 }, newSessionCommand: '/clear' };
const clock: Clock = { now: () => new Date('2026-09-15T12:00:00.000Z') };

describe('runtime configuration loading (CMP-17)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-t04-compose-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('falls back to the default configuration when the file is missing', async () => {
    expect(await loadRuntimeConfiguration(root)).toEqual(DEFAULT_CONFIG);
  });
  it('parses a valid configuration file', async () => {
    const custom = { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, contextWindowCeiling: 200000 } };
    await writeFile(join(root, 'context-brake.config.json'), JSON.stringify(custom), 'utf8');
    expect((await loadRuntimeConfiguration(root)).telemetry.contextWindowCeiling).toBe(200000);
  });
  it('rejects invalid syntax and invalid values with the configuration error', async () => {
    await writeFile(join(root, 'context-brake.config.json'), 'not json', 'utf8');
    await expect(loadRuntimeConfiguration(root)).rejects.toBeInstanceOf(InvalidConfigurationError);
    const mismatched = { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, zones: { ...DEFAULT_CONFIG.telemetry.zones, greenMaxTurn: 11 } } };
    await writeFile(join(root, 'context-brake.config.json'), JSON.stringify(mismatched), 'utf8');
    await expect(loadRuntimeConfiguration(root)).rejects.toBeInstanceOf(InvalidConfigurationError);
  });
});

describe('runtime composition wiring (T04.9, CMP-17)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-t04-wire-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('wires the plan reader to the configured plan file', async () => {
    await writeFile(join(root, 'task_plan.json'), JSON.stringify({ steps: [{ id: 1, status: 'IN_PROGRESS', validationCommand: 'npm test' }] }), 'utf8');
    const services = composeRuntime({ projectRoot: root, descriptor: DESCRIPTOR, config: DEFAULT_CONFIG, clock });
    expect(await services.readValidationCommand()).toBe('npm test');
  });
  it('wires the ledger under the project runtime directory', async () => {
    const services = composeRuntime({ projectRoot: root, descriptor: DESCRIPTOR, config: DEFAULT_CONFIG, clock });
    await services.ledger.appendToolLine(KEY, { toolUseId: null, observedCharacters: 4, turn: 1, usedTokens: 1, windowTokens: 128000, estimatedTokens: 1, source: 'estimated', zone: 'GREEN' });
    expect(await services.ledger.readLines(KEY)).toHaveLength(1);
    expect(await services.readValidationCommand()).toBeNull();
  });
});
