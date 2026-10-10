import { describe, expect, it } from 'vitest';
import { loadRuntimeAsset } from '../../src/infrastructure/harnesses/common/runtime-assets.js';

describe('standalone runtime asset loader (RF5, RF22)', () => {
  it('loads a built process hook asset by name', async () => {
    const content = await loadRuntimeAsset('cursor-hook.mjs');
    expect(content).toContain('runProcessHook');
  });

  it('throws when asset does not exist', async () => {
    await expect(loadRuntimeAsset('nonexistent-asset.js')).rejects.toThrow('Unable to locate runtime asset: nonexistent-asset.js');
  });
});
