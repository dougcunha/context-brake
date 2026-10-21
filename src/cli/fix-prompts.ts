import type { DiagnosticFinding } from '../core/contracts/diagnostics.js';
import { HARNESS_IDS, type HarnessId } from '../core/contracts/harness.js';
import { confirmWithPort, type PromptPort } from './assistant/prompt-port.js';
import type { UiOption } from './assistant/ui-prompt.js';
import { ASSET_MODIFIED, BRIDGE_INACTIVE, decideByFlags, decisionFindings, NO_PROJECT_HARNESS, type DecisionChoice, type DecisionResult, type FlagPolicy } from './fix-decisions.js';

const SKIP = 'skip';
const SKIPPED = 'You skipped this decision.';
const BRIDGE_TEXT = 'The status line bridge is inactive. Reinstall (r), forget (f), or skip (s)? [s] ';
const HARNESS_TEXT = 'No harness is active. Type a harness id to install, or press Enter to skip: ';
const BRIDGE_OPTIONS: readonly UiOption[] = [
  { value: 'install', label: 'Reinstall the status line bridge' },
  { value: 'remove', label: 'Forget the bridge and keep your status line' },
  { value: SKIP, label: 'Skip' },
];
const BRIDGE_VERBS: Readonly<Record<'install' | 'remove', string>> = { install: 'reinstall', remove: 'forget' };
const BRIDGE_ANSWERS: Readonly<Record<string, 'install' | 'remove'>> = { r: 'install', reinstall: 'install', install: 'install', f: 'remove', forget: 'remove', remove: 'remove' };

function result(finding: DiagnosticFinding, choice: DecisionChoice | null, reason: string): DecisionResult {
  return { finding, choice, reason };
}

async function askAsset(prompts: PromptPort, finding: DiagnosticFinding): Promise<DecisionResult> {
  const isReplace = await confirmWithPort(prompts, `Replace the modified file ${finding.path ?? ''} with the installed version?`);
  return isReplace ? result(finding, { kind: 'overwrite' }, 'You chose to replace the file.') : result(finding, null, 'You kept the modified file.');
}

async function askBridge(prompts: PromptPort, finding: DiagnosticFinding): Promise<DecisionResult> {
  const ui = { kind: 'select' as const, message: 'The status line bridge is inactive.', options: BRIDGE_OPTIONS, initial: SKIP };
  const answer = prompts.askUi === undefined ? await prompts.ask(BRIDGE_TEXT) : await prompts.askUi(ui, null);
  const request = BRIDGE_ANSWERS[(answer ?? '').trim().toLowerCase()];
  return request === undefined ? result(finding, null, SKIPPED) : result(finding, { kind: 'statusline', request }, `You chose to ${BRIDGE_VERBS[request]} the bridge.`);
}

async function askHarness(prompts: PromptPort, finding: DiagnosticFinding): Promise<DecisionResult> {
  const options: UiOption[] = [...HARNESS_IDS.map((id) => ({ value: id, label: id })), { value: SKIP, label: 'Skip' }];
  const ui = { kind: 'select' as const, message: 'No harness is active. Select one to install.', options, initial: SKIP };
  const answer = ((prompts.askUi === undefined ? await prompts.ask(HARNESS_TEXT) : await prompts.askUi(ui, null)) ?? '').trim();
  if (answer === '' || answer === SKIP) return result(finding, null, SKIPPED);
  if (!HARNESS_IDS.includes(answer as HarnessId)) return result(finding, null, `Unknown harness '${answer}'.`);
  return result(finding, { kind: 'harness', harness: answer as HarnessId }, `You chose ${answer}.`);
}

async function askOne(prompts: PromptPort, finding: DiagnosticFinding, policy: FlagPolicy): Promise<DecisionResult> {
  if (finding.code === ASSET_MODIFIED) return askAsset(prompts, finding);
  if (finding.code === BRIDGE_INACTIVE) return askBridge(prompts, finding);
  if (finding.code === NO_PROJECT_HARNESS && policy.harness.length === 0) return askHarness(prompts, finding);
  const [byFlags] = decideByFlags([finding], policy);
  return byFlags ?? result(finding, null, SKIPPED);
}

export async function decideByPrompts(prompts: PromptPort, findings: readonly DiagnosticFinding[], policy: FlagPolicy): Promise<DecisionResult[]> {
  const results: DecisionResult[] = [];
  for (const finding of decisionFindings(findings)) results.push(await askOne(prompts, finding, policy));
  return results;
}
