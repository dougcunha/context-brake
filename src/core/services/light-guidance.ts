import type { DenyInput, ZoneGuidance } from '../contracts/checkpoint-mode.js';
import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { LightModeConfig } from '../contracts/light-mode.js';
import type { Zone } from '../contracts/zones.js';
import { renderBlockHeader, renderFailureBlockHeader } from './block-message.js';
import { SESSION_RESET_SIGNAL } from './reset-notice.js';
import { ZONE_ACTIONS } from './zone-actions.js';

const SAVE_NOW = `save your snapshot or checkpoint now, then end reply with ${SESSION_RESET_SIGNAL}`;
const SAVE_IMMEDIATELY = `save your snapshot or checkpoint immediately, then end reply with ${SESSION_RESET_SIGNAL}`;

export function lightAction(zone: Zone, section: LightModeConfig): string {
  switch (zone) {
    case 'GREEN': return ZONE_ACTIONS.GREEN.compact;
    case 'YELLOW': return section.triggerZone === 'YELLOW' ? SAVE_NOW : ZONE_ACTIONS.YELLOW.withoutPlan.compact;
    case 'RED': return SAVE_NOW;
    case 'CRITICAL': return SAVE_IMMEDIATELY;
  }
}
export function lightGuidance(config: ContextBrakeConfig, section: LightModeConfig): ZoneGuidance {
  return {
    mode: 'light',
    actionFor: (zone) => lightAction(zone, section),
    allows: () => Promise.resolve(true),
    denyMessage: (input: DenyInput) => renderBlockHeader({ ...input, config }),
    failureMessage: (tool) => renderFailureBlockHeader(tool),
    resumeText: null,
  };
}
