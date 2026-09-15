import type { Node } from 'jsonc-parser';

export type FormatOptions = { indent: string; eol: string; depth: number };
export type InsertEntryOptions = { key: string; formattedVal: string; indent: string; depth: number };
export type InsertItemOptions = { formattedVal: string; indent: string; depth: number };
type NodeSpan = { start: number; end: number; lineStart: number; lineEnd: number };
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
function findSeparatorComma(text: string, from: number, to: number): number {
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
function siblingContext(node: Node): { list: readonly Node[]; index: number } | undefined {
  const list = node.parent?.children;
  return list ? { list, index: list.indexOf(node) } : undefined;
}
function commaAfterPrevious(text: string, node: Node): number {
  const context = siblingContext(node);
  if (!context || context.index <= 0) return -1;
  const previous = context.list[context.index - 1]!;
  return findSeparatorComma(text, previous.offset + previous.length, node.offset);
}
function isLastChild(node: Node): boolean {
  const context = siblingContext(node);
  return context === undefined || context.index === context.list.length - 1;
}
function isOnlyNodeOnLine(text: string, span: NodeSpan): boolean {
  const leading = text.slice(span.lineStart, span.start);
  return /^\s*$/.test(leading) && /^[ \t]*,?[ \t]*\r?\n?$/.test(text.slice(span.end, span.lineEnd));
}
function removeLastNode(text: string, node: Node, span: NodeSpan): string {
  const ownLine = isOnlyNodeOnLine(text, span);
  const after = text.slice(ownLine ? span.lineEnd : span.end);
  const comma = !ownLine || /^\s*[\]}]/.test(after) ? commaAfterPrevious(text, node) : -1;
  const cut = ownLine ? span.lineStart : span.start;
  if (comma === -1) return `${text.slice(0, cut)}${after}`;
  return `${text.slice(0, comma)}${text.slice(comma + 1, cut)}${after}`;
}
export function removeNodeSpan(text: string, node: Node): string {
  const start = node.offset;
  const end = start + node.length;
  const lineStart = text.lastIndexOf('\n', start) + 1;
  const span: NodeSpan = { start, end, lineStart, lineEnd: findLineEndAfter(text, end) };
  if (isOnlyNodeOnLine(text, span)) return removeLastNode(text, node, span);
  const after = text.slice(end);
  const trailingComma = after.match(/^\s*,/);
  if (trailingComma) return `${text.slice(0, start)}${after.slice(trailingComma[0].length)}`;
  if (isLastChild(node)) return removeLastNode(text, node, span);
  const before = text.slice(0, start);
  const leadingComma = before.match(/,\s*$/);
  if (leadingComma?.index !== undefined) return `${before.slice(0, leadingComma.index)}${after}`;
  return `${before}${after}`;
}
