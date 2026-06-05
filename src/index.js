import { NeteaseError, extractNeteasePlaylist } from "./netease.js";

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

      if (requestUrl.pathname === "/" || requestUrl.pathname === "/health") {
        return jsonResponse({
          ok: true,
          endpoints: ["/netease/playlist"]
        });
      }

      if (requestUrl.pathname === "/netease/playlist") {
        return handleNeteasePlaylist(request, env, requestUrl);
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

  const result = await extractNeteasePlaylist(sourceUrl, {
    limit,
    maxTracks: parseOptionalInteger(env.NETEASE_MAX_TRACKS) || 2000,
    batchSize: parseOptionalInteger(env.NETEASE_BATCH_SIZE) || 200
  });

  return jsonResponse(result);
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
  if (error instanceof NeteaseError) {
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
