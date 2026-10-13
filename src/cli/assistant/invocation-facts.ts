import type { HarnessId } from '../../core/contracts/harness.js';
import type { SkillInvocationResolver } from '../../core/contracts/skill-invocation.js';
import type { SnapshotChoice } from './questions-snapshot.js';
import type { HarnessInvocationFact } from './types.js';

export function invocationFacts(resolve: SkillInvocationResolver, selected: readonly HarnessId[], snapshot: SnapshotChoice): HarnessInvocationFact[] {
  const { command, resumeCommand } = snapshot;
  if (command === null) return [];
  return selected.map((harness) => ({ harness, command: resolve(harness)(command), resumeCommand: resumeCommand === null ? null : resolve(harness)(resumeCommand) }));
}
