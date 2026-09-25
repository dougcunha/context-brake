import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { FileSnapshot } from '../../src/core/contracts/changes.js';
import { planProtocolChange, renderProtocol } from '../../src/core/services/protocol-service.js';
import { parseConfiguration } from '../../src/core/validation/configuration-validator.js';

function withAdditionalAllowedCommands(commands: string[]): ContextBrakeConfig {
  return parseConfiguration({ ...DEFAULT_CONFIG, brake: { additionalAllowedCommands: commands } });
}

describe('protocol service rendering and planning (RF10, CA-08)', () => {
  it('renders protocol document using normalized zone thresholds and files', () => {
    const text = renderProtocol(DEFAULT_CONFIG);
    expect(text).toContain('# ContextBrake Protocol');
    expect(text).toContain('`task_plan.json`');
    expect(text).toContain('`state_checkpoint.json`');
    expect(text).toContain('| `GREEN` | Usage below 50% |');
    expect(text).toContain('| `CRITICAL` | Usage at 75% or more |');
  });

  it('plans creation when protocol file is absent', () => {
    const snap: FileSnapshot = { path: 'docs/context-brake-protocol.md', realPath: '/repo/docs/context-brake-protocol.md', exists: false, content: null, sha256: null, isSymlink: false, fileIdentity: 'proto' };
    const { change } = planProtocolChange(DEFAULT_CONFIG, snap, false);
    expect(change).toBeDefined();
    expect(change?.kind).toBe('create');
    expect(change?.owner).toBe('protocol');
  });

  it('flags unmanaged conflicting protocol as a conflict', () => {
    const snap: FileSnapshot = { path: 'docs/context-brake-protocol.md', realPath: '/repo/docs/context-brake-protocol.md', exists: true, content: '# Unrelated user document', sha256: 'xyz', isSymlink: false, fileIdentity: 'proto' };
    const { conflict } = planProtocolChange(DEFAULT_CONFIG, snap, false);
    expect(conflict).toBeDefined();
    expect(conflict?.code).toBe('UNMANAGED_PROTOCOL_CONFLICT');
  });
});

function zoneRow(config: ContextBrakeConfig, zone: string): string {
  return renderProtocol(config).split('\n').find((line) => line.startsWith(`| \`${zone}\``)) ?? '';
}
const TURN_LIMITS_CONFIG: ContextBrakeConfig = { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, zones: { ...DEFAULT_CONFIG.telemetry.zones, greenMaxTurn: 59, yellowMaxTurn: 99 } } };

describe('protocol plan-aware actions (FR-08, DEC-05, TC-08)', () => {
  it('prints the plan and no-plan YELLOW actions in one row', () => {
    expect(zoneRow(DEFAULT_CONFIG, 'YELLOW')).toBe("| `YELLOW` | Usage from 50% to 65% | With `task_plan.json`: Finish the current edit, do not start a new plan step, and run the step's validation command. Without it: Keep working, and prefer finishing the current unit of work before starting large new explorations. |");
  });
  it('prints the plan and no-plan RED actions in one row', () => {
    expect(zoneRow(DEFAULT_CONFIG, 'RED')).toBe('| `RED` | Usage above 65% | With `task_plan.json`: Stop editing. Update `task_plan.json` and `state_checkpoint.json`. If validation passes, commit with `checkpoint: <step title>`. End the response with `[REQUEST_SESSION_RESET]`. Without it: Finish or pause the current unit of work. Record progress where the project already keeps state, or tell the user what remains. End the response with `[REQUEST_SESSION_RESET]`. |');
  });
  it('keeps the no-plan variants free of instructions to stop starting work', () => {
    for (const zone of ['YELLOW', 'RED']) expect(zoneRow(DEFAULT_CONFIG, zone).split('Without it:')[1]).not.toMatch(/do not start|start no new/i);
  });
  it('names the configured plan file in the variants', () => {
    const custom: ContextBrakeConfig = { ...DEFAULT_CONFIG, stateStorage: { ...DEFAULT_CONFIG.stateStorage, planFile: 'plan/steps.json' } };
    expect(zoneRow(custom, 'YELLOW')).toContain('With `plan/steps.json`:');
    expect(renderProtocol(custom)).toContain('the action depends on whether `plan/steps.json` exists');
  });
  it('adds turn conditions only when turn limits are on', () => {
    expect(zoneRow(DEFAULT_CONFIG, 'YELLOW')).not.toContain('turns');
    expect(zoneRow(TURN_LIMITS_CONFIG, 'YELLOW')).toContain('Usage from 50% to 65%, or 60 to 99 turns | With `task_plan.json`:');
    expect(zoneRow(TURN_LIMITS_CONFIG, 'RED')).toContain('Usage above 65%, or 100 turns or more | With `task_plan.json`:');
  });
});

describe('protocol CRITICAL row wording (FR-11, DEC-06)', () => {
  it('lists git status, git add, and git commit as allowed at the CRITICAL ceiling', () => {
    const text = renderProtocol(DEFAULT_CONFIG);
    const criticalRow = text.split('\n').find((line) => line.startsWith('| `CRITICAL`'));
    expect(criticalRow).toBe('| `CRITICAL` | Usage at 75% or more | Other tool calls are blocked. Only reading or writing the plan and checkpoint, running the validation command, `git status`, `git add`, and `git commit` are allowed. Complete the `RED` actions. |');
  });

  it('lists the same CRITICAL allowlist with a custom plan and checkpoint file configuration', () => {
    const customConfig: ContextBrakeConfig = { ...DEFAULT_CONFIG, stateStorage: { ...DEFAULT_CONFIG.stateStorage, planFile: 'custom_plan.json', checkpointFile: 'custom_checkpoint.json' } };
    const text = renderProtocol(customConfig);
    const criticalRow = text.split('\n').find((line) => line.startsWith('| `CRITICAL`'));
    expect(criticalRow).toContain('`git status`, `git add`, and `git commit` are allowed');
  });

  it('appends configured extra allowed commands to the CRITICAL row only', () => {
    const text = renderProtocol(withAdditionalAllowedCommands(['npm run typecheck', 'npm test']));
    const criticalRow = text.split('\n').find((line) => line.startsWith('| `CRITICAL`'));
    expect(criticalRow).toContain('`git commit`, and `npm run typecheck`, and `npm test` are allowed');
    const otherRows = text.split('\n').filter((line) => line.startsWith('| `') && !line.startsWith('| `CRITICAL`'));
    for (const row of otherRows) expect(row).not.toContain('npm run typecheck');
  });

  it('keeps the default CRITICAL row free of extra commands', () => {
    const criticalRow = renderProtocol(DEFAULT_CONFIG).split('\n').find((line) => line.startsWith('| `CRITICAL`'));
    expect(criticalRow).not.toContain('Configured extra commands');
  });

  it('matches the packaged docs/context-brake-protocol.md byte-for-byte', async () => {
    const packaged = await readFile('docs/context-brake-protocol.md', 'utf8');
    expect(packaged).toBe(renderProtocol(DEFAULT_CONFIG));
  });
});
