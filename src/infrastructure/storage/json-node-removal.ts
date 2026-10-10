import type { Node } from 'jsonc-parser';
import { findLineEndAfter, findSeparatorComma } from './json-span-utils.js';

type NodeSpan = { start: number; end: number; lineStart: number; lineEnd: number };
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
function commaBeforeNext(text: string, node: Node): number {
  const context = siblingContext(node);
  const next = context?.list[context.index + 1];
  return next ? findSeparatorComma(text, node.offset + node.length, next.offset) : -1;
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
  const comma = !ownLine || isLastChild(node) ? commaAfterPrevious(text, node) : -1;
  const cut = ownLine ? span.lineStart : span.start;
  if (comma === -1) return `${text.slice(0, cut)}${after}`;
  return `${text.slice(0, comma)}${text.slice(comma + 1, cut)}${after}`;
}
function removeBeforeComma(text: string, node: Node, span: NodeSpan): string {
  const before = text.slice(0, span.start);
  const leadingComma = before.match(/,\s*$/);
  if (leadingComma?.index !== undefined) return `${before.slice(0, leadingComma.index)}${text.slice(span.end)}`;
  const comma = commaBeforeNext(text, node);
  if (comma === -1) return `${before}${text.slice(span.end)}`;
  return `${before}${text.slice(span.end, comma)}${text.slice(comma + 1)}`;
}
export function removeNodeSpan(text: string, node: Node): string {
  const start = node.offset;
  const end = start + node.length;
  const lineStart = text.lastIndexOf('\n', start) + 1;
  const span: NodeSpan = { start, end, lineStart, lineEnd: findLineEndAfter(text, end) };
  if (isOnlyNodeOnLine(text, span)) return removeLastNode(text, node, span);
  const trailingComma = text.slice(end).match(/^\s*,/);
  if (trailingComma) return `${text.slice(0, start)}${text.slice(end + trailingComma[0].length)}`;
  if (isLastChild(node)) return removeLastNode(text, node, span);
  return removeBeforeComma(text, node, span);
}
