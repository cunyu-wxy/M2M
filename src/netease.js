const NETEASE_HEADERS = {
  Referer: "https://music.163.com/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36"
};

const ALLOWED_INPUT_HOSTS = new Set(["163cn.tv", "music.163.com", "y.music.163.com"]);

export class NeteaseError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.name = "NeteaseError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function extractNeteasePlaylist(input, options = {}) {
  const fetcher = options.fetcher || fetch;
  const sourceUrl = normalizeInput(input);
  await reportProgress(options.onProgress, { stage: "resolve", status: "running" });
  const resolvedPlaylist = await resolvePlaylistId(sourceUrl, fetcher);
  await reportProgress(options.onProgress, {
    stage: "resolve",
    status: "complete",
    playlistId: resolvedPlaylist.id,
    resolvedUrl: resolvedPlaylist.resolvedUrl
  });

  await reportProgress(options.onProgress, { stage: "playlist", status: "running" });
  const playlistPayload = await fetchPlaylistDetail(resolvedPlaylist.id, fetcher, options);
  const playlist = playlistPayload.playlist;

  if (!playlist || !Array.isArray(playlist.trackIds)) {
    throw new NeteaseError(502, "invalid_playlist", "NetEase returned an invalid playlist payload.");
  }

  const maxTracks = positiveInteger(options.maxTracks, 2000);
  const batchSize = positiveInteger(options.batchSize, 200);
  const allTrackIds = playlist.trackIds.map((track) => track.id).filter(Boolean);
  const requestedTrackIds = options.limit ? allTrackIds.slice(0, options.limit) : allTrackIds;

  await reportProgress(options.onProgress, {
    stage: "playlist",
    status: "complete",
    playlistId: playlist.id,
    playlistName: playlist.name,
    trackCount: playlist.trackCount,
    requestedTrackCount: requestedTrackIds.length
  });

  if (requestedTrackIds.length > maxTracks) {
    throw new NeteaseError(
      413,
      "playlist_too_large",
      `Playlist has ${requestedTrackIds.length} tracks, above the configured limit of ${maxTracks}.`,
      { trackCount: requestedTrackIds.length, maxTracks }
    );
  }

  const songsById = await fetchSongDetails(requestedTrackIds, fetcher, {
    batchSize,
    throttleMs: options.throttleMs ?? 100,
    onProgress: options.onProgress
  });
  const tracks = buildTracks(requestedTrackIds, songsById);
  const missingCount = tracks.filter((track) => track.missing).length;

  const result = {
    sourceUrl,
    resolvedUrl: resolvedPlaylist.resolvedUrl,
    playlist: {
      id: playlist.id,
      name: playlist.name,
      trackCount: playlist.trackCount,
      creator: playlist.creator ? playlist.creator.nickname : null,
      coverImgUrl: playlist.coverImgUrl || null
    },
    extractedCount: tracks.length,
    matchedDetailCount: tracks.length - missingCount,
    missingCount,
    limited: requestedTrackIds.length !== allTrackIds.length,
    tracks
  };

  await reportProgress(options.onProgress, {
    stage: "done",
    status: "complete",
    extractedCount: result.extractedCount,
    missingCount: result.missingCount
  });

  return result;
}

export function extractPlaylistIdFromText(input) {
  const text = String(input || "").trim();
  if (!text) {
    return null;
  }

  if (/^\d{3,}$/.test(text)) {
    return Number.parseInt(text, 10);
  }

  const decodedText = safeDecodeURIComponent(text);
  const urlId = extractPlaylistIdFromUrl(decodedText);
  if (urlId) {
    return urlId;
  }

  const idMatch = decodedText.match(/[?&#]id=(\d{3,})/);
  if (idMatch) {
    return Number.parseInt(idMatch[1], 10);
  }

  const pathMatch = decodedText.match(/playlist\/(\d{3,})/i);
  return pathMatch ? Number.parseInt(pathMatch[1], 10) : null;
}

export function buildTracks(trackIds, songsById) {
  return trackIds.map((trackId, index) => {
    const song = songsById.get(trackId);
    if (!song) {
      return {
        index: index + 1,
        id: trackId,
        name: null,
        artists: [],
        album: null,
        durationMs: null,
        missing: true
      };
    }

    const artists = song.artists || song.ar || [];
    const album = song.album || song.al || {};
    const aliases = metadataAliases(song);
    const artistAliases = artists.flatMap(metadataAliases);
    const albumAliases = metadataAliases(album);
    return {
      index: index + 1,
      id: trackId,
      name: song.name || null,
      artists: artists.map((artist) => artist.name).filter(Boolean),
      album: album.name || null,
      durationMs: song.duration || song.dt || null,
      ...(aliases.length ? { aliases } : {}),
      ...(artistAliases.length ? { artistAliases: Array.from(new Set(artistAliases)) } : {}),
      ...(albumAliases.length ? { albumAliases } : {}),
      missing: false
    };
  });
}

function metadataAliases(metadata) {
  return Array.from(new Set([metadata.alias, metadata.alia, metadata.transNames, metadata.tns, metadata.trans]
    .flat().filter(value => typeof value === "string" && value.trim()).map(value => value.trim())));
}

async function resolvePlaylistId(input, fetcher) {
  const directId = extractPlaylistIdFromText(input);
  if (directId) {
    return { id: directId, resolvedUrl: canonicalPlaylistUrl(directId) };
  }

  const inputUrl = toAllowedInputUrl(input);
  const response = await fetcher(inputUrl.toString(), {
    method: "GET",
    redirect: "follow",
    headers: NETEASE_HEADERS
  });

  const responseUrl = response.url || inputUrl.toString();
  const redirectedId = extractPlaylistIdFromText(responseUrl);
  if (redirectedId) {
    return { id: redirectedId, resolvedUrl: responseUrl };
  }

  const html = await response.text();
  const htmlId = extractPlaylistIdFromText(html);
  if (htmlId) {
    return { id: htmlId, resolvedUrl: responseUrl };
  }

  throw new NeteaseError(400, "playlist_id_not_found", "Could not find a playlist ID in the URL.");
}

async function fetchPlaylistDetail(playlistId, fetcher, options) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await requestPlaylistDetail(playlistId, fetcher);
    } catch (error) {
      if (!(error instanceof NeteaseError) || !error.details?.retryable || attempt === 2 ||
          error.details.retryAfterMs > 2000) throw error;
      const retryAfterMs = Math.max(1000, error.details.retryAfterMs || 0);
      await reportProgress(options.onProgress, {
        stage: "playlist", status: "retrying", attempt: attempt + 1, retryAfterMs,
        message: error.message
      });
      await sleep(retryAfterMs);
    }
  }
}

async function requestPlaylistDetail(playlistId, fetcher) {
  const apiUrl = `https://music.163.com/api/v6/playlist/detail?id=${playlistId}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetcher(apiUrl, {
      headers: NETEASE_HEADERS,
      signal: controller.signal
    });

    if (!response.ok) {
      await response.body?.cancel();
      throw playlistRequestError(response.status, response, true);
    }

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      throw new NeteaseError(502, "playlist_fetch_failed",
        "网易云返回的歌单数据格式异常，请稍后重试。", { retryable: false, httpStatus: response.status });
    }
    const code = typeof payload?.code === "number" ? payload.code :
      typeof payload?.code === "string" && /^-?\d{1,6}$/.test(payload.code) ? Number(payload.code) : null;
    if (code !== 200) throw playlistRequestError(code, response);
    return payload;
  } catch (error) {
    if (error instanceof NeteaseError) throw error;
    const timedOut = controller.signal.aborted || error.name === "TimeoutError" || error.name === "AbortError";
    throw new NeteaseError(502, "playlist_fetch_failed",
      timedOut ? "读取网易云歌单超时，请稍后重试。" : "连接网易云歌单接口失败，请稍后重试。",
      { retryable: true, reason: timedOut ? "timeout" : "network" });
  } finally {
    clearTimeout(timeout);
  }
}

function playlistRequestError(code, response, httpError = false) {
  const retryable = [429, 500, 502, 503, 504].includes(code);
  const label = httpError ? `HTTP ${code}` : `错误码 ${code ?? "未知"}`;
  let message = `网易云暂时无法返回歌单（${label}），请稍后重试。`;
  if (code === 404) {
    message = `网易云未找到该歌单（${label}），请确认歌单仍存在且分享链接正确。`;
  } else if ([301, 401, 403].includes(code)) {
    message = `网易云拒绝匿名访问该歌单（${label}），请确认歌单已公开且无需登录即可访问。`;
  } else if ([429, 460, -460].includes(code)) {
    message = `网易云暂时限制了服务器请求（${label}），请稍后重试；这不代表歌单不存在。`;
  }
  const retryAfter = response.headers.get("Retry-After");
  const retryAfterMs = retryAfter === null ? 0 : /^\d+(\.\d+)?$/.test(retryAfter.trim()) ?
    Number(retryAfter) * 1000 : Math.max(0, Date.parse(retryAfter) - Date.now()) || 0;
  return new NeteaseError(502, "playlist_fetch_failed", message, {
    code, httpStatus: response.status, retryable,
    ...(retryAfterMs > 0 ? { retryAfterMs } : {})
  });
}

async function fetchSongDetails(trackIds, fetcher, options) {
  const songsById = new Map();
  await reportProgress(options.onProgress, {
    stage: "song_details",
    status: "running",
    fetchedCount: 0,
    totalCount: trackIds.length
  });

  for (let startIndex = 0; startIndex < trackIds.length; startIndex += options.batchSize) {
    const chunk = trackIds.slice(startIndex, startIndex + options.batchSize);
    const songs = await fetchSongDetailChunk(chunk, fetcher);

    for (const song of songs) {
      songsById.set(song.id, song);
    }

    await reportProgress(options.onProgress, {
      stage: "song_details",
      status: "running",
      fetchedCount: Math.min(startIndex + chunk.length, trackIds.length),
      totalCount: trackIds.length
    });

    if (options.throttleMs > 0 && startIndex + options.batchSize < trackIds.length) {
      await sleep(options.throttleMs);
    }
  }

  await reportProgress(options.onProgress, {
    stage: "song_details",
    status: "complete",
    fetchedCount: trackIds.length,
    totalCount: trackIds.length
  });

  return songsById;
}

async function fetchSongDetailChunk(trackIds, fetcher) {
  const encodedIds = encodeURIComponent(`[${trackIds.join(",")}]`);
  const apiUrl = `https://music.163.com/api/song/detail?ids=${encodedIds}`;
  const response = await fetcher(apiUrl, {
    headers: NETEASE_HEADERS
  });

  if (!response.ok) {
    throw new NeteaseError(
      502,
      "song_detail_fetch_failed",
      `NetEase song detail request failed with HTTP ${response.status}.`
    );
  }

  const payload = await response.json();
  if (payload.code !== 200 || !Array.isArray(payload.songs)) {
    throw new NeteaseError(502, "song_detail_fetch_failed", "NetEase returned invalid song details.");
  }

  return payload.songs;
}

function extractPlaylistIdFromUrl(input) {
  try {
    const url = new URL(input);
    const directId = url.searchParams.get("id");
    if (directId && /^\d{3,}$/.test(directId)) {
      return Number.parseInt(directId, 10);
    }

    const hashId = url.hash.match(/[?&#]id=(\d{3,})/);
    if (hashId) {
      return Number.parseInt(hashId[1], 10);
    }
  } catch {
    return null;
  }

  return null;
}

function toAllowedInputUrl(input) {
  let inputUrl;
  try {
    inputUrl = new URL(input);
  } catch {
    throw new NeteaseError(400, "invalid_url", "The input must be a valid URL or playlist ID.");
  }

  if (inputUrl.protocol !== "https:" && inputUrl.protocol !== "http:") {
    throw new NeteaseError(400, "invalid_url", "Only HTTP and HTTPS URLs are supported.");
  }

  if (!ALLOWED_INPUT_HOSTS.has(inputUrl.hostname)) {
    throw new NeteaseError(
      400,
      "unsupported_host",
      "Only NetEase Cloud Music playlist URLs and 163cn.tv short URLs are supported.",
      { host: inputUrl.hostname }
    );
  }

  return inputUrl;
}

function normalizeInput(input) {
  const normalizedInput = String(input || "").trim();
  if (!normalizedInput) {
    throw new NeteaseError(400, "missing_url", "Missing NetEase playlist URL.");
  }

  return normalizedInput;
}

function canonicalPlaylistUrl(playlistId) {
  return `https://music.163.com/playlist?id=${playlistId}`;
}

function positiveInteger(value, fallbackValue) {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallbackValue;
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function reportProgress(onProgress, event) {
  if (typeof onProgress === "function") {
    await onProgress({ ...event, timestamp: Date.now() });
  }
}
