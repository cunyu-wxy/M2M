import { AppleError, createAppleDeveloperToken, hasAppleCredentials } from "./apple.js";
import { renderAppHtml } from "./frontend.js";
import { NeteaseError, extractNeteasePlaylist } from "./netease.js";
export { QueueCoordinator } from "./queue.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400"
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      const requestUrl = new URL(request.url);

      if (requestUrl.pathname === "/" && request.method === "GET") {
        return htmlResponse(renderAppHtml());
      }

      if (requestUrl.pathname === "/health") {
        return jsonResponse({
          ok: true,
          endpoints: [
            "/queue/join",
            "/queue/status",
            "/queue/heartbeat",
            "/queue/leave",
            "/netease/playlist",
            "/netease/playlist/stream",
            "/apple/developer-token"
          ],
          appleConfigured: hasAppleCredentials(env),
          queueConfigured: hasQueueBinding(env)
        });
      }

      if (requestUrl.pathname.startsWith("/queue/")) {
        return await handleQueue(request, env, requestUrl);
      }

      if (requestUrl.pathname === "/netease/playlist") {
        return await handleNeteasePlaylist(request, env, requestUrl);
      }

      if (requestUrl.pathname === "/netease/playlist/stream") {
        return await handleNeteasePlaylistStream(request, env, requestUrl);
      }

      if (requestUrl.pathname === "/apple/developer-token") {
        return await handleAppleDeveloperToken(request, env);
      }

      return jsonResponse(
        { error: { code: "not_found", message: "Route not found." } },
        404
      );
    } catch (error) {
      return errorResponse(error);
    }
  }
};

async function handleNeteasePlaylist(request, env, requestUrl) {
  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse(
      { error: { code: "method_not_allowed", message: "Use GET or POST." } },
      405
    );
  }

  const payload = request.method === "POST" ? await readJsonBody(request) : {};
  const sourceUrl = payload.url || requestUrl.searchParams.get("url");
  const limit = parseOptionalInteger(payload.limit || requestUrl.searchParams.get("limit"));

  if (!sourceUrl) {
    return jsonResponse(
      { error: { code: "missing_url", message: "Missing NetEase playlist URL." } },
      400
    );
  }

  await requireActiveQueueSlot(env, {
    ticketId: payload.ticketId || requestUrl.searchParams.get("ticketId"),
    clientId: payload.clientId || requestUrl.searchParams.get("clientId"),
    progress: 2,
    statusText: "准备解析歌单"
  });

  const result = await extractNeteasePlaylist(sourceUrl, {
    limit,
    maxTracks: parseOptionalInteger(env.NETEASE_MAX_TRACKS) || 2000,
    batchSize: parseOptionalInteger(env.NETEASE_BATCH_SIZE) || 200
  });

  return jsonResponse(result);
}

async function handleNeteasePlaylistStream(request, env, requestUrl) {
  if (request.method !== "GET") {
    return jsonResponse(
      { error: { code: "method_not_allowed", message: "Use GET." } },
      405
    );
  }

  const sourceUrl = requestUrl.searchParams.get("url");
  const limit = parseOptionalInteger(requestUrl.searchParams.get("limit"));
  await requireActiveQueueSlot(env, {
    ticketId: requestUrl.searchParams.get("ticketId"),
    clientId: requestUrl.searchParams.get("clientId"),
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
            throw new NeteaseError(400, "missing_url", "Missing NetEase playlist URL.");
          }

          const result = await extractNeteasePlaylist(sourceUrl, {
            limit,
            maxTracks: parseOptionalInteger(env.NETEASE_MAX_TRACKS) || 2000,
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
      ...corsHeaders,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache"
    }
  });
}

async function handleQueue(request, env, requestUrl) {
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
    });
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
    throw new NeteaseError(
      429,
      "queue_required",
      "Join the server queue before parsing a playlist."
    );
  }

  const queueStatus = await queueJsonRequest(env, "/heartbeat", payload);
  if (queueStatus.status !== "active") {
    throw new NeteaseError(
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
  if (request.method !== "GET") {
    return jsonResponse(
      { error: { code: "method_not_allowed", message: "Use GET." } },
      405
    );
  }

  const token = await createAppleDeveloperToken(env);
  return jsonResponse(token);
}

async function readJsonBody(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return {};
  }

  try {
    return await request.json();
  } catch {
    throw new NeteaseError(400, "invalid_json", "Request body must be valid JSON.");
  }
}

function parseOptionalInteger(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8"
    }
  });
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function errorResponse(error) {
  if (error instanceof NeteaseError || error instanceof AppleError) {
    return jsonResponse(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details || undefined
        }
      },
      error.status
    );
  }

  return jsonResponse(
    {
      error: {
        code: "internal_error",
        message: error && error.message ? error.message : "Internal error."
      }
    },
    500
  );
}

function serializeError(error) {
  if (error instanceof NeteaseError || error instanceof AppleError) {
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
