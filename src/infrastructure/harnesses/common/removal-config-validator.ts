import type { PlanConflict } from '../../../core/contracts/changes.js';
import { validateJsonDocument } from '../../storage/json-validator.js';

export function validateRemovalConfig(raw: string | null, configPath: string): PlanConflict | null {
  if (raw === null) return null;
  const validation = validateJsonDocument(raw);
  if (!validation.valid) {
    return {
      path: configPath,
      code: 'INVALID_HARNESS_CONFIG',
      detail: validation.errors.join('; '),
    };
  }
  return null;
}
