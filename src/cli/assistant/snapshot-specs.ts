import { SNAPSHOT_TRIGGER_ZONES } from '../../core/contracts/zones.js';
import type { PromptSpec } from './ui-prompt.js';

const NONE_WORD = 'none';

export function commandSpec(current: string | undefined): PromptSpec {
  const shown = current ?? NONE_WORD;
  return {
    line: `Snapshot command (Enter keeps [${shown}], type none for no command): `,
    ui: { kind: 'text', message: 'Snapshot command the agent runs before a reset (type none for no command)', placeholder: `Enter keeps ${shown}` },
  };
}

export function triggerSpec(currentZone: string): PromptSpec {
  return {
    line: `Snapshot trigger ${SNAPSHOT_TRIGGER_ZONES.join(' or ')} [${currentZone}]: `,
    ui: { kind: 'select', message: 'Zone where the snapshot is requested', options: SNAPSHOT_TRIGGER_ZONES.map((zone) => ({ value: zone, label: zone })), initial: currentZone },
  };
}

export function resumeSpec(current: string | undefined): PromptSpec {
  const shown = current ?? NONE_WORD;
  return {
    line: `Resume command (Enter keeps [${shown}]): `,
    ui: { kind: 'text', message: 'Command that resumes the work in the new session', placeholder: `Enter keeps ${shown}` },
  };
}
