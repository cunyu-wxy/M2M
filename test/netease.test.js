import assert from "node:assert/strict";
import test from "node:test";

import { NeteaseError, buildTracks, extractNeteasePlaylist, extractPlaylistIdFromText } from "../src/netease.js";

test("extracts playlist IDs from common NetEase URLs", () => {
  assert.equal(extractPlaylistIdFromText("486271477"), 486271477);
  assert.equal(extractPlaylistIdFromText("https://music.163.com/playlist?id=486271477"), 486271477);
  assert.equal(extractPlaylistIdFromText("https://music.163.com/#/playlist?id=486271477"), 486271477);
  assert.equal(
    extractPlaylistIdFromText("https://music.163.com/m/playlist?app_version=9.5.20&id=486271477"),
    486271477
  );
});

test("builds normalized tracks in playlist order", () => {
  const songsById = new Map([
    [
      2744403189,
      {
        id: 2744403189,
        name: "Opalite",
        artists: [{ name: "Taylor Swift" }],
        album: { name: "The Life of a Showgirl" },
        duration: 235356
      }
    ]
  ]);

  assert.deepEqual(buildTracks([2744403189, 3335852089], songsById), [
    {
      index: 1,
      id: 2744403189,
      name: "Opalite",
      artists: ["Taylor Swift"],
      album: "The Life of a Showgirl",
      durationMs: 235356,
      missing: false
    },
    {
      index: 2,
      id: 3335852089,
      name: null,
      artists: [],
      album: null,
      durationMs: null,
      missing: true
    }
  ]);
});

test("retains translated titles and artist aliases for cross-language matching", () => {
  const tracks = buildTracks([1], new Map([[1, {
    id: 1, name: "生きていたんだよな", alias: ["Ikiteitandayona"], transNames: ["曾经活着啊"],
    artists: [{ name: "あいみょん", alias: ["Aimyon"], trans: "爱缪" }],
    album: { name: "生きていたんだよな", alias: ["Ikiteitandayona"] }, duration: 194120
  }]]));
  assert.deepEqual(tracks[0].aliases, ["Ikiteitandayona", "曾经活着啊"]);
  assert.deepEqual(tracks[0].artistAliases, ["Aimyon", "爱缪"]);
  assert.deepEqual(tracks[0].albumAliases, ["Ikiteitandayona"]);
});

test("extracts a playlist with a fake fetcher", async () => {
  const fakeFetch = async (url) => {
    if (url.includes("/api/v6/playlist/detail")) {
      return jsonResponse({
        code: 200,
        playlist: {
          id: 486271477,
          name: "Test playlist",
          trackCount: 2,
          creator: { nickname: "tester" },
          coverImgUrl: "https://example.com/cover.jpg",
          trackIds: [{ id: 1 }, { id: 2 }]
        }
      });
    }

    if (url.includes("/api/song/detail")) {
      const ids = JSON.parse(new URL(url).searchParams.get("ids"));
      assert.deepEqual(ids, [1, 2]);
      return jsonResponse({
        code: 200,
        songs: [
          {
            id: 1,
            name: "Song A",
            artists: [{ name: "Artist A" }],
            album: { name: "Album A" },
            duration: 1000
          },
          {
            id: 2,
            name: "Song B",
            artists: [{ name: "Artist B" }],
            album: { name: "Album B" },
            duration: 2000
          }
        ]
      });
    }

    throw new Error(`Unexpected URL: ${url}`);
  };
  const progressEvents = [];

  const result = await extractNeteasePlaylist("486271477", {
    fetcher: fakeFetch,
    throttleMs: 0,
    onProgress: (event) => progressEvents.push(event)
  });

  assert.equal(result.playlist.id, 486271477);
  assert.equal(result.extractedCount, 2);
  assert.equal(result.missingCount, 0);
  assert.deepEqual(
    result.tracks.map((track) => `${track.name} - ${track.artists.join("/")}`),
    ["Song A - Artist A", "Song B - Artist B"]
  );
  assert.deepEqual(
    progressEvents.map((event) => `${event.stage}:${event.status}`),
    [
      "resolve:running",
      "resolve:complete",
      "playlist:running",
      "playlist:complete",
      "song_details:running",
      "song_details:running",
      "song_details:complete",
      "done:complete"
    ]
  );
});

function jsonResponse(payload) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

function playlistFixture() {
  return jsonResponse({ code: 200, playlist: {
    id: 3112245660, name: "Test playlist", trackCount: 2,
    trackIds: [{ id: 2 }, { id: 1 }]
  } });
}

test("recovers from a transient playlist error without resolving the short link again", async () => {
  const events = [];
  let resolves = 0;
  let details = 0;
  const result = await extractNeteasePlaylist("https://163cn.tv/bk5S9ub1", {
    throttleMs: 0,
    onProgress: event => events.push(event),
    fetcher: async (url, options) => {
      if (url.startsWith("https://163cn.tv/")) {
        resolves += 1;
        return { url: "https://music.163.com/m/playlist?id=3112245660" };
      }
      if (url.includes("/api/v6/playlist/detail")) {
        details += 1;
        assert.ok(options.signal instanceof AbortSignal);
        return details === 1 ? jsonResponse({ code: 503, msg: "internal upstream detail" }) : playlistFixture();
      }
      return jsonResponse({ code: 200, songs: [
        { id: 1, name: "Song A", artists: [{ name: "Artist A" }] },
        { id: 2, name: "Song B", artists: [{ name: "Artist B" }] }
      ] });
    }
  });
  assert.equal(resolves, 1);
  assert.equal(details, 2);
  assert.equal(result.missingCount, 0);
  assert.deepEqual(result.tracks.map(track => track.id), [2, 1]);
  const retries = events.filter(event => event.status === "retrying");
  assert.equal(retries.length, 1);
  assert.equal(retries[0].attempt, 2);
  assert.equal(retries[0].retryAfterMs, 1000);
  assert.match(retries[0].message, /503/);
  assert.doesNotMatch(retries[0].message, /internal upstream detail/);
});

test("caps transient HTTP retries at two attempts", async () => {
  let requests = 0;
  await assert.rejects(extractNeteasePlaylist("3112245660", {
    fetcher: async () => {
      requests += 1;
      return new Response("Unavailable", { status: 503 });
    }
  }), error => error instanceof NeteaseError && error.details.httpStatus === 503 && /HTTP 503/.test(error.message));
  assert.equal(requests, 2);
});

test("does not retry missing, private, restricted or unknown playlist errors", async context => {
  for (const [code, message] of [[404, /未找到/], [301, /匿名访问/], [401, /匿名访问/],
    [403, /匿名访问/], [-460, /限制了服务器请求/], [460, /限制了服务器请求/], [999, /999/]]) {
    await context.test(String(code), async () => {
      let requests = 0;
      await assert.rejects(extractNeteasePlaylist("3112245660", { fetcher: async () => {
        requests += 1;
        return jsonResponse({ code, msg: "private upstream detail" });
      } }), error => error instanceof NeteaseError && error.details.code === code &&
        message.test(error.message) && !JSON.stringify(error).includes("private upstream detail"));
      assert.equal(requests, 1);
    });
  }
});

test("does not retry HTTP access denials", async () => {
  let requests = 0;
  await assert.rejects(extractNeteasePlaylist("3112245660", { fetcher: async () => {
    requests += 1;
    return new Response("Forbidden", { status: 403 });
  } }), error => error.details.httpStatus === 403 && /HTTP 403/.test(error.message));
  assert.equal(requests, 1);
});

test("respects long Retry-After instead of retrying early or occupying a queue slot", async context => {
  for (const retryAfter of ["60", new Date(Date.now() + 60000).toUTCString()]) {
    await context.test(retryAfter, async () => {
      let requests = 0;
      await assert.rejects(extractNeteasePlaylist("3112245660", { fetcher: async () => {
        requests += 1;
        return new Response("Limited", { status: 429, headers: { "Retry-After": retryAfter } });
      } }), error => error.details.code === 429 && error.details.retryAfterMs > 2000);
      assert.equal(requests, 1);
    });
  }
});

test("retries a short rate limit once and honors Retry-After on an HTTP 200 business error", async () => {
  let requests = 0;
  const events = [];
  const result = await extractNeteasePlaylist("3112245660", {
    onProgress: event => events.push(event),
    fetcher: async url => {
      if (url.includes("/api/song/detail")) return jsonResponse({ code: 200, songs: [] });
      requests += 1;
      return requests === 1 ? new Response(JSON.stringify({ code: 429 }), {
        headers: { "Retry-After": "1.1" }
      }) : playlistFixture();
    }
  });
  assert.equal(requests, 2);
  assert.equal(events.find(event => event.status === "retrying").retryAfterMs, 1100);
  assert.equal(result.extractedCount, 2);
});

test("returns safe diagnostics for malformed or missing upstream JSON", async context => {
  for (const body of ["<html>private challenge URL</html>", "null", "{}", '{"code":"secret-url"}']) {
    await context.test(body, async () => {
      let requests = 0;
      await assert.rejects(extractNeteasePlaylist("3112245660", { fetcher: async () => {
        requests += 1;
        return new Response(body);
      } }), error => error instanceof NeteaseError && error.code === "playlist_fetch_failed" &&
        !JSON.stringify(error).includes("private challenge URL") && !JSON.stringify(error).includes("secret-url"));
      assert.equal(requests, 1);
    });
  }
});

test("retries transient network errors once without exposing transport details", async () => {
  let requests = 0;
  await assert.rejects(extractNeteasePlaylist("3112245660", { fetcher: async () => {
    requests += 1;
    throw new TypeError("private proxy configuration");
  } }), error => error instanceof NeteaseError && error.details.reason === "network" &&
    !JSON.stringify(error).includes("private proxy configuration"));
  assert.equal(requests, 2);
});

test("times out stalled playlist responses and clears request timers", async context => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let requests = 0;
  let onRetry;
  const retryStarted = new Promise(resolve => { onRetry = resolve; });
  let onRequest;
  const requestStarted = new Promise(resolve => { onRequest = resolve; });
  const operation = extractNeteasePlaylist("3112245660", {
    onProgress: event => { if (event.status === "retrying") onRetry(); },
    fetcher: async (_url, options) => {
      requests += 1;
      onRequest();
      if (requests > 1) return jsonResponse({ code: 404 });
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
      });
    }
  });
  const rejection = assert.rejects(operation, error => error.details.code === 404);
  await requestStarted;
  context.mock.timers.tick(12000);
  await retryStarted;
  await new Promise(resolve => setImmediate(resolve));
  context.mock.timers.tick(1000);
  await rejection;
  assert.equal(requests, 2);
  context.mock.timers.tick(12000);
});
