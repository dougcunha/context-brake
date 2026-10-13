export type Frontmatter = { readonly name: string | null; readonly description: string };

const DELIMITER = '---';
const BYTE_ORDER_MARK = '﻿';
const KEY_LINE = /^(name|description):\s*(.*)$/;
const BLOCK_SCALAR = /^[>|]/;
const QUOTED = /^(["'])(.*)\1$/;

function scalar(raw: string): string {
  const value = raw.trim();
  if (BLOCK_SCALAR.test(value)) return '';
  return value.replace(QUOTED, '$2');
}

export function parseFrontmatter(text: string): Frontmatter {
  const lines = text.replace(BYTE_ORDER_MARK, '').split(/\r?\n/);
  const fields = { name: '', description: '' };
  if (lines[0]?.trim() !== DELIMITER) return { name: null, description: '' };
  for (const line of lines.slice(1)) {
    if (line.trim() === DELIMITER) break;
    const match = KEY_LINE.exec(line);
    if (match?.[1] === 'name' || match?.[1] === 'description') fields[match[1]] = scalar(match[2] ?? '');
  }
  return { name: fields.name === '' ? null : fields.name, description: fields.description };
}
