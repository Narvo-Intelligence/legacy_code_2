import type { Story } from '../types/story';

export type Validator<T> = (value: unknown) => value is T;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function hasStringId(value: unknown): value is { id: string } {
  return isRecord(value) && isString(value.id);
}

export function isStory(value: unknown): value is Story {
  return hasStringId(value);
}

export function asRecord<T extends Record<string, unknown>>(value: unknown, fallback: T): T {
  return isRecord(value) ? (value as T) : fallback;
}

export function asArray<T>(value: unknown, guard: Validator<T>, fallback: T[] = []): T[] {
  if (!Array.isArray(value)) return fallback;
  return value.filter(guard);
}

