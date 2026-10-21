const THOUSANDS_BOUNDARY = /\B(?=(\d{3})+(?!\d))/g;
const THOUSANDS_SEPARATOR = ',';

export function formatTokens(tokens: number): string {
  return String(tokens).replace(THOUSANDS_BOUNDARY, THOUSANDS_SEPARATOR);
}
