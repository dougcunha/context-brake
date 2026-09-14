import { parseTree, printParseErrorCode, type Node, type ParseError } from 'jsonc-parser';

export class InvalidJsonDocumentError extends Error {
  constructor(readonly issue: string, readonly filePath?: string) {
    super(filePath ? `Invalid JSON document in ${filePath}: ${issue}` : `Invalid JSON document: ${issue}`);
    this.name = 'InvalidJsonDocumentError';
  }
}

export function findDuplicateKeys(node: Node): string[] {
  const duplicates: string[] = [];
  function walk(current: Node): void {
    if (current.type === 'object' && current.children) {
      const seen = new Set<string>();
      for (const prop of current.children) {
        if (prop.type === 'property' && prop.children?.[0]) {
          const key = String(prop.children[0].value);
          if (seen.has(key)) {
            duplicates.push(key);
          } else {
            seen.add(key);
          }
        }
      }
    }
    if (current.children) {
      for (const child of current.children) {
        walk(child);
      }
    }
  }
  walk(node);
  return duplicates;
}

export function validateJsonDocument(text: string): { valid: boolean; errors: string[]; duplicateKeys: string[] } {
  const parseErrors: ParseError[] = [];
  const root = parseTree(text, parseErrors, { disallowComments: false });
  const errorMessages = parseErrors.map((err) => `${printParseErrorCode(err.error)} at offset ${err.offset}`);
  if (!root) {
    const emptyErr = errorMessages.length > 0 ? errorMessages : ['Empty or invalid JSON document'];
    return { valid: false, errors: emptyErr, duplicateKeys: [] };
  }
  const duplicates = findDuplicateKeys(root);
  const isValid = parseErrors.length === 0 && duplicates.length === 0;
  return { valid: isValid, errors: errorMessages, duplicateKeys: duplicates };
}

export function parseAndValidateJson(text: string, filePath?: string): Node {
  const result = validateJsonDocument(text);
  if (!result.valid) {
    const detail = result.duplicateKeys.length > 0 ? `Duplicate key: ${result.duplicateKeys.join(', ')}` : result.errors.join('; ');
    throw new InvalidJsonDocumentError(detail, filePath);
  }
  const root = parseTree(text, [], { disallowComments: false });
  if (!root) {
    throw new InvalidJsonDocumentError('Root node not found', filePath);
  }
  return root;
}
