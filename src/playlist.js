import { NeteaseError, extractNeteasePlaylist } from "./netease.js";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36"
};

const MOBILE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"
};

const QQ_HEADERS = {
  ...BROWSER_HEADERS,
  Referer: "https://y.qq.com/"
};

const KUGOU_HEADERS = {
  ...MOBILE_HEADERS,
  Referer: "https://m.kugou.com/"
};

const KUWO_COOKIE_NAME = "Hm_Iuvt_cdb524f42f23cer9b268564v7y735ewrq2324";
const KUWO_HEADERS = {
  ...BROWSER_HEADERS,
  Referer: "https://www.kuwo.cn/"
};

const KUGOU_HOSTS = new Set(["m.kugou.com", "www.kugou.com", "m3ws.kugou.com"]);

const SOURCE_META = {
  netease: { key: "netease", name: "网易云音乐" },
  qq: { key: "qq", name: "QQ 音乐" },
  kugou: { key: "kugou", name: "酷狗音乐" },
  kuwo: { key: "kuwo", name: "酷我音乐" }
};

export const SUPPORTED_SOURCES = Object.values(SOURCE_META);

export class PlaylistError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.name = "PlaylistError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function extractPlaylist(input, options = {}) {
  const source = detectPlaylistSource(input);
  const scopedOptions = {
    ...options,
    onProgress: (event) => reportSourceProgress(options.onProgress, source, event)
  };

  if (source.key === "netease") {
    const result = await extractNeteasePlaylist(input, scopedOptions);
    return withSource(result, source);
  }

  if (source.key === "qq") {
    return await extractQqPlaylist(input, scopedOptions);
  }

  if (source.key === "kugou") {
    return await extractKugouPlaylist(input, scopedOptions);
  }

  if (source.key === "kuwo") {
    return await extractKuwoPlaylist(input, scopedOptions);
  }

  throw new PlaylistError(400, "unsupported_source", "Unsupported playlist source.");
}

export function detectPlaylistSource(input) {
  const text = String(input || "").trim();
  if (!text) {
    throw new PlaylistError(400, "missing_url", "Missing playlist URL.");
  }

  let parsedUrl = null;
  try {
    parsedUrl = new URL(text);
  } catch {
    parsedUrl = null;
  }

  if (!parsedUrl) {
    if (/^\d{3,}$/.test(text)) {
      return SOURCE_META.netease;
    }
    throw new PlaylistError(
      400,
      "invalid_url",
      "请输入网易云、QQ 音乐、酷狗音乐或酷我音乐的歌单链接。"
    );
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new PlaylistError(400, "invalid_url", "Only HTTP and HTTPS URLs are supported.");
  }

  const host = parsedUrl.hostname.toLowerCase();
  if (host === "163cn.tv" || host === "music.163.com" || host === "y.music.163.com") {
    return SOURCE_META.netease;
  }
  if (host === "y.qq.com" || host === "c.y.qq.com" || host === "i.y.qq.com") {
    return SOURCE_META.qq;
  }
  if (KUGOU_HOSTS.has(host) || /^t\d*\.kugou\.com$/.test(host)) {
    return SOURCE_META.kugou;
  }
  if (host === "m.kuwo.cn" || host === "www.kuwo.cn" || host === "kuwo.cn") {
    return SOURCE_META.kuwo;
  }

  throw new PlaylistError(
    400,
    "unsupported_host",
    "目前支持网易云音乐、QQ 音乐、酷狗音乐和酷我音乐的公开歌单链接。",
    { host }
  );
}

async function extractQqPlaylist(input, options) {
  const fetcher = options.fetcher || fetch;
  const sourceUrl = normalizeInput(input);
  const playlistId = extractQqPlaylistId(sourceUrl);
  if (!playlistId) {
    throw new PlaylistError(400, "playlist_id_not_found", "Could not find a QQ Music playlist ID.");
  }

  await reportProgress(options.onProgress, { stage: "resolve", status: "running" });
  await reportProgress(options.onProgress, {
    stage: "resolve",
    status: "complete",
    playlistId,
    resolvedUrl: `https://y.qq.com/n/ryqq/playlist/${playlistId}`
  });
  await reportProgress(options.onProgress, { stage: "playlist", status: "running" });

  const maxTracks = positiveInteger(options.maxTracks, 2000);
  const requestedLimit = positiveInteger(options.limit, null);
  const apiLimit = Math.min(requestedLimit || maxTracks, maxTracks);
  const payload = await fetchQqPlaylistDetail(playlistId, apiLimit, fetcher);
  const playlist = Array.isArray(payload.cdlist) ? payload.cdlist[0] : null;
  if (!playlist || !Array.isArray(playlist.songlist)) {
    throw new PlaylistError(502, "invalid_playlist", "QQ Music returned an invalid playlist payload.");
  }

  const totalCount = positiveInteger(playlist.total_song_num || playlist.songnum, playlist.songlist.length);
  if (!requestedLimit && totalCount > maxTracks) {
    throw new PlaylistError(
      413,
      "playlist_too_large",
      `Playlist has ${totalCount} tracks, above the configured limit of ${maxTracks}.`,
      { trackCount: totalCount, maxTracks }
    );
  }

  const songs = requestedLimit ? playlist.songlist.slice(0, requestedLimit) : playlist.songlist.slice(0, maxTracks);
  await reportProgress(options.onProgress, {
    stage: "playlist",
    status: "complete",
    playlistId,
    playlistName: playlist.dissname,
    trackCount: totalCount,
    requestedTrackCount: songs.length,
    limited: songs.length < totalCount
  });
  await reportProgress(options.onProgress, {
    stage: "song_details",
    status: "running",
    fetchedCount: songs.length,
    totalCount: songs.length
  });
  await reportProgress(options.onProgress, {
    stage: "song_details",
    status: "complete",
    fetchedCount: songs.length,
    totalCount: songs.length
  });

  const result = withSource(
    {
      sourceUrl,
      resolvedUrl: `https://y.qq.com/n/ryqq/playlist/${playlistId}`,
      playlist: {
        id: playlist.disstid || playlistId,
        name: playlist.dissname || "QQ 音乐歌单",
        trackCount: totalCount,
        creator: playlist.nick || null,
        coverImgUrl: playlist.logo || null
      },
      extractedCount: songs.length,
      matchedDetailCount: songs.length,
      missingCount: 0,
      limited: songs.length < totalCount,
      tracks: songs.map(normalizeQqTrack)
    },
    SOURCE_META.qq
  );

  await reportProgress(options.onProgress, {
    stage: "done",
    status: "complete",
    extractedCount: result.extractedCount,
    missingCount: result.missingCount,
    limited: result.limited
  });
  return result;
}

async function fetchQqPlaylistDetail(playlistId, trackLimit, fetcher) {
  const apiUrl = new URL("https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg");
  for (const [key, value] of Object.entries({
    type: "1",
    json: "1",
    utf8: "1",
    onlysong: "0",
    disstid: playlistId,
    format: "json",
    g_tk: "5381",
    loginUin: "0",
    hostUin: "0",
    inCharset: "utf8",
    outCharset: "utf-8",
    notice: "0",
    platform: "yqq",
    needNewCode: "0",
    song_begin: "0",
    song_num: String(trackLimit)
  })) {
    apiUrl.searchParams.set(key, value);
  }

  const response = await fetcher(apiUrl.toString(), { headers: QQ_HEADERS });
  if (!response.ok) {
    throw new PlaylistError(
      502,
      "playlist_fetch_failed",
      `QQ Music playlist request failed with HTTP ${response.status}.`
    );
  }

  const text = await response.text();
  const payload = parsePossiblyJsonp(text);
  if (payload.code !== 0) {
    throw new PlaylistError(
      502,
      "playlist_fetch_failed",
      "QQ Music playlist request returned an error.",
      { code: payload.code, message: payload.msg || payload.message || null }
    );
  }
  return payload;
}

function normalizeQqTrack(song, index) {
  const album = song.album || {};
  const interval = Number(song.interval);
  return {
    index: index + 1,
    id: song.songmid || song.mid || song.songid || `qq-${index + 1}`,
    name: song.songname || song.songorig || song.title || null,
    artists: (song.singer || []).map((artist) => artist.name).filter(Boolean),
    album: song.albumname || album.name || null,
    durationMs: Number.isFinite(interval) ? interval * 1000 : null,
    missing: false
  };
}

async function extractKugouPlaylist(input, options) {
  const fetcher = options.fetcher || fetch;
  const sourceUrl = normalizeInput(input);
  const inputUrl = toHttpUrl(sourceUrl);

  await reportProgress(options.onProgress, { stage: "resolve", status: "running" });
  const playlistId = extractKugouPlaylistId(sourceUrl) || inputUrl.pathname;
  await reportProgress(options.onProgress, {
    stage: "resolve",
    status: "complete",
    playlistId,
    resolvedUrl: inputUrl.toString()
  });
  await reportProgress(options.onProgress, { stage: "playlist", status: "running" });

  const response = await fetcher(inputUrl.toString(), {
    method: "GET",
    redirect: "follow",
    headers: KUGOU_HEADERS
  });
  if (!response.ok) {
    throw new PlaylistError(
      502,
      "playlist_fetch_failed",
      `Kugou playlist request failed with HTTP ${response.status}.`
    );
  }

  const html = await response.text();
  const output = extractKugouOutput(html);
  const info = output.info || {};
  const listInfo = info.listinfo || {};
  const songs = Array.isArray(info.songs) ? info.songs : [];
  if (!songs.length) {
    throw new PlaylistError(502, "invalid_playlist", "Kugou returned no public preview tracks.");
  }

  const totalCount = positiveInteger(listInfo.count, songs.length);
  const requestedLimit = positiveInteger(options.limit, null);
  const selectedSongs = requestedLimit ? songs.slice(0, requestedLimit) : songs;
  const limited = selectedSongs.length < totalCount;

  await reportProgress(options.onProgress, {
    stage: "playlist",
    status: "complete",
    playlistId,
    playlistName: listInfo.name,
    trackCount: totalCount,
    requestedTrackCount: selectedSongs.length,
    limited,
    limitedReason: limited ? "酷狗分享页目前只公开预览曲目，完整列表需要平台额外接口。" : null
  });
  await reportProgress(options.onProgress, {
    stage: "song_details",
    status: "running",
    fetchedCount: selectedSongs.length,
    totalCount: selectedSongs.length
  });
  await reportProgress(options.onProgress, {
    stage: "song_details",
    status: "complete",
    fetchedCount: selectedSongs.length,
    totalCount: selectedSongs.length
  });

  const result = withSource(
    {
      sourceUrl,
      resolvedUrl: response.url || inputUrl.toString(),
      playlist: {
        id: output.global_collection_id || output.encode_gic || playlistId,
        name: listInfo.name || "酷狗音乐歌单",
        trackCount: totalCount,
        creator: listInfo.list_create_username || null,
        coverImgUrl: normalizeKugouImage(listInfo.pic || null)
      },
      extractedCount: selectedSongs.length,
      matchedDetailCount: selectedSongs.length,
      missingCount: 0,
      limited,
      limitReason: limited ? "Kugou share pages expose only preview tracks to unauthenticated web requests." : null,
      tracks: selectedSongs.map(normalizeKugouTrack)
    },
    SOURCE_META.kugou
  );

  await reportProgress(options.onProgress, {
    stage: "done",
    status: "complete",
    extractedCount: result.extractedCount,
    missingCount: result.missingCount,
    limited: result.limited
  });
  return result;
}

function extractKugouOutput(html) {
  const mobileOutput = extractKugouAssignedJson(html, "window.$output");
  if (mobileOutput) {
    return mobileOutput;
  }

  const desktopOutput = extractKugouAssignedJson(html, "var nData");
  if (desktopOutput) {
    return {
      encode_gic: desktopOutput.listinfo ? desktopOutput.listinfo.encode_gcid : null,
      global_collection_id: desktopOutput.listinfo ? desktopOutput.listinfo.global_collection_id : null,
      info: {
        listinfo: desktopOutput.listinfo || {},
        songs: Array.isArray(desktopOutput.songs) ? desktopOutput.songs : []
      }
    };
  }

  throw new PlaylistError(502, "invalid_playlist", "Kugou did not include playlist data in the share page.");
}

function extractKugouAssignedJson(html, marker) {
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) {
    return null;
  }

  const equalsIndex = html.indexOf("=", markerIndex);
  if (equalsIndex < 0) {
    throw new PlaylistError(502, "invalid_playlist", "Kugou playlist data was truncated.");
  }

  const scriptEndIndex = html.indexOf("</script>", equalsIndex);
  const searchEndIndex = scriptEndIndex < 0 ? html.length : scriptEndIndex;
  const jsonStartIndex = html.indexOf("{", equalsIndex);
  if (jsonStartIndex < 0 || jsonStartIndex > searchEndIndex) {
    throw new PlaylistError(502, "invalid_playlist", "Kugou playlist data was truncated.");
  }

  const jsonText = extractBalancedJsonText(html, jsonStartIndex, searchEndIndex);
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    throw new PlaylistError(502, "invalid_playlist", "Kugou playlist data could not be parsed.", {
      message: error.message
    });
  }
}

function extractBalancedJsonText(text, startIndex, endIndex) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < endIndex; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "{" || char === "[") {
      depth += 1;
    } else if (char === "}" || char === "]") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIndex, index + 1);
      }
    }
  }

  throw new PlaylistError(502, "invalid_playlist", "Kugou playlist data was truncated.");
}

function normalizeKugouTrack(song, index) {
  const artists = Array.isArray(song.singerinfo)
    ? song.singerinfo.map((artist) => artist.name).filter(Boolean)
    : parseKugouArtists(song.name);
  const durationMs = Number(song.timelen);
  return {
    index: index + 1,
    id: song.hash || song.mixsongid || song.audio_id || `kugou-${index + 1}`,
    name: stripKugouArtistPrefix(song.name, artists),
    artists,
    album: (song.albuminfo && song.albuminfo.name) || song.remark || null,
    durationMs: Number.isFinite(durationMs) ? durationMs : null,
    missing: false
  };
}

function parseKugouArtists(name) {
  const parts = String(name || "").split(" - ");
  if (parts.length < 2) return [];
  return parts[0]
    .split(/[、/&，,]+/)
    .map((artist) => artist.trim())
    .filter(Boolean);
}

function stripKugouArtistPrefix(name, artists) {
  const normalizedName = String(name || "").trim();
  if (!normalizedName) return null;
  const prefixes = [
    artists.join("、"),
    artists.join("&"),
    artists.join("、").replace(/\s+/g, "")
  ].filter(Boolean);

  for (const prefix of prefixes) {
    const fullPrefix = `${prefix} - `;
    if (normalizedName.startsWith(fullPrefix)) {
      return normalizedName.slice(fullPrefix.length).trim() || normalizedName;
    }
  }

  const splitIndex = normalizedName.indexOf(" - ");
  return splitIndex > 0 ? normalizedName.slice(splitIndex + 3).trim() : normalizedName;
}

function normalizeKugouImage(value) {
  return value ? String(value).replace("{size}", "400").replace(/^http:\/\//, "https://") : null;
}

async function extractKuwoPlaylist(input, options) {
  const fetcher = options.fetcher || fetch;
  const sourceUrl = normalizeInput(input);
  const playlistId = extractKuwoPlaylistId(sourceUrl);
  if (!playlistId) {
    throw new PlaylistError(400, "playlist_id_not_found", "Could not find a Kuwo playlist ID.");
  }

  await reportProgress(options.onProgress, { stage: "resolve", status: "running" });
  await reportProgress(options.onProgress, {
    stage: "resolve",
    status: "complete",
    playlistId,
    resolvedUrl: `https://www.kuwo.cn/playlist_detail/${playlistId}`
  });
  await reportProgress(options.onProgress, { stage: "playlist", status: "running" });

  const maxTracks = positiveInteger(options.maxTracks, 2000);
  const requestedLimit = positiveInteger(options.limit, null);
  const requestLimit = Math.min(requestedLimit || maxTracks, maxTracks);
  const payload = await fetchKuwoPlaylistDetail(playlistId, requestLimit, fetcher);
  const playlist = payload.data;
  if (!playlist || !Array.isArray(playlist.musicList)) {
    throw new PlaylistError(502, "invalid_playlist", "Kuwo returned an invalid playlist payload.");
  }

  const totalCount = positiveInteger(playlist.total, playlist.musicList.length);
  if (!requestedLimit && totalCount > maxTracks) {
    throw new PlaylistError(
      413,
      "playlist_too_large",
      `Playlist has ${totalCount} tracks, above the configured limit of ${maxTracks}.`,
      { trackCount: totalCount, maxTracks }
    );
  }

  const songs = requestedLimit ? playlist.musicList.slice(0, requestedLimit) : playlist.musicList.slice(0, maxTracks);
  const limited = songs.length < totalCount;
  await reportProgress(options.onProgress, {
    stage: "playlist",
    status: "complete",
    playlistId,
    playlistName: playlist.name,
    trackCount: totalCount,
    requestedTrackCount: songs.length,
    limited
  });
  await reportProgress(options.onProgress, {
    stage: "song_details",
    status: "running",
    fetchedCount: songs.length,
    totalCount: songs.length
  });
  await reportProgress(options.onProgress, {
    stage: "song_details",
    status: "complete",
    fetchedCount: songs.length,
    totalCount: songs.length
  });

  const result = withSource(
    {
      sourceUrl,
      resolvedUrl: `https://www.kuwo.cn/playlist_detail/${playlistId}`,
      playlist: {
        id: playlist.id || playlistId,
        name: playlist.name || "酷我音乐歌单",
        trackCount: totalCount,
        creator: playlist.userName || playlist.uname || null,
        coverImgUrl: playlist.img500 || playlist.img300 || playlist.img700 || playlist.uPic || null
      },
      extractedCount: songs.length,
      matchedDetailCount: songs.length,
      missingCount: 0,
      limited,
      tracks: songs.map(normalizeKuwoTrack)
    },
    SOURCE_META.kuwo
  );

  await reportProgress(options.onProgress, {
    stage: "done",
    status: "complete",
    extractedCount: result.extractedCount,
    missingCount: result.missingCount,
    limited: result.limited
  });
  return result;
}

async function fetchKuwoPlaylistDetail(playlistId, trackLimit, fetcher) {
  const cookieValue = `m2m${Math.random().toString(36).slice(2, 18)}`;
  const apiUrl = new URL("https://www.kuwo.cn/api/www/playlist/playListInfo");
  apiUrl.searchParams.set("pid", playlistId);
  apiUrl.searchParams.set("pn", "1");
  apiUrl.searchParams.set("rn", String(trackLimit));
  apiUrl.searchParams.set("httpsStatus", "1");
  apiUrl.searchParams.set("reqId", randomRequestId());
  apiUrl.searchParams.set("plat", "web_www");
  apiUrl.searchParams.set("from", "ar");

  const response = await fetcher(apiUrl.toString(), {
    headers: {
      ...KUWO_HEADERS,
      Referer: `https://www.kuwo.cn/playlist_detail/${playlistId}`,
      Cookie: `${KUWO_COOKIE_NAME}=${cookieValue}`,
      Secret: createKuwoSecret(cookieValue, KUWO_COOKIE_NAME)
    }
  });
  if (!response.ok) {
    throw new PlaylistError(
      502,
      "playlist_fetch_failed",
      `Kuwo playlist request failed with HTTP ${response.status}.`
    );
  }

  const payload = await response.json();
  if (payload.code !== 200) {
    throw new PlaylistError(
      502,
      "playlist_fetch_failed",
      "Kuwo playlist request returned an error.",
      { code: payload.code, message: payload.msg || payload.message || null }
    );
  }
  return payload;
}

function normalizeKuwoTrack(song, index) {
  const durationSeconds = Number(song.duration);
  return {
    index: index + 1,
    id: song.musicrid || song.rid || `kuwo-${index + 1}`,
    name: song.name || null,
    artists: splitArtistNames(song.artist),
    album: song.album || null,
    durationMs: Number.isFinite(durationSeconds) ? durationSeconds * 1000 : null,
    missing: false
  };
}

function splitArtistNames(value) {
  return String(value || "")
    .split(/[、/&，,]+/)
    .map((artist) => artist.trim())
    .filter(Boolean);
}

export function extractQqPlaylistId(input) {
  const text = safeDecodeURIComponent(String(input || "").trim());
  try {
    const url = new URL(text);
    for (const key of ["id", "disstid"]) {
      const value = url.searchParams.get(key);
      if (value && /^\d{4,}$/.test(value)) return value;
    }

    const pathMatch = url.pathname.match(/(?:playlist|taoge|details)\/(\d{4,})/i);
    if (pathMatch) return pathMatch[1];
  } catch {
    const match = text.match(/[?&#](?:id|disstid)=(\d{4,})/i);
    if (match) return match[1];
  }

  const directMatch = text.match(/^\d{4,}$/);
  return directMatch ? directMatch[0] : null;
}

export function extractKugouPlaylistId(input) {
  const text = safeDecodeURIComponent(String(input || "").trim());
  try {
    const url = new URL(text);
    if (/^t\d*\.kugou\.com$/.test(url.hostname.toLowerCase())) {
      const shortCode = url.pathname.split("/").filter(Boolean)[0];
      if (shortCode) return shortCode;
    }
  } catch {
    // Fall back to regex extraction below.
  }

  const pathMatch = text.match(/\/songlist\/([^/?#]+)/i);
  if (pathMatch) return pathMatch[1];

  const queryMatch = text.match(/[?&#](?:src_cid|global_collection_id|id)=([^&#]+)/i);
  if (queryMatch) return queryMatch[1];

  return null;
}

export function extractKuwoPlaylistId(input) {
  const text = safeDecodeURIComponent(String(input || "").trim());
  try {
    const url = new URL(text);
    const queryId = url.searchParams.get("pid") || url.searchParams.get("id");
    if (queryId && /^\d{3,}$/.test(queryId)) return queryId;

    const pathMatch = url.pathname.match(/playlist_detail\/(\d{3,})/i);
    if (pathMatch) return pathMatch[1];
  } catch {
    const pathMatch = text.match(/playlist_detail\/(\d{3,})/i);
    if (pathMatch) return pathMatch[1];
  }

  const directMatch = text.match(/^\d{3,}$/);
  return directMatch ? directMatch[0] : null;
}

function createKuwoSecret(text, key) {
  if (!key) return null;
  let charCodes = "";
  for (let index = 0; index < key.length; index += 1) {
    charCodes += key.charCodeAt(index).toString();
  }

  const split = Math.floor(charCodes.length / 5);
  const multiplier = Number.parseInt(
    charCodes.charAt(split) +
      charCodes.charAt(2 * split) +
      charCodes.charAt(3 * split) +
      charCodes.charAt(4 * split) +
      charCodes.charAt(5 * split),
    10
  );
  const increment = Math.ceil(key.length / 2);
  const modulus = 2147483647;
  if (multiplier < 2) return null;

  let randomSeed = Math.round(1_000_000_000 * Math.random()) % 100_000_000;
  charCodes += randomSeed;
  while (charCodes.length > 10) {
    charCodes = (
      Number.parseInt(charCodes.substring(0, 10), 10) + Number.parseInt(charCodes.substring(10), 10)
    ).toString();
  }

  let rolling = (multiplier * Number.parseInt(charCodes, 10) + increment) % modulus;
  let encoded = "";
  for (let index = 0; index < text.length; index += 1) {
    const value = Number.parseInt(text.charCodeAt(index) ^ Math.floor((rolling / modulus) * 255), 10);
    encoded += (value < 16 ? "0" : "") + value.toString(16);
    rolling = (multiplier * rolling + increment) % modulus;
  }

  let randomHex = randomSeed.toString(16);
  while (randomHex.length < 8) randomHex = "0" + randomHex;
  return encoded + randomHex;
}

function randomRequestId() {
  const randomPart = () => Math.random().toString(16).slice(2, 10).padEnd(8, "0");
  return `${randomPart()}${randomPart()}${randomPart()}${randomPart()}`;
}

function withSource(result, source) {
  return {
    ...result,
    source: {
      key: source.key,
      name: source.name
    }
  };
}

async function reportSourceProgress(onProgress, source, event) {
  await reportProgress(onProgress, {
    ...event,
    source: source.key,
    sourceName: source.name
  });
}

async function reportProgress(onProgress, event) {
  if (typeof onProgress === "function") {
    await onProgress({ ...event, timestamp: Date.now() });
  }
}

function parsePossiblyJsonp(text) {
  const trimmed = text.trim();
  const jsonText = trimmed.startsWith("{")
    ? trimmed
    : trimmed.replace(/^[^(]*\(/, "").replace(/\)\s*;?\s*$/, "");
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    throw new PlaylistError(502, "invalid_playlist", "Playlist response could not be parsed as JSON.", {
      message: error.message
    });
  }
}

function toHttpUrl(input) {
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("unsupported protocol");
    }
    return url;
  } catch {
    throw new PlaylistError(400, "invalid_url", "The input must be a valid playlist URL.");
  }
}

function normalizeInput(input) {
  const normalizedInput = String(input || "").trim();
  if (!normalizedInput) {
    throw new PlaylistError(400, "missing_url", "Missing playlist URL.");
  }
  return normalizedInput;
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

export function isPlaylistError(error) {
  return (
    error instanceof PlaylistError ||
    error instanceof NeteaseError ||
    (error && Number.isFinite(error.status) && typeof error.code === "string")
  );
}
