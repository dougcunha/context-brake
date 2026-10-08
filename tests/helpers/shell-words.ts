export function splitWords(command: string, escapedQuote: string): string[] {
  const words: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < command.length; index += 1) {
    if (command.startsWith(escapedQuote, index) && quoted) { current += "'"; index += escapedQuote.length - 1; continue; }
    if (command[index] === "'") { quoted = !quoted; continue; }
    if (command[index] === ' ' && !quoted) { if (current !== '') words.push(current); current = ''; continue; }
    current += command[index];
  }
  return current === '' ? words : [...words, current];
}
