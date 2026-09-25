const SEGMENT_SEPARATOR = '/';
const GLOBSTAR = '**';
const TRAVERSAL_SEGMENTS: ReadonlySet<string> = new Set(['.', '..']);

export function matchesPathPattern(path: string, pattern: string): boolean {
  const pathSegments = path.split(SEGMENT_SEPARATOR);
  if (pathSegments.some((segment) => TRAVERSAL_SEGMENTS.has(segment) || segment === '')) return false;
  return matchSegments(pathSegments, pattern.split(SEGMENT_SEPARATOR));
}
export function matchesAnyPathPattern(path: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => matchesPathPattern(path, pattern));
}
function matchSegments(path: readonly string[], pattern: readonly string[]): boolean {
  const [head, ...rest] = pattern;
  if (head === undefined) return path.length === 0;
  if (head === GLOBSTAR) return path.some((_, index) => matchSegments(path.slice(index), rest)) || matchSegments([], rest);
  const [segment, ...remaining] = path;
  if (segment === undefined || !segmentPattern(head).test(segment)) return false;
  return matchSegments(remaining, rest);
}
function segmentPattern(pattern: string): RegExp {
  const source = [...pattern].map(segmentToken).join('');
  return new RegExp(`^${source}$`);
}
function segmentToken(character: string): string {
  if (character === '*') return '[^/]*';
  if (character === '?') return '[^/]';
  return character.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}
