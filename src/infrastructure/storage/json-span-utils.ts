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
  const lead = gap.match(/^\s*/)?.[0] ?? '';
  const hasComma = gap.startsWith(',', lead.length);
  const head = hasComma ? `${text.slice(0, lastEnd)}${gap.slice(0, lead.length + 1)}` : `${text.slice(0, lastEnd)},`;
  const tail = hasComma ? gap.slice(lead.length + 1) : gap;
  const separator = compact ? '' : `${detectEol(text)}${opts.indent.repeat(opts.depth)}`;
  return `${head}${separator}${opts.item}${tail}${text.slice(closePos)}`;
}

export function insertObjectEntry(text: string, parentNode: Node, opts: InsertEntryOptions): string {
  return insertIntoContainer(text, parentNode, { item: `${JSON.stringify(opts.key)}: ${opts.formattedVal}`, indent: opts.indent, depth: opts.depth });
}

export function insertArrayItem(text: string, arrayNode: Node, opts: InsertItemOptions): string {
  return insertIntoContainer(text, arrayNode, { item: opts.formattedVal, indent: opts.indent, depth: opts.depth });
}

export function removeNodeSpan(text: string, node: Node): string {
  const start = node.offset;
  const end = node.offset + node.length;
  const lineStart = text.lastIndexOf('\n', start) + 1;
  const lineEnd = findLineEndAfter(text, end);
  const slice = text.slice(lineStart, lineEnd);
  const isOnlyNodeOnLine = slice.trim().startsWith(text.slice(start, start + 5));
  if (isOnlyNodeOnLine) {
    let before = text.slice(0, lineStart);
    const after = text.slice(lineEnd);
    if (/^\s*[\]}]/.test(after)) {
      const match = before.match(/,([ \t]*\r?\n?)$/);
      if (match?.index !== undefined) {
        before = `${before.slice(0, match.index)}${match[1]}`;
      }
    }
    return `${before}${after}`;
  }
  const after = text.slice(end);
  const trailingComma = after.match(/^\s*,/);
  if (trailingComma) return `${text.slice(0, start)}${after.slice(trailingComma[0].length)}`;
  const before = text.slice(0, start);
  const leadingComma = before.match(/,\s*$/);
  if (leadingComma?.index !== undefined) return `${before.slice(0, leadingComma.index)}${after}`;
  return `${before}${after}`;
}
