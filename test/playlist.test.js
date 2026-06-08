import assert from "node:assert/strict";
import test from "node:test";

import {
  detectPlaylistSource,
  extractKugouPlaylistId,
  extractKuwoPlaylistId,
  extractPlaylist,
  extractQqPlaylistId
} from "../src/playlist.js";

test("detects supported playlist sources", () => {
  assert.equal(detectPlaylistSource("https://163cn.tv/8kPnBRH").key, "netease");
  assert.equal(detectPlaylistSource("https://y.qq.com/n3/other/pages/details/playlist.html?id=9380721229").key, "qq");
  assert.equal(detectPlaylistSource("https://m.kugou.com/songlist/gcid_3z164xx12zaz078/").key, "kugou");
  assert.equal(detectPlaylistSource("https://m.kuwo.cn/newh5app/playlist_detail/3222204231").key, "kuwo");
});

test("extracts platform playlist IDs", () => {
  assert.equal(extractQqPlaylistId("https://y.qq.com/n3/other/pages/details/playlist.html?id=9380721229"), "9380721229");
  assert.equal(extractKugouPlaylistId("https://m.kugou.com/songlist/gcid_3z164xx12zaz078/?src_cid=3z164xx12zaz078"), "gcid_3z164xx12zaz078");
  assert.equal(extractKuwoPlaylistId("https://m.kuwo.cn/newh5app/playlist_detail/3222204231?t=sinawb"), "3222204231");
});

test("extracts QQ Music playlists with a fake fetcher", async () => {
  const result = await extractPlaylist("https://y.qq.com/n3/other/pages/details/playlist.html?id=9380721229", {
    fetcher: async (url) => {
      assert.match(url, /disstid=9380721229/);
      return jsonResponse({
        code: 0,
        cdlist: [
          {
            disstid: "9380721229",
            dissname: "QQ test",
            nick: "tester",
            songnum: 1,
            songlist: [
              {
                songmid: "abc",
                songname: "Song A",
                singer: [{ name: "Artist A" }],
                albumname: "Album A",
                interval: "210"
              }
            ]
          }
        ]
      });
    }
  });

  assert.equal(result.source.key, "qq");
  assert.equal(result.playlist.name, "QQ test");
  assert.deepEqual(result.tracks[0], {
    index: 1,
    id: "abc",
    name: "Song A",
    artists: ["Artist A"],
    album: "Album A",
    durationMs: 210000,
    missing: false
  });
});

test("extracts Kugou preview tracks from share page data", async () => {
  const html = `<!doctype html><script> window.$output = ${JSON.stringify({
    encode_gic: "gcid_abc",
    info: {
      listinfo: {
        name: "喜欢",
        count: 2,
        list_create_username: "咿呀",
        pic: "http://c1.kgimg.com/stdmusic/{size}/cover.jpg"
      },
      songs: [
        {
          hash: "HASH_A",
          name: "歌手A - 歌曲A",
          singerinfo: [{ name: "歌手A" }],
          albuminfo: { name: "专辑A" },
          timelen: "123000"
        }
      ]
    }
  })}; </script>`;
  const result = await extractPlaylist("https://m.kugou.com/songlist/gcid_abc/", {
    fetcher: async () => new Response(html)
  });

  assert.equal(result.source.key, "kugou");
  assert.equal(result.limited, true);
  assert.equal(result.playlist.trackCount, 2);
  assert.deepEqual(result.tracks[0].artists, ["歌手A"]);
  assert.equal(result.tracks[0].name, "歌曲A");
});

test("extracts Kuwo playlists with a fake fetcher", async () => {
  const result = await extractPlaylist("https://m.kuwo.cn/newh5app/playlist_detail/3222204231", {
    fetcher: async (url, options) => {
      assert.match(url, /pid=3222204231/);
      assert.ok(options.headers.Secret);
      assert.match(options.headers.Cookie, /Hm_Iuvt_/);
      return jsonResponse({
        code: 200,
        data: {
          id: 3222204231,
          name: "Kuwo test",
          total: 1,
          userName: "tester",
          musicList: [
            {
              musicrid: "MUSIC_1",
              name: "Song A",
              artist: "Artist A&Artist B",
              album: "Album A",
              duration: "200"
            }
          ]
        }
      });
    }
  });

  assert.equal(result.source.key, "kuwo");
  assert.equal(result.playlist.name, "Kuwo test");
  assert.deepEqual(result.tracks[0].artists, ["Artist A", "Artist B"]);
  assert.equal(result.tracks[0].durationMs, 200000);
});

function jsonResponse(payload) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
