import { describe, expect, it } from 'vitest';
import { loadRuntimeAsset } from '../../src/infrastructure/harnesses/common/runtime-assets.js';

const PROCESS_HOOK_ASSETS: readonly string[] = [
  'claude-code-hook.mjs',
  'codex-cli-hook.mjs',
  'cursor-hook.mjs',
  'github-copilot-cli-hook.mjs',
  'antigravity-cli-hook.mjs',
];

describe('standalone runtime asset loader (RF5, RF22)', () => {
  it.each(PROCESS_HOOK_ASSETS)('loads the %s process hook asset', async (asset) => {
    const content = await loadRuntimeAsset(asset);
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
