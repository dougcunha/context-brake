import type { HarnessId } from '../../core/contracts/harness.js';
import { describeTrigger } from '../../core/services/trigger-text.js';
import type { CardRow } from '../output/card.js';
import type { AssistantFacts } from './types.js';

function enabledRow(facts: AssistantFacts, harness: HarnessId): CardRow {
  const mode = facts.restartModes.find((fact) => fact.harness === harness)?.mode;
  return { label: harness, value: mode === undefined ? 'enabled' : `enabled, restart: ${mode}`, tone: 'good' };
}

export function harnessRows(facts: AssistantFacts): CardRow[] {
  const selected = facts.selected.map((harness) => enabledRow(facts, harness));
  const excluded = facts.excluded.map((harness): CardRow => ({ label: harness, value: 'turned off', tone: 'muted' }));
  if (selected.length > 0) return [...selected, ...excluded];
  return [{ label: 'none', value: 'no harness selected', tone: 'warn' }, ...excluded];
}

function triggerRow(facts: AssistantFacts): CardRow {
  if (facts.triggerPercentage === null) return { label: 'Trigger zone', value: facts.triggerZone };
  return { label: 'Trigger', value: describeTrigger(facts) };
}

export function snapshotRows(facts: AssistantFacts): CardRow[] {
  if (facts.snapshotCommand === null) return [{ label: 'Command', value: 'none (only zone headers are injected)', tone: 'muted' }];
  const resume: CardRow = facts.resumeCommand === null ? { label: 'Resume', value: 'none', tone: 'muted' } : { label: 'Resume', value: facts.resumeCommand, tone: 'accent' };
  const received = facts.invocations.map((fact): CardRow => ({ label: `In ${fact.harness}`, value: `${fact.command}${fact.resumeCommand === null ? '' : `, resume: ${fact.resumeCommand}`}`, tone: 'accent' }));
  return [{ label: 'Command', value: facts.snapshotCommand, tone: 'accent' }, triggerRow(facts), resume, ...received];
}

function switchRow(label: string, isOn: boolean, words: readonly [string, string]): CardRow {
  return isOn ? { label, value: words[0], tone: 'good' } : { label, value: words[1], tone: 'muted' };
}

function restartRow(facts: AssistantFacts): CardRow {
  if (!facts.restartOn) return switchRow('Restart', false, ['on', 'off']);
  return { label: 'Restart', value: `on, at most ${facts.restartLimit ?? 'the default number of'} consecutive restarts`, tone: 'good' };
}

function contextRow(facts: AssistantFacts): CardRow {
  if (facts.contextSource === 'mod') return { label: 'Context source', value: 'mod (your status line is left alone)', tone: 'good' };
  if (facts.statuslineBridge === null) return { label: 'Status line bridge', value: 'not applicable (Claude Code not selected)', tone: 'muted' };
  return switchRow('Status line bridge', facts.statuslineBridge, ['yes', 'no']);
}

function gitIgnoreRow(facts: AssistantFacts): CardRow {
  if (facts.gitIgnore === null) return { label: 'Git ignore', value: 'not applicable (not a Git repository)', tone: 'muted' };
  return switchRow('Git ignore', facts.gitIgnore, ['yes', 'no']);
}

export function optionRows(facts: AssistantFacts): CardRow[] {
  return [restartRow(facts), contextRow(facts), switchRow('Debug mode', facts.debug, ['on', 'off']), gitIgnoreRow(facts)];
}
