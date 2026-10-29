import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { renderAppHtml } from "../src/frontend.js";

function browserFixture() {
  const script = renderAppHtml().match(/<script>([\s\S]*?)<\/script>/)[1];
  let now = 1000000;
  const context = vm.createContext({ Date: { now: () => now }, Number, Error, AbortSignal,
    state: {}, waitForImportTurn: async () => {}, wait: async () => {}, setTrackStatus: () => {},
    recordFailedTrack: () => assert.fail("Token failure must not be reported as a song failure") });
  vm.runInContext(script.slice(script.indexOf("    async function ensureAppleDeveloperToken("),
    script.indexOf("    async function authorizeAppleMusic(")), context);
  vm.runInContext(script.slice(script.indexOf("    async function createApplePlaylist("),
    script.indexOf("    function resetImportMetrics(")), context);
  return { context, advance: milliseconds => { now += milliseconds; }, now: () => now };
}

test("browser coalesces token requests, uses POST without subscriber data and reuses unexpired credentials", async () => {
  const { context, now, advance } = browserFixture();
  let requests = 0;
  context.state.musicUserToken = "private-user-token";
  context.fetch = async (url, options) => {
    requests += 1;
    assert.equal(url, "/apple/developer-token");
    assert.equal(options.method, "POST");
    assert.equal(options.cache, "no-store");
    assert.equal(options.credentials, "same-origin");
    assert.equal(options.body, "{}");
    assert.ok(!JSON.stringify(options).includes("private-user-token"));
    return Response.json({ developerToken: "short-token-" + requests, expiresAt: now() / 1000 + 1800 });
  };
  const tokens = await Promise.all([context.ensureAppleDeveloperToken(), context.ensureAppleDeveloperToken()]);
  assert.deepEqual(tokens, ["short-token-1", "short-token-1"]);
  assert.equal(requests, 1);
  assert.equal(context.state.developerTokenPromise, null);
  advance(1500000);
  await context.ensureAppleDeveloperToken();
  assert.equal(requests, 1);
  advance(200000);
  assert.equal(await context.ensureAppleDeveloperToken(), "short-token-2");
});

test("token refresh recovers after errors and rejects expired or long-lived credentials", async () => {
  const { context, now } = browserFixture();
  context.fetch = () => { throw new Error("Synchronous network failure"); };
  await assert.rejects(context.ensureAppleDeveloperToken(), { name: "AppleTokenError" });
  assert.equal(context.state.developerTokenPromise, null);
  context.fetch = async () => Response.json({ error: { message: "limited" } }, { status: 429, headers: { "Retry-After": "42" } });
  await assert.rejects(context.ensureAppleDeveloperToken(), error => error.name === "AppleTokenError" && error.message.includes("42"));
  assert.equal(context.state.developerTokenPromise, null);
  for (const seconds of [0, 60, 43200]) {
    context.fetch = async () => Response.json({ developerToken: "invalid", expiresAt: now() / 1000 + seconds });
    await assert.rejects(context.ensureAppleDeveloperToken(), { name: "AppleTokenError" });
  }
  context.fetch = async () => Response.json({ developerToken: "recovered", expiresAt: now() / 1000 + 1800 });
  assert.equal(await context.ensureAppleDeveloperToken(), "recovered");
});

test("a long import refreshes before creating and appending without replacing the user token", async () => {
  const { context, now, advance } = browserFixture();
  const writes = [];
  let tokens = 0;
  context.fetch = async (url, options) => {
    if (url === "/apple/developer-token") {
      tokens += 1;
      return Response.json({ developerToken: "token-" + tokens, expiresAt: now() / 1000 + 1800 });
    }
    assert.equal(new URL(url).origin, "https://api.music.apple.com");
    assert.equal(options.headers["Music-User-Token"], "subscriber");
    writes.push(options.headers.Authorization);
    advance(1800000);
    return Response.json({ data: [{ id: "playlist" }] });
  };
  const playlist = await context.createApplePlaylist("Playlist", "subscriber", "NetEase");
  await context.addTracksToApplePlaylist(playlist, Array.from({ length: 51 }, (_, index) => ({
    source: { id: index }, apple: { id: String(index) }
  })), "subscriber", () => {});
  assert.deepEqual(writes, ["Bearer token-1", "Bearer token-2", "Bearer token-3"]);
});

test("token refresh failure aborts a batch instead of retrying every track or duplicating writes", async () => {
  const { context } = browserFixture();
  let calls = 0;
  context.fetch = async url => {
    calls += 1;
    assert.equal(url, "/apple/developer-token");
    return Response.json({ error: { message: "unavailable" } }, { status: 503 });
  };
  await assert.rejects(context.addTracksToApplePlaylist("playlist", [
    { source: { id: 1 }, apple: { id: "1" } }, { source: { id: 2 }, apple: { id: "2" } }
  ], "subscriber", () => {}), { name: "AppleTokenError" });
  assert.equal(calls, 1);
});
