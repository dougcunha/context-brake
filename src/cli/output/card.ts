import type { Style, Tone } from './style.js';

export type CardRow = { readonly label: string; readonly value: string; readonly tone?: Tone; readonly notes?: readonly string[] };

const COLUMN_GAP = '  ';
const NOTE_WIDTH = 76;

function wrapWords(text: string, width: number): string[] {
  const lines: string[] = [];
  for (const word of text.split(' ')) {
    const last = lines.at(-1);
    if (last !== undefined && last.length + 1 + word.length <= width) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

function railed(style: Style, content: string): string {
  return `${style.paint('muted', style.glyphs.rail)}${COLUMN_GAP}${content}`;
}

function renderRow(row: CardRow, labelWidth: number, style: Style): string[] {
  const label = style.paint('muted', row.label.padEnd(labelWidth));
  const notes = (row.notes ?? []).flatMap((note) => wrapWords(note, NOTE_WIDTH));
  const noteLines = notes.map((note) => railed(style, `${' '.repeat(labelWidth)}${COLUMN_GAP}${style.paint('muted', note)}`));
  return [railed(style, `${label}${COLUMN_GAP}${style.paint(row.tone ?? 'plain', row.value)}`), ...noteLines];
}

export function renderCard(title: string, rows: readonly CardRow[], style: Style): string[] {
  const labelWidth = Math.max(...rows.map((row) => row.label.length));
  return [
    `${style.paint('muted', style.glyphs.top)} ${style.paint('title', title)}`,
    ...rows.flatMap((row) => renderRow(row, labelWidth, style)),
    style.paint('muted', style.glyphs.bottom),
  ];
}
