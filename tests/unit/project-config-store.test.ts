import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { InvalidConfigurationError } from '../../src/core/validation/configuration-validator.js';
import { ProjectConfigStore } from '../../src/infrastructure/storage/project-config-store.js';

describe('project config store (RF16)', () => {
  it('reads and validates a project configuration asynchronously', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'context-brake-'));
    const file = join(directory, 'context-brake.config.json');
    await writeFile(file, JSON.stringify(DEFAULT_CONFIG), 'utf8');
    await expect(new ProjectConfigStore(file).read()).resolves.toEqual(DEFAULT_CONFIG);
    await rm(directory, { recursive: true, force: true });
  });
  it('attaches the file path to schema errors', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'context-brake-'));
    const file = join(directory, 'context-brake.config.json');
    await writeFile(file, JSON.stringify({ ...DEFAULT_CONFIG, schemaVersion: 2 }), 'utf8');
    let captured: unknown;
    try { await new ProjectConfigStore(file).read(); } catch (error) { captured = error; }
    expect(captured).toBeInstanceOf(InvalidConfigurationError);
    expect((captured as InvalidConfigurationError).filePath).toBe(file);
    expect((captured as InvalidConfigurationError).issues[0]?.path).toBe('schemaVersion');
    await rm(directory, { recursive: true, force: true });
  });
  it('reports malformed JSON without accepting it', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'context-brake-'));
    const file = join(directory, 'context-brake.config.json');
    await writeFile(file, '{', 'utf8');
    await expect(new ProjectConfigStore(file).read()).rejects.toBeInstanceOf(InvalidConfigurationError);
    try { await new ProjectConfigStore(file).read(); } catch (error) { const invalid = error as InvalidConfigurationError; expect(invalid.filePath).toBe(file); expect(invalid.issues[0]).toEqual({ path: '(syntax)', received: '{', rule: 'must be valid JSON' }); expect(invalid.cause).toBeDefined(); }
    await rm(directory, { recursive: true, force: true });
  });
});
