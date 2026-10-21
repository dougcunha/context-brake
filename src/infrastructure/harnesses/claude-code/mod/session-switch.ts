import type { ModHost } from './host.js';
import { SEED_SWITCH_LIMIT_MS, SEED_SWITCH_POLL_MS } from './mod-info.js';

async function hasSwitched($: ModHost, endedId: string | undefined): Promise<boolean> {
  if (endedId === undefined) return false;
  try {
    return (await $.session.id()) !== endedId;
  } catch {
    return false;
  }
}

function delay($: ModHost, ms: number): Promise<void> {
  return new Promise((resolve) => { $.clock.after(ms, resolve); });
}

async function pollForSwitch($: ModHost, endedId: string | undefined): Promise<boolean> {
  for (let waited = 0; waited < SEED_SWITCH_LIMIT_MS; waited += SEED_SWITCH_POLL_MS) {
    await delay($, SEED_SWITCH_POLL_MS);
    if (await hasSwitched($, endedId)) return true;
  }
  return false;
}

export async function waitForSessionSwitch($: ModHost, endedId: string | undefined): Promise<boolean> {
  try {
    return await pollForSwitch($, endedId);
  } catch {
    return false;
  }
}
