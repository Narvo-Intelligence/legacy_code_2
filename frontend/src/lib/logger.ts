/**
 * Small logger wrapper. In production, only warn and error are emitted;
 * debug and info are no-op to keep the console clean.
 */

const isProd = import.meta.env.PROD;

function noop(): void {}

export const logger = {
  debug: isProd ? noop : (...args: unknown[]) => console.log(...args),
  info: isProd ? noop : (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export default logger;
