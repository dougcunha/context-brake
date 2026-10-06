import { stateCheckpointSchema } from '../../../../core/contracts/state-checkpoint.js';
import type { CheckpointState, RestartFacts, StandDownFacts } from '../../../../core/services/auto-restart-policy.js';
import type { ModHost } from './host.js';
import { readGuards } from './mod-guards.js';
import type { ModConfig } from './mod-config.js';

const INTERACTIVE_SURFACES: readonly string[] = ['terminal', 'desktop'];
const FALSE_ENV_VALUES: readonly string[] = ['', '0', 'false'];

function isTruthyEnv(value: string | undefined): boolean {
  return value !== undefined && !FALSE_ENV_VALUES.includes(value.toLowerCase());
}

async function standDownFacts($: ModHost): Promise<StandDownFacts> {
  const surfaces = await $.session.surfaces();
  return {
    disabledByEnv: (await $.env.get('CONTEXT_BRAKE_AUTO_RESTART')) === '0' || isTruthyEnv(await $.env.get('DISABLE_AUTO_COMPACT')),
    runnerSession: (await $.env.get('CONTEXT_BRAKE_RUN_ID')) !== undefined,
    interactive: surfaces.some((surface) => INTERACTIVE_SURFACES.includes(surface)),
  };
}

async function readActiveStep($: ModHost, path: string): Promise<{ readonly hasStep: boolean } | undefined> {
  try {
    const parsed = stateCheckpointSchema.safeParse(JSON.parse(String(await $.fs.read(path))));
    return parsed.success ? { hasStep: parsed.data.activeStepId !== null } : undefined;
  } catch {
    return undefined;
  }
}

async function checkpointState($: ModHost, config: ModConfig, turnStartedAt: number | undefined): Promise<CheckpointState> {
  const path = `${config.root}/${config.checkpointFile}`;
  if (!(await $.fs.exists(path))) return 'missing';
  const checkpoint = await readActiveStep($, path);
  if (checkpoint === undefined) return 'invalid';
  if (turnStartedAt !== undefined && (await $.fs.stat(path)).mtimeMs < turnStartedAt) return 'stale';
  const hasPlan = await $.fs.exists(`${config.root}/${config.planFile}`);
  return hasPlan && !checkpoint.hasStep ? 'no-active-step' : 'valid';
}

export async function gatherFacts($: ModHost, config: ModConfig, turnStartedAt: number | undefined): Promise<RestartFacts> {
  const guards = await readGuards($, config.root);
  return {
    gate: config.gate,
    signal: true,
    standDown: await standDownFacts($),
    checkpoint: config.gate === 'checkpoint' ? await checkpointState($, config, turnStartedAt) : 'valid',
    guards: { consecutive: guards.consecutive, maxConsecutive: config.maxConsecutive, toolCallsSinceSeed: guards.toolCallsSinceSeed ?? undefined },
  };
}
