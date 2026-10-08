const BARE_VALUE = /^[A-Za-z0-9_@%+=:,./-]+$/;
const COMMAND_PREFIX = 'context-brake init';

type Quote = (value: string) => string;

function quotePosix(value: string): string {
  return BARE_VALUE.test(value) ? value : `'${value.replace(/'/g, "'\\''")}'`;
}

function quotePowerShell(value: string): string {
  return BARE_VALUE.test(value) ? value : `'${value.replace(/'/g, "''")}'`;
}

function build(flags: readonly string[], quote: Quote): string {
  return [COMMAND_PREFIX, ...flags.map(quote)].join(' ');
}

export function formatEquivalentCommand(flags: readonly string[]): readonly string[] {
  if (!flags.some((flag) => flag.includes("'"))) return [build(flags, quotePosix)];
  return [`POSIX shells: ${build(flags, quotePosix)}`, `PowerShell: ${build(flags, quotePowerShell)}`];
}
