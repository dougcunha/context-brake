import type { Zone } from '../../src/core/contracts/zones.js';
import { isDebugModeInEffect } from '../../src/core/services/debug-mode-merge.js';
import { readZone, type ZoneInputs, type ZoneSettings } from '../../src/core/services/session-zone.js';
import { renderTelemetryBlock } from '../../src/core/services/telemetry-block.js';
import { redStartTurn } from '../../src/core/services/zone-classifier.js';

export function renderSessionTelemetry(settings: ZoneSettings, inputs: ZoneInputs, actionFor: (zone: Zone) => string): string {
  const { reading, percentage, zone } = readZone(settings, inputs);
  return renderTelemetryBlock({ turn: inputs.turns, turnCeiling: redStartTurn(settings.config.telemetry.zones), usagePercentage: percentage, usage: reading, zone, action: actionFor(zone), debug: isDebugModeInEffect(settings.config) });
}
