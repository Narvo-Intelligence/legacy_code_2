declare module 'jest-axe' {
  export function axe(container: Element | Document, options?: unknown): Promise<{ violations: unknown[] }>;
  export function toHaveNoViolations(results: { violations: unknown[] }): { message: () => string; pass: boolean };
}
