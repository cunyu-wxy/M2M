import { AppleError, createAppleWebDeveloperToken, hasAppleCredentials, hasAppleSigningCredentials } from "./apple.js";
import { AppleCatalogService, normalizeCatalogRequest } from "./apple-catalog.js";
import { renderAppHtml } from "./frontend.js";
import { PlaylistError, SUPPORTED_SOURCES, extractPlaylist, isPlaylistError } from "./playlist.js";
import { GIT_SHA } from "../dist/version.js";
export { QueueCoordinator } from "./queue.js";

const corsBaseHeaders = {
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin"
};

const securityHeaders = {
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff"
};

let localCatalogService;

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      const preflightHeaders = corsHeadersFor(request, env);
      return new Response(null, {
        status: preflightHeaders ? 204 : 403,
        headers: preflightHeaders || securityHeaders
      });
    }

    try {
      const requestUrl = new URL(request.url);

      if (requestUrl.pathname === "/" && request.method === "GET") {
        return htmlResponse(renderAppHtml(), 200, request, env);
      }

      if (requestUrl.pathname === "/health") {
        return jsonResponse({
          ok: true,
          version: {
            gitSha: GIT_SHA,
            workerVersionId: /^[a-f0-9-]{36}$/i.test(env?.CF_VERSION_METADATA?.id || "") ? env.CF_VERSION_METADATA.id : null
          },
          endpoints: [
            "/queue/join",
            "/queue/status",
            "/queue/heartbeat",
            "/queue/leave",
            "/playlist",
            "/playlist/stream",
            "/netease/playlist",
            "/netease/playlist/stream",
            "/apple/developer-token",
            "/apple/catalog"
          ],
          supportedSources: SUPPORTED_SOURCES,
          appleConfigured: hasAppleSigningCredentials(env) && hasQueueBinding(env),
          appleCatalogConfigured: hasAppleCredentials(env),
          queueConfigured: hasQueueBinding(env)
        }, 200, request, env);
      }

      if (requestUrl.pathname.startsWith("/queue/")) {
        return withResponseHeaders(await handleQueue(request, env, requestUrl), request, env);
      }

      if (requestUrl.pathname === "/playlist" || requestUrl.pathname === "/netease/playlist") {
        return await handlePlaylist(request, env, requestUrl);
      }

      if (
        requestUrl.pathname === "/playlist/stream" ||
        requestUrl.pathname === "/netease/playlist/stream"
      ) {
        return await handlePlaylistStream(request, env, requestUrl);
      }

      if (requestUrl.pathname === "/apple/developer-token") {
        return await handleAppleDeveloperToken(request, env);
      }

      if (requestUrl.pathname === "/apple/catalog") {
        return await handleAppleCatalog(request, env);
      }

      return jsonResponse(
        { error: { code: "not_found", message: "Route not found." } },
        404,
        request,
        env
      );
    } catch (error) {
      return errorResponse(error, request, env);
    }
  }
};

async function handlePlaylist(request, env, requestUrl) {
  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse(
      { error: { code: "method_not_allowed", message: "Use GET or POST." } },
      405,
      request,
      env
    );
  }

  const payload = request.method === "POST" ? await readJsonBody(request) : {};
  const sourceUrl = payload.url || requestUrl.searchParams.get("url");
  const limit = parseOptionalInteger(payload.limit || requestUrl.searchParams.get("limit"));

  if (!sourceUrl) {
    return jsonResponse(
      { error: { code: "missing_url", message: "Missing playlist URL." } },
      400,
      request,
      env
    );
  }

  await requireActiveQueueSlot(env, {
    ticketId: payload.ticketId || requestUrl.searchParams.get("ticketId"),
    clientId: payload.clientId || requestUrl.searchParams.get("clientId"),
    progress: 2,
    statusText: "准备解析歌单"
  });

  const result = await extractPlaylist(sourceUrl, {
    limit,
    maxTracks:
      parseOptionalInteger(env.PLAYLIST_MAX_TRACKS) || parseOptionalInteger(env.NETEASE_MAX_TRACKS) || 2000,
    batchSize: parseOptionalInteger(env.NETEASE_BATCH_SIZE) || 200
  });

  return jsonResponse(result, 200, request, env);
}

async function handlePlaylistStream(request, env, requestUrl) {
  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse(
      { error: { code: "method_not_allowed", message: "Use GET or POST." } },
      405,
      request,
      env
    );
  }

  const payload = request.method === "POST" ? await readJsonBody(request) : {};
  const sourceUrl = payload.url || requestUrl.searchParams.get("url");
  const limit = parseOptionalInteger(payload.limit || requestUrl.searchParams.get("limit"));
  await requireActiveQueueSlot(env, {
    ticketId: payload.ticketId || requestUrl.searchParams.get("ticketId"),
    clientId: payload.clientId || requestUrl.searchParams.get("clientId"),
    progress: 2,
    statusText: "准备解析歌单"
  });
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (eventName, payload) => {
        controller.enqueue(
          encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`)
        );
      };

      (async () => {
        try {
          if (!sourceUrl) {
            throw new PlaylistError(400, "missing_url", "Missing playlist URL.");
          }

          const result = await extractPlaylist(sourceUrl, {
            limit,
            maxTracks:
              parseOptionalInteger(env.PLAYLIST_MAX_TRACKS) ||
              parseOptionalInteger(env.NETEASE_MAX_TRACKS) ||
              2000,
            batchSize: parseOptionalInteger(env.NETEASE_BATCH_SIZE) || 200,
            onProgress: (event) => send("progress", event)
          });
          send("done", result);
        } catch (error) {
          send("app-error", serializeError(error));
        } finally {
          controller.close();
        }
      })();
    }
  });

  return new Response(stream, {
    headers: {
      ...securityHeaders,
      ...(corsHeadersFor(request, env) || {}),
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache"
    }
  });
}

async function handleQueue(request, env, requestUrl) {
  if (!["/queue/join", "/queue/status", "/queue/heartbeat", "/queue/leave"].includes(requestUrl.pathname)) {
    throw new PlaylistError(404, "not_found", "Queue route not found.");
  }
  if (!hasQueueBinding(env)) {
    return jsonResponse({
      status: "active",
      queueDisabled: true,
      position: 0,
      ahead: 0,
      etaSeconds: 0,
      activeCount: 0,
      waitingCount: 0,
      maxActive: 0,
      averageSeconds: 0,
      frontProgress: 100,
      activeProgress: []
    }, 200, request, env);
  }

  const queuePath = requestUrl.pathname.replace(/^\/queue/, "") || "/status";
  const queueRequest = new Request("https://m2m-queue.local" + queuePath + requestUrl.search, {
    method: request.method,
    headers: request.headers,
    body: request.method === "GET" || request.method === "HEAD" ? null : request.body
  });
  return queueObject(env).fetch(queueRequest);
}

async function requireActiveQueueSlot(env, payload) {
  if (!hasQueueBinding(env)) {
    return null;
  }

  if (!payload.ticketId || !payload.clientId) {
    throw new PlaylistError(
      429,
      "queue_required",
      "Join the server queue before parsing a playlist."
    );
  }

  const queueStatus = await queueJsonRequest(env, "/heartbeat", payload);
  if (queueStatus.status !== "active") {
    throw new PlaylistError(
      429,
      "queue_waiting",
      "This parse task is still waiting in the server queue.",
      queueStatus
    );
  }

  return queueStatus;
}

async function queueJsonRequest(env, path, payload) {
  const response = await queueObject(env).fetch(
    new Request("https://m2m-queue.local" + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
  );
  return response.json();
}

function queueObject(env) {
  return env.M2M_QUEUE.get(env.M2M_QUEUE.idFromName("global"));
}

function hasQueueBinding(env) {
  return Boolean(env && env.M2M_QUEUE);
}

async function handleAppleDeveloperToken(request, env) {
  if (request.method !== "POST") {
    return jsonResponse(
      { error: { code: "method_not_allowed", message: "Use POST." } },
      405,
      request,
      env
    );
  }

  const requestOrigin = new URL(request.url).origin;
  const origin = env.PUBLIC_ORIGIN?.trim() || requestOrigin;
  let configured;
  try { configured = new URL(origin); } catch { configured = null; }
  if (!configured || configured.origin !== origin || configured.username || configured.password ||
      (configured.protocol !== "https:" && !(configured.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(configured.hostname)))) {
    throw new AppleError(503, "invalid_public_origin", "Configure PUBLIC_ORIGIN as the exact HTTPS site origin.");
  }
  if (request.headers.get("Origin") !== origin || request.headers.get("Sec-Fetch-Site") === "cross-site") {
    throw new AppleError(403, "token_origin_denied", "Request a browser token from this site's own origin.");
  }
  if (request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new AppleError(415, "invalid_content_type", "Use application/json.");
  }
  if (!hasQueueBinding(env)) {
    throw new AppleError(503, "token_limiter_unavailable", "Token issuance requires the shared coordinator.");
  }
  const address = request.headers.get("CF-Connecting-IP") || "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(origin + "|" + address));
  const clientHash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  let allowance;
  try {
    const response = await queueObject(env).fetch(new Request("https://m2m-queue.local/apple/token-limit", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientHash })
    }));
    if (!response.ok) throw new Error("Coordinator unavailable");
    allowance = await response.json();
    if (typeof allowance.allowed !== "boolean") throw new Error("Invalid coordinator response");
  } catch {
    throw new AppleError(503, "token_limiter_unavailable", "Token issuance is temporarily unavailable.");
  }
  if (!allowance.allowed) {
    const response = jsonResponse({ error: { code: "token_rate_limited", message: "Too many token requests. Please try again later." } }, 429, request, env);
    response.headers.set("Retry-After", String(Math.max(1, Math.ceil(allowance.retryAfterMs / 1000))));
    return response;
  }
  try {
    return jsonResponse(await createAppleWebDeveloperToken(env, origin), 200, request, env);
  } catch (error) {
    if (error instanceof AppleError) throw error;
    throw new AppleError(503, "apple_token_signing_failed", "Apple browser token signing is unavailable. Check the site signing configuration.");
  }
}

async function handleAppleCatalog(request, env) {
  if (request.method !== "POST") {
    throw new AppleError(405, "method_not_allowed", "Use POST.");
  }
  if (!request.headers.get("Content-Type")?.includes("application/json")) {
    throw new AppleError(415, "invalid_content_type", "Use application/json.");
  }
  const body = await readCatalogBody(request);
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new AppleError(400, "invalid_json", "Request body must be valid JSON.");
  }
  const normalized = normalizeCatalogRequest(payload);
  if (hasQueueBinding(env)) {
    const response = await queueObject(env).fetch(new Request("https://m2m-queue.local/apple/catalog", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(normalized)
    }));
    const result = withResponseHeaders(response, request, env);
    result.headers.set("Cache-Control", "no-store");
    return result;
  }
  if (!localCatalogService) localCatalogService = new AppleCatalogService(env);
  return jsonResponse(await localCatalogService.request(normalized, { diagnostics: true }), 200, request, env);
}

async function readCatalogBody(request) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let total = 0;
  let body = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 8192) {
        await reader.cancel();
        throw new AppleError(413, "body_too_large", "Catalog request is too large.");
      }
      body += decoder.decode(value, { stream: true });
    }
    return body + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

async function readJsonBody(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return {};
  }

  try {
    return await request.json();
  } catch {
    throw new PlaylistError(400, "invalid_json", "Request body must be valid JSON.");
  }
}

function parseOptionalInteger(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function htmlResponse(body, status = 200, request = null, env = null) {
  return new Response(body, {
    status,
    headers: {
      ...securityHeaders,
      ...(corsHeadersFor(request, env) || {}),
      "Content-Type": "text/html; charset=utf-8"
    }
  });
}

function jsonResponse(body, status = 200, request = null, env = null) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      ...securityHeaders,
      ...(corsHeadersFor(request, env) || {}),
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function errorResponse(error, request = null, env = null) {
  if (isPlaylistError(error) || error instanceof AppleError) {
    return jsonResponse(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details || undefined
        },
        ...(error instanceof AppleError && error.diagnostics ? { diagnostics: error.diagnostics } : {})
      },
      error.status,
      request,
      env
    );
  }

  return jsonResponse(
    {
      error: {
        code: "internal_error",
        message: error && error.message ? error.message : "Internal error."
      }
    },
    500,
    request,
    env
  );
}

function withResponseHeaders(response, request, env) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(securityHeaders)) {
    headers.set(key, value);
  }
  const corsHeaders = corsHeadersFor(request, env);
  if (corsHeaders) {
    for (const [key, value] of Object.entries(corsHeaders)) {
      headers.set(key, value);
    }
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function corsHeadersFor(request, env) {
  if (!request) {
    return null;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return null;
  }

  const requestOrigin = new URL(request.url).origin;
  const configuredOrigin = env && typeof env.PUBLIC_ORIGIN === "string" ? env.PUBLIC_ORIGIN.trim() : "";
  const allowedOrigin = configuredOrigin || requestOrigin;
  if (origin !== requestOrigin && origin !== allowedOrigin) {
    return null;
  }

  return {
    ...corsBaseHeaders,
    "Access-Control-Allow-Origin": origin
  };
}

function serializeError(error) {
  if (isPlaylistError(error) || error instanceof AppleError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details || undefined
    };
  }

  return {
    code: "internal_error",
    message: error && error.message ? error.message : "Internal error."
  };
}
