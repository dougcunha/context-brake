export type Tone = 'plain' | 'title' | 'accent' | 'good' | 'muted' | 'warn' | 'bad';

export type Glyphs = { readonly top: string; readonly rail: string; readonly bottom: string };
export type Style = { readonly paint: (tone: Tone, text: string) => string; readonly glyphs: Glyphs };
export type StyleOptions = { readonly color: boolean; readonly unicode: boolean };
export type StyleEnvironment = { readonly env: NodeJS.ProcessEnv; readonly platform: NodeJS.Platform; readonly isTty: boolean };

const ESCAPE = String.fromCharCode(27);
const RESET = `${ESCAPE}[0m`;
const DUMB_TERMINAL = 'dumb';
const LINUX_CONSOLE = 'linux';
const UNICODE_GLYPHS: Glyphs = { top: '┌─', rail: '│', bottom: '└─' };
const ASCII_GLYPHS: Glyphs = { top: '+-', rail: '|', bottom: '+-' };
const SGR_CODES: Record<Tone, string> = { plain: '', title: '1;36', accent: '36', good: '32', muted: '2', warn: '33', bad: '31' };
const UNICODE_WINDOWS_SIGNALS: readonly string[] = ['WT_SESSION', 'WT_PROFILE_ID', 'TERM_PROGRAM', 'COLORTERM', 'TERM', 'ConEmuTask', 'TERMINUS_SUBLIME'];

function colorize(tone: Tone, text: string): string {
  return SGR_CODES[tone] === '' ? text : `${ESCAPE}[${SGR_CODES[tone]}m${text}${RESET}`;
}

export function createStyle(options: StyleOptions): Style {
  const glyphs = options.unicode ? UNICODE_GLYPHS : ASCII_GLYPHS;
  return { paint: (tone, text) => (options.color ? colorize(tone, text) : text), glyphs };
}

export const PLAIN_STYLE: Style = createStyle({ color: false, unicode: true });

function isUnicodeTerminal({ env, platform }: StyleEnvironment): boolean {
  if (platform !== 'win32') return env.TERM !== LINUX_CONSOLE;
  return UNICODE_WINDOWS_SIGNALS.some((name) => (env[name] ?? '') !== '');
}

function isColorTerminal({ env, isTty }: StyleEnvironment): boolean {
  return isTty && (env.NO_COLOR ?? '') === '' && env.TERM !== DUMB_TERMINAL;
}

export function detectStyle(environment: StyleEnvironment): Style {
  return createStyle({ color: isColorTerminal(environment), unicode: isUnicodeTerminal(environment) });
}
