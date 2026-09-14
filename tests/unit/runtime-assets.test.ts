import { describe, expect, it } from 'vitest';
import { loadRuntimeAsset } from '../../src/infrastructure/harnesses/common/runtime-assets.js';

describe('standalone runtime asset loader (RF5, RF22)', () => {
  it('loads process-hook asset with error handling and fallback', async () => {
    const content = await loadRuntimeAsset('process-hook.mjs');
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain('runProcessHook');
  });

  it('loads OpenCode plugin runtime asset', async () => {
    const content = await loadRuntimeAsset('opencode-plugin.js');
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain('contextBrakePlugin');
  });

  it('loads Pi extension runtime asset', async () => {
    const content = await loadRuntimeAsset('pi-extension.js');
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain('contextBrakePiExtension');
  });

  it('loads Oh-My-Pi extension runtime asset', async () => {
    const content = await loadRuntimeAsset('omp-extension.js');
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain('contextBrakeOmpExtension');
  });

  it('throws when asset does not exist', async () => {
    await expect(loadRuntimeAsset('nonexistent-asset.js')).rejects.toThrow('Unable to locate');
  });
});
