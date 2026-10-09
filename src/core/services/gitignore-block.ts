export const BLOCK_START = '# >>> context-brake (managed by `context-brake init`; do not edit) >>>';
export const BLOCK_END = '# <<< context-brake <<<';
export const MALFORMED_MARKERS_MESSAGE = 'The context-brake block in .gitignore has a missing, repeated, or misplaced marker, so it was left untouched.';

export type BlockResult = { readonly content: string | null } | { readonly error: string };
type Span = { readonly start: number; readonly end: number };
type Located = { readonly span: Span | null } | { readonly error: string };

const START_PATTERN = /^# >>> context-brake[^\r\n]*$/gm;
const END_PATTERN = /^# <<< context-brake[^\r\n]*$/gm;
const TRAILING_BREAK = /\r?\n$/;
const TWO_TRAILING_BREAKS = /(\r?\n){2}$/;
const LEADING_BREAK = /^\r?\n/;

function lineEnding(text: string): string {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

function matches(pattern: RegExp, text: string): RegExpMatchArray[] {
  return [...text.matchAll(pattern)];
}

function locate(text: string): Located {
  const starts = matches(START_PATTERN, text);
  const ends = matches(END_PATTERN, text);
  if (starts.length === 0 && ends.length === 0) return { span: null };
  const first = starts[0];
  const last = ends[0];
  if (starts.length !== 1 || ends.length !== 1 || first === undefined || last === undefined || (last.index ?? 0) < (first.index ?? 0)) return { error: MALFORMED_MARKERS_MESSAGE };
  return { span: { start: first.index ?? 0, end: (last.index ?? 0) + last[0].length } };
}

function blockText(lines: readonly string[], eol: string): string {
  return [BLOCK_START, ...lines, BLOCK_END].join(eol);
}

function appended(content: string | null, block: string, eol: string): string {
  if (content === null || content === '') return `${block}${eol}`;
  const closed = TRAILING_BREAK.test(content) ? content : `${content}${eol}`;
  return `${closed}${eol}${block}${eol}`;
}

export function removeIgnoreBlock(content: string | null): BlockResult {
  if (content === null) return { content: null };
  const located = locate(content);
  if ('error' in located) return located;
  if (located.span === null) return { content };
  const head = content.slice(0, located.span.start);
  const tail = content.slice(located.span.end).replace(LEADING_BREAK, '');
  const joined = `${TWO_TRAILING_BREAKS.test(head) ? head.replace(TRAILING_BREAK, '') : head}${tail}`;
  return { content: joined === '' ? null : joined };
}

export function applyIgnoreBlock(content: string | null, lines: readonly string[]): BlockResult {
  if (lines.length === 0) return removeIgnoreBlock(content);
  const eol = lineEnding(content ?? '');
  const block = blockText(lines, eol);
  if (content === null) return { content: appended(null, block, eol) };
  const located = locate(content);
  if ('error' in located) return located;
  if (located.span === null) return { content: appended(content, block, eol) };
  return { content: `${content.slice(0, located.span.start)}${block}${content.slice(located.span.end)}` };
}
