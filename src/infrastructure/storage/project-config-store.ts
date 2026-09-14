import { readFile } from 'node:fs/promises';
import { invalidSyntaxError, parseConfiguration } from '../../core/validation/configuration-validator.js';
import type { ContextBrakeConfig } from '../../core/contracts/configuration.js';

export class ProjectConfigStore {
  constructor(private readonly filePath: string) {}
  async read(): Promise<ContextBrakeConfig> {
    const source = await readFile(this.filePath, 'utf8');
    let value: unknown;
    try { value = JSON.parse(source) as unknown; } catch (error) { throw invalidSyntaxError(this.filePath, source, error); }
    return parseConfiguration(value, this.filePath);
  }
}
