/**
 * Lightweight analytics hook (doc 08 §7.8). Enable with
 * `NEXT_PUBLIC_NARVO_ANALYTICS_ENABLED=true` — logs in dev; extend with Mixpanel etc. when product wires scripts.
 */
export function narvoTrack(event: string, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  if (process.env.NEXT_PUBLIC_NARVO_ANALYTICS_ENABLED !== 'true') return;
  if (process.env.NODE_ENV === 'development') {
    console.info('[narvo analytics]', event, props ?? {});
  }
}
