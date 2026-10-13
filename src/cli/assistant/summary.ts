import { PLAIN_STYLE, type Style } from '../output/style.js';
import { renderCard } from '../output/card.js';
import { harnessRows, optionRows, snapshotRows } from './summary-rows.js';
import type { AssistantFacts } from './types.js';

const SUMMARY_TITLE = 'Summary of your choices:';
const COMMAND_LABEL = 'Equivalent command:';
const COMMAND_INDENT = '  ';

function commandLines(command: readonly string[], style: Style): string[] {
  const label = style.paint('muted', COMMAND_LABEL);
  if (command.length === 1) return [`${label} ${style.paint('accent', command[0] ?? '')}`];
  return [label, ...command.map((line) => `${COMMAND_INDENT}${style.paint('accent', line)}`)];
}

export function renderSummary(facts: AssistantFacts, command: readonly string[], style: Style = PLAIN_STYLE): string[] {
  return [
    style.paint('title', SUMMARY_TITLE),
    '',
    ...renderCard('Harnesses', harnessRows(facts), style),
    '',
    ...renderCard('Snapshot', snapshotRows(facts), style),
    '',
    ...renderCard('Options', optionRows(facts), style),
    '',
    ...commandLines(command, style),
  ];
}
