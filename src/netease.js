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
  const playlistPayload = await fetchPlaylistDetail(resolvedPlaylist.id, fetcher);
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

    return {
      index: index + 1,
      id: trackId,
      name: song.name || null,
      artists: (song.artists || song.ar || []).map((artist) => artist.name).filter(Boolean),
      album: (song.album && song.album.name) || (song.al && song.al.name) || null,
      durationMs: song.duration || song.dt || null,
      missing: false
    };
  });
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

async function fetchPlaylistDetail(playlistId, fetcher) {
  const apiUrl = `https://music.163.com/api/v6/playlist/detail?id=${playlistId}`;
  const response = await fetcher(apiUrl, {
    headers: NETEASE_HEADERS
  });

  if (!response.ok) {
    throw new NeteaseError(
      502,
      "playlist_fetch_failed",
      `NetEase playlist request failed with HTTP ${response.status}.`
    );
  }

  const payload = await response.json();
  if (payload.code !== 200) {
    throw new NeteaseError(
      502,
      "playlist_fetch_failed",
      "NetEase playlist request returned an error.",
      { code: payload.code, message: payload.msg || payload.message || null }
    );
  }

  return payload;
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
