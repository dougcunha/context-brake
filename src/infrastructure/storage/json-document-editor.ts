import { findNodeAtLocation, getNodeValue } from 'jsonc-parser';
import { parseAndValidateJson } from './json-validator.js';
import { detectEol, detectIndent, formatJsonValue, insertArrayItem, insertObjectEntry, removeNodeSpan } from './json-span-utils.js';

export { InvalidJsonDocumentError, validateJsonDocument, parseAndValidateJson } from './json-validator.js';

export function setJsonProperty(text: string, path: readonly string[], value: unknown): string {
  const root = parseAndValidateJson(text);
  const indent = detectIndent(text);
  const eol = detectEol(text);
  const format = text.includes('\n') ? indent : '';
  const existingNode = findNodeAtLocation(root, path as string[]);
  if (existingNode) {
    const formatted = formatJsonValue(value, { indent: format, eol, depth: path.length });
    return `${text.slice(0, existingNode.offset)}${formatted}${text.slice(existingNode.offset + existingNode.length)}`;
  }
  const parentPath = path.slice(0, -1);
  const key = path[path.length - 1]!;
  const parentNode = parentPath.length === 0 ? root : findNodeAtLocation(root, parentPath as string[]);
  if (!parentNode) {
    return setJsonProperty(text, parentPath, { [key]: value });
  }
  const formattedVal = formatJsonValue(value, { indent: format, eol, depth: path.length });
  return insertObjectEntry(text, parentNode, { key, formattedVal, indent: format, depth: path.length });
}

export function appendJsonArrayItem(text: string, path: readonly string[], value: unknown): string {
  const root = parseAndValidateJson(text);
  const arrayNode = findNodeAtLocation(root, path as string[]);
  if (!arrayNode) {
    return setJsonProperty(text, path, [value]);
  }
  const indent = detectIndent(text);
  const eol = detectEol(text);
  const format = text.includes('\n') ? indent : '';
  const formattedVal = formatJsonValue(value, { indent: format, eol, depth: path.length + 1 });
  return insertArrayItem(text, arrayNode, { formattedVal, indent: format, depth: path.length + 1 });
}

export function removeJsonProperty(text: string, path: readonly string[]): string {
  const root = parseAndValidateJson(text);
  const node = findNodeAtLocation(root, path as string[]);
  if (!node || !node.parent || node.parent.type !== 'property') return text;
  return removeNodeSpan(text, node.parent);
}

export function removeJsonArrayItem(text: string, path: readonly string[], predicate: (item: unknown) => boolean): string {
  const root = parseAndValidateJson(text);
  const arrayNode = findNodeAtLocation(root, path as string[]);
  if (!arrayNode || !arrayNode.children) return text;
  const target = arrayNode.children.find((child) => predicate(getNodeValue(child)));
  if (!target) return text;
  return removeNodeSpan(text, target);
}
