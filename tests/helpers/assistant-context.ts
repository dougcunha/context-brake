import type { AssistantContext } from '../../src/cli/assistant/types.js';
import { runQuestions } from '../../src/cli/assistant/assistant-questions.js';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { HarnessDetection, HarnessId } from '../../src/core/contracts/harness.js';
import { getAllAdapters } from '../../src/infrastructure/harnesses/registry.js';
import { ScriptedPrompts } from './scripted-prompts.js';

export type ContextOptions = { readonly detected?: readonly HarnessId[]; readonly config?: Partial<ContextBrakeConfig> | null; readonly optOut?: boolean };

export function detection(harness: HarnessId): HarnessDetection {
  return { harness, state: 'project', evidence: [], selectedExplicitly: false, version: null, versionSource: null };
}

export function assistantContext(options: ContextOptions = {}): AssistantContext {
  const config = options.config === null ? null : { ...DEFAULT_CONFIG, ...options.config };
  return {
    config,
    detections: (options.detected ?? ['claude-code']).map(detection),
    adapters: getAllAdapters(),
    hasStatuslineOptOut: options.optOut === true,
  };
}

export async function runScripted(answers: readonly (string | null)[], options: ContextOptions = {}) {
  const prompts = new ScriptedPrompts(answers);
  const result = await runQuestions(assistantContext(options), prompts);
  return { result, asked: prompts.asked };
}
