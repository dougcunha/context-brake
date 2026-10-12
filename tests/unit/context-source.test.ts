import { describe, expect, it } from 'vitest';
import type { HarnessContext, StatuslineBridgeRequest } from '../../src/core/contracts/adapter.js';
import { CONTEXT_MOD_MINIMUM_CLAUDE_VERSION, detectContextSource } from '../../src/infrastructure/harnesses/claude-code/context-source.js';
import { runnerReporting } from '../helpers/claude-version-runner.js';

function contextFor(version: string | null, request?: StatuslineBridgeRequest): HarnessContext {
  return { projectRoot: '/repo', runner: runnerReporting(version), ...(request === undefined ? {} : { statuslineBridge: request }) };
}

describe('context source of the Claude Code install (FR-03, FR-05, DEC-05, TC-05)', () => {
  it('uses the first version that loads mods by default as the minimum', () => {
    expect(CONTEXT_MOD_MINIMUM_CLAUDE_VERSION).toBe('2.1.287');
  });

  it.each([
    { version: '2.1.286', source: 'bridge' },
    { version: '2.1.287', source: 'mod' },
    { version: '2.1.296', source: 'mod' },
    { version: '3.0.0', source: 'mod' },
    { version: null, source: 'bridge' },
  ])('picks $source for Claude Code $version on a plain init', async ({ version, source }) => {
    expect(await detectContextSource(contextFor(version))).toBe(source);
  });

  it.each([
    { request: 'default', source: 'mod' },
    { request: 'remove', source: 'mod' },
    { request: 'install', source: 'bridge' },
  ] as const)('picks $source for the $request bridge request on a compatible version', async ({ request, source }) => {
    expect(await detectContextSource(contextFor('2.1.296', request))).toBe(source);
  });
});
