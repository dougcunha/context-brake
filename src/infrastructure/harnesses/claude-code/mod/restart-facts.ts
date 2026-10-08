import type { StandDownFacts } from '../../../../core/contracts/restart-host.js';
import type { ModHost } from './host.js';

const INTERACTIVE_SURFACES: readonly string[] = ['terminal', 'desktop'];
const FALSE_ENV_VALUES: readonly string[] = ['', '0', 'false'];

function isTruthyEnv(value: string | undefined): boolean {
  return value !== undefined && !FALSE_ENV_VALUES.includes(value.toLowerCase());
}

export async function standDownFacts($: ModHost): Promise<StandDownFacts> {
  const surfaces = await $.session.surfaces();
  return {
    disabledByEnv: (await $.env.get('CONTEXT_BRAKE_AUTO_RESTART')) === '0' || isTruthyEnv(await $.env.get('DISABLE_AUTO_COMPACT')),
    interactive: surfaces.some((surface) => INTERACTIVE_SURFACES.includes(surface)),
  };
}
