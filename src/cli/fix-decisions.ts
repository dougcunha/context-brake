import type { StatuslineBridgeRequest } from '../core/contracts/adapter.js';
import type { DiagnosticFinding } from '../core/contracts/diagnostics.js';
import type { HarnessId } from '../core/contracts/harness.js';
import { findingKey } from '../core/services/fix-outcomes.js';

export type DecisionChoice =
  | { readonly kind: 'overwrite' }
  | { readonly kind: 'statusline'; readonly request: 'install' | 'remove' }
  | { readonly kind: 'harness'; readonly harness: HarnessId };

export type DecisionResult = { readonly finding: DiagnosticFinding; readonly choice: DecisionChoice | null; readonly reason: string };

export type FixDecisions = {
  readonly overwritePaths: ReadonlySet<string>;
  readonly statuslineBridge: StatuslineBridgeRequest;
  readonly harness: readonly HarnessId[];
  readonly skipped: ReadonlyMap<string, string>;
};

export type FlagPolicy = { readonly force: boolean; readonly harness: readonly HarnessId[] };

export const ASSET_MODIFIED = 'ASSET_MODIFIED';
export const BRIDGE_INACTIVE = 'STATUSLINE_BRIDGE_INACTIVE';
export const NO_PROJECT_HARNESS = 'NO_PROJECT_HARNESS';
const NEEDS_DECISION = 'Needs a decision. Run context-brake fix on a terminal, or pass --yes --force.';
const NEEDS_HARNESS = 'Needs a harness. Pass --harness <id>.';
const CHOSEN = 'Chosen with --force.';

export function decisionFindings(findings: readonly DiagnosticFinding[]): DiagnosticFinding[] {
  return findings.filter((finding) => finding.severity !== 'ok' && finding.fix?.group === 'decision');
}

function flagChoice(finding: DiagnosticFinding, policy: FlagPolicy): DecisionResult {
  const [first] = policy.harness;
  if (finding.code === NO_PROJECT_HARNESS) return first === undefined ? { finding, choice: null, reason: NEEDS_HARNESS } : { finding, choice: { kind: 'harness', harness: first }, reason: `Chosen with --harness ${first}.` };
  if (!policy.force) return { finding, choice: null, reason: NEEDS_DECISION };
  if (finding.code === ASSET_MODIFIED) return { finding, choice: { kind: 'overwrite' }, reason: CHOSEN };
  if (finding.code === BRIDGE_INACTIVE) return { finding, choice: { kind: 'statusline', request: 'install' }, reason: CHOSEN };
  return { finding, choice: null, reason: NEEDS_DECISION };
}

export function decideByFlags(findings: readonly DiagnosticFinding[], policy: FlagPolicy): DecisionResult[] {
  return decisionFindings(findings).map((finding) => flagChoice(finding, policy));
}

function statuslineRequest(results: readonly DecisionResult[]): StatuslineBridgeRequest {
  const bridge = results.find((result) => result.finding.code === BRIDGE_INACTIVE);
  if (bridge === undefined) return 'default';
  return bridge.choice?.kind === 'statusline' ? bridge.choice.request : 'keep';
}

function harnessesOf(results: readonly DecisionResult[], policy: FlagPolicy): HarnessId[] {
  const chosen = results.flatMap((result) => (result.choice?.kind === 'harness' ? [result.choice.harness] : []));
  return chosen.length === 0 ? [] : [...new Set([...chosen, ...policy.harness])];
}

export function toDecisions(results: readonly DecisionResult[], policy: FlagPolicy): FixDecisions {
  const overwrite = results.filter((result) => result.choice?.kind === 'overwrite' && result.finding.path !== null).map((result) => result.finding.path ?? '');
  const skipped = results.filter((result) => result.choice === null).map((result): [string, string] => [findingKey(result.finding), result.reason]);
  return { overwritePaths: new Set(overwrite), statuslineBridge: statuslineRequest(results), harness: harnessesOf(results, policy), skipped: new Map(skipped) };
}
