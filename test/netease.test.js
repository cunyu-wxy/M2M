import assert from "node:assert/strict";
import test from "node:test";

import { buildTracks, extractNeteasePlaylist, extractPlaylistIdFromText } from "../src/netease.js";

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

  const result = await extractNeteasePlaylist("486271477", {
    fetcher: fakeFetch,
    throttleMs: 0
  });

  assert.equal(result.playlist.id, 486271477);
  assert.equal(result.extractedCount, 2);
  assert.equal(result.missingCount, 0);
  assert.deepEqual(
    result.tracks.map((track) => `${track.name} - ${track.artists.join("/")}`),
    ["Song A - Artist A", "Song B - Artist B"]
  );
});

function jsonResponse(payload) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
