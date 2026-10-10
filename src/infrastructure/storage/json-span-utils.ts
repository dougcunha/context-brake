import type { Node } from 'jsonc-parser';

export type FormatOptions = { indent: string; eol: string; depth: number };
export type InsertEntryOptions = { key: string; formattedVal: string; indent: string; depth: number };
export type InsertItemOptions = { formattedVal: string; indent: string; depth: number };
export function detectEol(text: string): string {
  return text.includes('\r\n') ? '\r\n' : '\n';
}
export function detectIndent(text: string): string {
  const match = text.match(/\n([ \t]+)[^\s]/);
  return match?.[1] ?? '';
}
export function findLineEndAfter(text: string, offset: number): number {
  const newline = text.indexOf('\n', offset);
  return newline === -1 ? text.length : newline + 1;
}
export function formatJsonValue(value: unknown, opts: FormatOptions): string {
  const raw = JSON.stringify(value, null, opts.indent);
  if (!raw.includes('\n')) return raw;
  const prefix = opts.indent.repeat(opts.depth);
  return raw.split('\n').map((line, idx) => (idx === 0 ? line : `${prefix}${line}`)).join(opts.eol);
}
export function findSeparatorComma(text: string, from: number, to: number): number {
  let index = from;
  while (index < to) {
    if (text.startsWith('//', index)) index = findLineEndAfter(text, index + 2);
    else if (text.startsWith('/*', index)) {
      const close = text.indexOf('*/', index + 2);
      index = close === -1 ? to : close + 2;
    } else if (text[index] === ',') return index;
    else index += 1;
  }
  return -1;
}
function insertIntoContainer(text: string, container: Node, opts: { item: string; indent: string; depth: number }): string {
  const compact = !text.includes('\n');
  if (!container.children || container.children.length === 0) {
    const pos = container.offset + 1;
    const inner = compact ? opts.item : `${detectEol(text)}${opts.indent.repeat(opts.depth)}${opts.item}${detectEol(text)}${opts.indent.repeat(opts.depth - 1)}`;
    return `${text.slice(0, pos)}${inner}${text.slice(pos)}`;
  }
  const last = container.children[container.children.length - 1]!;
  const lastEnd = last.offset + last.length;
  const closePos = container.offset + container.length - 1;
  const gap = text.slice(lastEnd, closePos);
  const closing = gap.match(/\s*$/)?.[0] ?? '';
  const trivia = gap.slice(0, gap.length - closing.length);
  const comma = findSeparatorComma(text, lastEnd, closePos) === -1 ? ',' : '';
  const separator = compact ? '' : `${detectEol(text)}${opts.indent.repeat(opts.depth)}`;
  return `${text.slice(0, lastEnd)}${comma}${trivia}${separator}${opts.item}${closing}${text.slice(closePos)}`;
}
export function insertObjectEntry(text: string, parentNode: Node, opts: InsertEntryOptions): string {
  return insertIntoContainer(text, parentNode, { item: `${JSON.stringify(opts.key)}: ${opts.formattedVal}`, indent: opts.indent, depth: opts.depth });
}
export function insertArrayItem(text: string, arrayNode: Node, opts: InsertItemOptions): string {
  return insertIntoContainer(text, arrayNode, { item: opts.formattedVal, indent: opts.indent, depth: opts.depth });
}
