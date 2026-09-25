import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { PlanPresence } from '../../core/contracts/checkpoint-mode.js';
import { isMissingFileError } from './runtime-paths.js';

export type StatFile = (path: string) => Promise<unknown>;

export class NodePlanPresence implements PlanPresence {
  constructor(private readonly projectRoot: string, private readonly planFile: string, private readonly statFile: StatFile = stat) {}

  async exists(): Promise<boolean> {
    try {
      await this.statFile(resolve(this.projectRoot, this.planFile));
      return true;
    } catch (error: unknown) {
      return !isMissingFileError(error);
    }
  }
}
