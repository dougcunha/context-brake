import { z } from 'zod/mini';
import { SNAPSHOT_TRIGGER_ZONES } from './zones.js';

export const lightModeSchema = z.strictObject({ triggerZone: z._default(z.enum(SNAPSHOT_TRIGGER_ZONES), 'RED') });
export type LightModeConfig = z.infer<typeof lightModeSchema>;
