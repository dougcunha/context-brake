import { readFile } from 'node:fs/promises';
import { invalidSyntaxError, parseConfiguration } from '../../core/validation/configuration-validator.js';
import { sanitizeConfiguration, type SanitizedConfiguration } from '../../core/validation/configuration-sanitizer.js';
import type { ContextBrakeConfig } from '../../core/contracts/configuration.js';

export class ProjectConfigStore {
  constructor(private readonly filePath: string) {}
  async read(): Promise<ContextBrakeConfig> {
    return parseConfiguration(await this.readJson(), this.filePath);
  }
  async readTolerant(): Promise<SanitizedConfiguration> {
    return sanitizeConfiguration(await this.readJson(), this.filePath);
  }
  private async readJson(): Promise<unknown> {
    const source = await readFile(this.filePath, 'utf8');
    try { return JSON.parse(source) as unknown; } catch (error) { throw invalidSyntaxError(this.filePath, source, error); }
  }
}
