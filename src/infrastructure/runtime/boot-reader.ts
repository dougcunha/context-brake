import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ContextBrakeConfig } from '../../core/contracts/configuration.js';
import type { GitComparison, GitInspector, GitState } from '../../core/contracts/git.js';
import type { Clock } from '../../core/contracts/session-ledger.js';
import { decideBoot, type BootDecision, type BootFileInput } from '../../core/services/boot-policy.js';
import { compareGitState } from '../../core/services/git-divergence.js';
import { invalidCheckpointSyntaxError, parseStateCheckpoint, type InvalidCheckpointError } from '../../core/validation/checkpoint-validator.js';
import { invalidPlanSyntaxError, type InvalidPlanError } from '../../core/validation/plan-validator.js';
import { isMissingFileError } from './runtime-paths.js';

type SyntaxErrorFactory = (path: string, text: string, cause: unknown) => InvalidPlanError | InvalidCheckpointError;
type BootReaderInput = {
  readonly projectRoot: string;
  readonly config: ContextBrakeConfig;
  readonly clock: Clock;
  readonly gitInspector: GitInspector;
  readonly reportInspectionFailure: (() => Promise<void>) | undefined;
};

export class NodeBootReader {
  constructor(private readonly input: BootReaderInput) {}

  async readBoot(): Promise<BootDecision> {
    const planFile = this.input.config.stateStorage.planFile;
    const checkpointFile = this.input.config.stateStorage.checkpointFile;
    const plan = await this.readFileState(planFile, invalidPlanSyntaxError);
    const checkpoint = await this.readFileState(checkpointFile, invalidCheckpointSyntaxError);
    const maxTokens = this.input.config.stateStorage.bootMaxTokens;
    const emptyGit: GitComparison = { checkedAt: this.input.clock.now().toISOString(), divergences: [] };
    const initial = decideBoot({ plan, checkpoint, planFile, checkpointFile, git: emptyGit, maxTokens });
    if (initial.kind !== 'boot' || checkpoint.kind !== 'value') return initial;
    const recorded = parseStateCheckpoint(checkpoint.value, checkpointFile).gitState;
    const current = await this.inspectGit(recorded.lastCommitHash);
    const git = compareGitState({ recorded, current, now: this.input.clock.now() });
    return decideBoot({ plan, checkpoint, planFile, checkpointFile, git, maxTokens });
  }

  private async inspectGit(recordedCommit: string | null): Promise<GitState> {
    try {
      return await this.input.gitInspector.inspect(recordedCommit);
    } catch {
      await this.input.reportInspectionFailure?.().catch(() => undefined);
      return { status: 'unavailable', reason: 'inspection_failed' };
    }
  }

  private async readFileState(fileName: string, toSyntaxError: SyntaxErrorFactory): Promise<BootFileInput> {
    const filePath = resolve(this.input.projectRoot, fileName);
    const content = await readFile(filePath, 'utf8').catch((error: unknown) => {
      if (isMissingFileError(error)) return null;
      throw error;
    });
    if (content === null) return { kind: 'missing' };
    try {
      return { kind: 'value', value: JSON.parse(content) as unknown };
    } catch (error) {
      return { kind: 'invalid', error: toSyntaxError(fileName, content, error) };
    }
  }
}
