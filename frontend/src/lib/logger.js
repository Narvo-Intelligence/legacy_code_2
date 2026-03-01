/**
 * Small logger wrapper. In production, only warn and error are emitted;
 * debug and info are no-op to keep the console clean. Same messages and conditions as console.*.
 */
const isProd = import.meta.env.PROD;

function noop() {}

export const logger = {
  debug: isProd ? noop : (...args) => console.log(...args),
  info: isProd ? noop : (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

export default logger;
