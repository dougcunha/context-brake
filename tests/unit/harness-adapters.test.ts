import { describe, expect, it } from 'vitest';
import { getAdapter } from '../../src/infrastructure/harnesses/registry.js';

describe('harness adapter capability profiles: process adapters (RF8, RF9, CA-01)', () => {
  it('reports full support for Claude Code and Cursor', () => {
    const claude = getAdapter('claude-code');
    const cursor = getAdapter('cursor');
    expect(claude.capabilityProfile().supportLevel).toBe('full');
    expect(cursor.capabilityProfile().supportLevel).toBe('full');
  });

  it('reports partial support for Codex CLI and Antigravity CLI', () => {
    const codex = getAdapter('codex-cli');
    const agy = getAdapter('antigravity-cli');
    expect(codex.capabilityProfile().supportLevel).toBe('partial');
    expect(agy.capabilityProfile().supportLevel).toBe('partial');
  });

  it('reports partial support with timeout limitation for Copilot CLI (CA-15)', () => {
    const copilot = getAdapter('github-copilot-cli');
    const profile = copilot.capabilityProfile();
    expect(profile.supportLevel).toBe('partial');
    expect(profile.limitations).toContainEqual({
      capability: 'timeout_fail_closed',
      impact: 'A timed-out hook lets the tool call continue.',
    });
  });
});

describe('harness adapter capability profiles: in-process adapters (RF8)', () => {
  it('reports partial support for OpenCode and full for Pi and Oh-My-Pi', () => {
    const opencode = getAdapter('opencode');
    const pi = getAdapter('pi');
    const omp = getAdapter('oh-my-pi');
    expect(opencode.capabilityProfile().supportLevel).toBe('partial');
    expect(pi.capabilityProfile().supportLevel).toBe('full');
    expect(omp.capabilityProfile().supportLevel).toBe('full');
  });
});
