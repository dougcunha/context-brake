import { describe, expect, it } from 'vitest';
import type { ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import { runScripted } from '../helpers/assistant-context.js';

const BY_ZONE: Partial<ContextBrakeConfig> = { activeHarnesses: ['claude-code'], snapshot: { triggerZone: 'YELLOW', command: 'snap', resumeCommand: 'resume' } };
const BY_PERCENTAGE: Partial<ContextBrakeConfig> = { activeHarnesses: ['claude-code'], snapshot: { triggerZone: 'YELLOW', triggerPercentage: 60, command: 'snap', resumeCommand: 'resume' } };
const KEEP = ['', '', '', '', '', '', '', ''];

describe('assistant trigger question with a percentage', () => {
  it('accepts a typed percentage on a first run', async () => {
    const { result } = await runScripted(['', 's', '70', '', '', '', 'n'], { config: null });
    expect(result?.flags).toEqual(['--harness', 'claude-code', '--snapshot-command', 's', '--snapshot-trigger-percentage', '70']);
    expect(result?.facts).toMatchObject({ triggerZone: 'RED', triggerPercentage: 70 });
  });
  it('asks for the number after the percentage option is chosen', async () => {
    const { result, asked } = await runScripted(['', '', 'percentage', '65', '', '', '', '', ''], { config: BY_ZONE });
    expect(asked.some((question) => question.startsWith('Trigger percentage 1-100 [none]'))).toBe(true);
    expect(result?.flags).toEqual(['--harness', 'claude-code', '--snapshot-trigger-percentage', '65']);
  });
  it('asks again after a value out of range', async () => {
    const { result, asked } = await runScripted(['', '', 'percentage', '101', '80', '', '', '', '', ''], { config: BY_ZONE });
    expect(asked.some((question) => question.includes('snapshot.triggerPercentage'))).toBe(true);
    expect(result?.facts).toMatchObject({ triggerPercentage: 80 });
  });
  it('keeps the stored percentage when every answer is Enter', async () => {
    const { result } = await runScripted(KEEP, { config: BY_PERCENTAGE });
    expect(result?.flags).toEqual(['--harness', 'claude-code']);
    expect(result?.facts).toMatchObject({ triggerPercentage: 60 });
  });
  it('switches back to a zone and clears the percentage even when the zone is unchanged', async () => {
    const { result } = await runScripted(['', '', 'YELLOW', '', '', '', '', ''], { config: BY_PERCENTAGE });
    expect(result?.flags).toEqual(['--harness', 'claude-code', '--snapshot-trigger', 'YELLOW']);
    expect(result?.facts).toMatchObject({ triggerZone: 'YELLOW', triggerPercentage: null });
  });
});
