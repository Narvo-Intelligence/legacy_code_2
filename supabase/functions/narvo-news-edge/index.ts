// Narvo News Edge — Regional caching for Nigerian edge.
// Proxies GET /api/news to the backend; run at Supabase edge for lower TTFB in West Africa.
// Set BACKEND_URL in Supabase Edge Function secrets (e.g. https://api.narvo.news).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const CACHE_CONTROL = "public, s-maxage=120, stale-while-revalidate=60";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  const backendUrl = Deno.env.get("BACKEND_URL");
  if (!backendUrl) {
    return new Response(
      JSON.stringify({ error: "Edge function not configured: BACKEND_URL missing" }),
      { status: 503, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }

  const url = new URL(req.url);
  const query = url.searchParams.toString();
  const target = `${backendUrl.replace(/\/$/, "")}/api/news${query ? `?${query}` : ""}`;

  const UPSTREAM_TIMEOUT_MS = 12_000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    const res = await fetch(target, {
      headers: {
        Accept: "application/json",
        ...(req.headers.get("Authorization") ? { Authorization: req.headers.get("Authorization")! } : {}),
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const body = await res.text();
    const contentType = res.headers.get("Content-Type") || "application/json";
    if (res.status >= 500) {
      return new Response(
        body || JSON.stringify({ error: "Backend error", status: res.status }),
        {
          status: 502,
          headers: { "Content-Type": contentType, "Cache-Control": CACHE_CONTROL, ...CORS_HEADERS },
        }
      );
    }
    return new Response(body, {
      status: res.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": CACHE_CONTROL,
        ...CORS_HEADERS,
      },
    });
  } catch (e) {
    const isTimeout = e instanceof Error && e.name === "AbortError";
    return new Response(
      JSON.stringify({
        error: isTimeout ? "Upstream timeout" : "Upstream request failed",
        detail: String(e),
      }),
      {
        status: isTimeout ? 504 : 502,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      }
    );
  }
});
