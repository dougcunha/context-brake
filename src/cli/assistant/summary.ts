import type { AssistantFacts } from './types.js';

function snapshotLine(facts: AssistantFacts): string {
  if (facts.snapshotCommand === null) return 'Snapshot command: none (only zone headers are injected)';
  const resume = facts.resumeCommand === null ? '' : `, resume ${facts.resumeCommand}`;
  return `Snapshot command: ${facts.snapshotCommand} (trigger ${facts.triggerZone}${resume})`;
}

function restartLines(facts: AssistantFacts): string[] {
  const state = facts.restartOn ? `on, at most ${facts.restartLimit ?? 'the default number of'} consecutive restarts` : 'off';
  return [`Restart: ${state}`, ...facts.restartModes.map((fact) => `  ${fact.harness}: ${fact.mode}`)];
}

function bridgeLine(facts: AssistantFacts): string {
  if (facts.statuslineBridge === null) return 'Status line bridge: not applicable (Claude Code not selected)';
  return `Status line bridge: ${facts.statuslineBridge ? 'yes' : 'no'}`;
}

export function renderSummary(facts: AssistantFacts, command: readonly string[]): string[] {
  const excluded = facts.excluded.length === 0 ? '' : ` (turned off: ${facts.excluded.join(', ')})`;
  const equivalent = command.length === 1 ? [`Equivalent command: ${command[0]}`] : ['Equivalent command:', ...command.map((line) => `  ${line}`)];
  return [
    'Summary of your choices:',
    `  Harnesses: ${facts.selected.length === 0 ? 'none' : facts.selected.join(', ')}${excluded}`,
    `  ${snapshotLine(facts)}`,
    ...restartLines(facts).map((line) => `  ${line}`),
    `  ${bridgeLine(facts)}`,
    `  Debug mode: ${facts.debug ? 'on' : 'off'}`,
    ...equivalent,
  ];
}
