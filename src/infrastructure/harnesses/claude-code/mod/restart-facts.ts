import type { RestartFacts, StandDownFacts } from '../../../../core/services/auto-restart-policy.js';
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
    interactive: surfaces.some((surface) => INTERACTIVE_SURFACES.includes(surface)),
  };
}

export async function gatherFacts($: ModHost, config: ModConfig): Promise<RestartFacts> {
  const guards = await readGuards($, config.root);
  return {
    signal: true,
    standDown: await standDownFacts($),
    guards: { consecutive: guards.consecutive, maxConsecutive: config.maxConsecutive, toolCallsSinceSeed: guards.toolCallsSinceSeed ?? undefined },
  };
}
