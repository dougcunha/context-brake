import { findNodeAtLocation, getNodeValue } from 'jsonc-parser';
import { parseAndValidateJson, removeJsonArrayItem, removeJsonProperty } from '../../storage/json-document-editor.js';

export type OwnedHandlerPredicate = (handler: unknown) => boolean;

function groupHandlers(item: unknown): unknown[] | null {
  if (typeof item !== 'object' || item === null) return null;
  const handlers = (item as { hooks?: unknown }).hooks;
  return Array.isArray(handlers) ? handlers : null;
}

function isRemovableItem(item: unknown, isOwned: OwnedHandlerPredicate): boolean {
  const handlers = groupHandlers(item);
  if (handlers === null) return isOwned(item);
  return handlers.length > 0 && handlers.every(isOwned);
}

function hasOwnedHandler(item: unknown, isOwned: OwnedHandlerPredicate): boolean {
  const handlers = groupHandlers(item);
  if (handlers === null) return isOwned(item);
  return handlers.some(isOwned);
}

function readEventItems(text: string, event: string): unknown[] {
  const node = findNodeAtLocation(parseAndValidateJson(text), ['hooks', event]);
  const value = node ? getNodeValue(node) : undefined;
  return Array.isArray(value) ? value : [];
}

function removeRepeatedly(text: string, remove: (current: string) => string): string {
  const next = remove(text);
  return next === text ? text : removeRepeatedly(next, remove);
}

export function removeOwnedFromEvent(text: string, event: string, isOwned: OwnedHandlerPredicate): string {
  const path = ['hooks', event];
  const withoutGroups = removeRepeatedly(text, (current) => removeJsonArrayItem(current, path, (item) => isRemovableItem(item, isOwned)));
  const remaining = readEventItems(withoutGroups, event).length;
  let cleaned = withoutGroups;
  for (let index = 0; index < remaining; index++) {
    cleaned = removeRepeatedly(cleaned, (current) => removeJsonArrayItem(current, [...path, index, 'hooks'], isOwned));
  }
  return remaining === 0 ? removeJsonProperty(cleaned, path) : cleaned;
}

export function removeOwnedFromOtherEvents(text: string, currentEvents: readonly string[], isOwned: OwnedHandlerPredicate): string {
  const hooksNode = findNodeAtLocation(parseAndValidateJson(text), ['hooks']);
  const hooks = hooksNode ? getNodeValue(hooksNode) : undefined;
  if (typeof hooks !== 'object' || hooks === null || Array.isArray(hooks)) return text;
  const retired = Object.keys(hooks).filter((event) => !currentEvents.includes(event));
  return retired.reduce((acc, event) => {
    const isOwnedHere = readEventItems(acc, event).some((item) => hasOwnedHandler(item, isOwned));
    return isOwnedHere ? removeOwnedFromEvent(acc, event, isOwned) : acc;
  }, text);
}
