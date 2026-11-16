import assert from "node:assert/strict";
import vm from "node:vm";
import test from "node:test";

import { renderAppHtml } from "../src/frontend.js";

function functions() {
  const html = renderAppHtml();
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  new vm.Script(script);
  const context = vm.createContext({ URLSearchParams, Map, Date, Math, Number, Error,
    AbortSignal, state: {}, SEARCH_RETRY_MAX_MS: 15000, SEARCH_RETRY_BASE_MS: 1200 });
  const section = script.slice(script.indexOf("    async function searchAppleSongs("), script.indexOf("    async function createApplePlaylist("));
  vm.runInContext(section, context);
  vm.runInContext(script.slice(script.indexOf("    function createMatchMeter("), script.indexOf("    async function importToAppleMusic(")), context);
  return { script, context };
}

test("honors long Retry-After values instead of retrying before the server allows", () => {
  const { context } = functions();
  assert.equal(context.appleSearchRetryDelay({ retryAfterMs: 60000 }, 0), 60000);
});

test("playlist retries show the upstream reason and bounded retry progress", () => {
  const { script } = functions();
  const logs = [];
  const progress = [];
  const context = vm.createContext({ Math, state: {}, elements: { parseLog: {} },
    setParseProgress: (percent, message) => progress.push({ percent, message }),
    addLog: (_element, message) => logs.push(message), heartbeatQueue: () => {} });
  vm.runInContext(script.slice(script.indexOf("    function handleParseProgress("),
    script.indexOf("    function setParseProgress(")), context);
  context.handleParseProgress({ stage: "playlist", status: "retrying", attempt: 2,
    retryAfterMs: 1000, message: "网易云暂时无法返回歌单（错误码 503）" });
  assert.equal(progress[0].percent, 26);
  assert.match(progress[0].message, /1 秒后重试.*第 2 次/);
  assert.match(logs[0], /503/);
});

test("diagnostic download has an accessible Lucide icon and retains its upstream license", () => {
  const html = renderAppHtml();
  const button = html.match(/<button[^>]*id="downloadDiagnostics"[\s\S]*?<\/button>/)[0];
  assert.match(button, /aria-label="下载诊断 JSON"/);
  assert.match(button, /title="下载诊断 JSON"/);
  assert.match(button, /class="lucide lucide-download"/);
  assert.match(button, /aria-hidden="true"/);
  assert.match(button, /ISC License/);
  assert.match(button, /Cole Bemis/);
});

test("catalog search stays on the coordinated backend without sending the subscriber token", async () => {
  const { context } = functions();
  context.state = { developerToken: "developer-secret", musicUserToken: "subscriber-secret" };
  context.SEARCH_RESULT_LIMIT = 25;
  context.runAppleSearchWithRetry = async (_label, _limiter, operation) => operation();
  context.fetch = async (url, request) => {
    assert.equal(url, "/apple/catalog");
    assert.equal(request.method, "POST");
    assert.deepEqual(JSON.parse(request.body), { action: "search", storefront: "cn", term: "生きていたんだよな", limit: 25 });
    assert.ok(!JSON.stringify(request).includes("secret"));
    return new Response(JSON.stringify({ data: [{ id: "song" }] }), { status: 200 });
  };
  const result = await context.searchAppleSongs(null, "cn", "生きていたんだよな", new Map(), {});
  assert.equal(result[0].id, "song");
});

test("canceling a catalog operation does not turn the current track into a failed match", () => {
  const { script } = functions();
  const section = script.slice(script.indexOf("    async function matchAppleSongs("), script.indexOf("    async function findAppleSong("));
  const context = vm.createContext({ MATCH_CONCURRENCY: 1, Array, Promise });
  vm.runInContext(section, context);
  context.state = { importControl: { canceled: true } };
  context.waitForImportTurn = async () => {};
  context.findAppleSong = async () => { throw Object.assign(new Error("Canceled"), { name: "ImportCanceledError" }); };
  context.createImportCanceledError = () => Object.assign(new Error("Canceled"), { name: "ImportCanceledError" });
  context.createSearchLimiter = () => ({});
  context.recordFailedTrack = () => assert.fail("Cancellation must not be recorded as failure");
  context.setTrackStatus = () => {};
  context.readableError = error => error.message;
  context.SEARCH_REQUEST_INTERVAL_MS = 250;
  return assert.rejects(context.matchAppleSongs(null, "cn", [{ id: 1 }], () => {}), { name: "ImportCanceledError" });
});

test("exhausted rate-limit retries pause and retry the same track without inflating failure counts", async () => {
  const { script } = functions();
  const section = script.slice(script.indexOf("    async function matchAppleSongs("), script.indexOf("    async function findAppleSong("));
  const context = vm.createContext({ MATCH_CONCURRENCY: 1, SEARCH_REQUEST_INTERVAL_MS: 180, Array, Promise, Map });
  vm.runInContext(section, context);
  context.state = { importControl: { running: true, paused: false, canceled: false }, catalogCache: new Map() };
  context.createSearchLimiter = () => ({});
  context.waitForImportTurn = async () => { context.state.importControl.paused = false; };
  let calls = 0;
  let pauses = 0;
  context.findAppleSong = async () => {
    calls += 1;
    if (calls === 1) throw Object.assign(new Error("429"), { status: 429 });
    return { id: "matched" };
  };
  context.shouldRetryAppleSearch = error => error.status === 429;
  context.pauseForAppleSearch = () => { pauses += 1; context.state.importControl.paused = true; };
  context.recordFailedTrack = () => assert.fail("Transient errors must not become song failures");
  context.setTrackStatus = () => {};
  const result = await context.matchAppleSongs(null, "cn", [{ id: 1 }], () => {});
  assert.equal(pauses, 1);
  assert.equal(calls, 2);
  assert.equal(result.matched, 1);
  assert.equal(result.failed, 0);
});

test("backend network failures become retryable rather than missing songs", async () => {
  const { context } = functions();
  context.runAppleSearchWithRetry = async (_label, _limiter, operation) => operation();
  context.fetch = async () => { throw new TypeError("Network connection lost"); };
  await assert.rejects(context.requestAppleCatalog({ action: "search", term: "Song", storefront: "cn" }, {}),
    error => error.status === 503);
});

test("cancel waits for sibling match workers before an import can finish", async () => {
  const { script } = functions();
  const section = script.slice(script.indexOf("    async function matchAppleSongs("), script.indexOf("    async function findAppleSong("));
  const context = vm.createContext({ MATCH_CONCURRENCY: 2, SEARCH_REQUEST_INTERVAL_MS: 180, Array, Promise, Map });
  vm.runInContext(section, context);
  context.state = { importControl: { running: true, canceled: false }, catalogCache: new Map() };
  context.createSearchLimiter = () => ({});
  context.createImportCanceledError = () => Object.assign(new Error("Canceled"), { name: "ImportCanceledError" });
  context.waitForImportTurn = async () => { if (context.state.importControl.canceled) throw context.createImportCanceledError(); };
  let releaseSibling;
  const sibling = new Promise(resolve => { releaseSibling = resolve; });
  context.findAppleSong = async (_music, _region, source) => {
    if (source.id === 1) { context.state.importControl.canceled = true; throw context.createImportCanceledError(); }
    return sibling;
  };
  context.recordFailedTrack = () => assert.fail("Canceled songs must not be failures");
  context.setTrackStatus = () => {};
  let settled = false;
  const operation = context.matchAppleSongs(null, "cn", [{ id: 1 }, { id: 2 }], () => {}).finally(() => { settled = true; });
  const rejection = assert.rejects(operation, { name: "ImportCanceledError" });
  for (let iteration = 0; iteration < 12; iteration += 1) await Promise.resolve();
  assert.equal(settled, false);
  releaseSibling({ id: "late-result" });
  await rejection;
});

test("a second import cannot replace a running import's control", async () => {
  const { script } = functions();
  const section = script.slice(script.indexOf("    async function connectAppleMusic("), script.indexOf("    function configureMusicKit("));
  let reopened = null;
  const context = vm.createContext({ state: { parsed: {}, importControl: { running: true } },
    showView: view => { reopened = view; },
    validatePlaylistNameInput: () => assert.fail("must not start another import") });
  vm.runInContext(section, context);
  await context.connectAppleMusic();
  assert.equal(reopened, "import");
});

test("distinguishes an unavailable recording in the account region from an unconfirmed match", async () => {
  const { script } = functions();
  const section = script.slice(script.indexOf("    async function matchAppleSongs("), script.indexOf("    async function findAppleSong("));
  const context = vm.createContext({ MATCH_CONCURRENCY: 2, SEARCH_REQUEST_INTERVAL_MS: 80, Array, Promise, Map });
  vm.runInContext(section, context);
  context.state = { importControl: { running: true }, catalogCache: new Map() };
  context.createSearchLimiter = () => ({});
  context.waitForImportTurn = async () => {};
  context.findAppleSong = async (_music, _region, source, _cache, _limiter, onUnmatched) => {
    if (onUnmatched) onUnmatched({ reason: source.id === 1 ? "recording_unavailable" : "unconfirmed" });
    return null;
  };
  context.setTrackStatus = () => {};
  context.recordFailedTrack = () => {};
  const result = await context.matchAppleSongs(null, "us", [{ id: 1 }, { id: 2 }], () => {});
  assert.match(result.rows[0].reason, /目标地区.*同一录音/);
  assert.ok(result.rows[0].reason.includes("US"));
  assert.ok(!result.rows[0].reason.includes("版权"));
  assert.notEqual(result.rows[0].reason, result.rows[1].reason);
});

test("browser workers can keep four upstream requests busy without imposing the upstream throttle on cache hits", () => {
  const { script } = functions();
  const concurrency = Number(script.match(/const MATCH_CONCURRENCY = (\d+)/)[1]);
  const interval = Number(script.match(/const SEARCH_REQUEST_INTERVAL_MS = (\d+)/)[1]);
  assert.equal(concurrency, 8);
  assert.ok(interval > 0 && interval <= 100);
});

test("recent matching speed excludes pauses and remains stable beyond 400 and 1000 songs", () => {
  const { script } = functions();
  const section = script.slice(script.indexOf("    function createMatchMeter("), script.indexOf("    async function importToAppleMusic("));
  const context = vm.createContext({ Date, Math });
  vm.runInContext(section, context);
  assert.equal(typeof context.createMatchMeter, "function");
  let time = 0;
  const meter = context.createMatchMeter(() => time);
  let snapshot;
  for (let completed = 1; completed <= 1000; completed += 1) {
    if (completed === 401) {
      meter.pause();
      time += 120000;
      meter.resume();
    }
    time += 500;
    snapshot = meter.sample(completed);
    if ([100, 400, 500, 1000].includes(completed)) {
      assert.equal(snapshot.recentSpeed, 2);
      assert.equal(snapshot.averageSpeed, 2);
    }
  }
  assert.ok(snapshot.sampleCount <= 512);
});

test("recent speed detects a real slowdown rather than reporting only a lifetime average", () => {
  const { script } = functions();
  const section = script.slice(script.indexOf("    function createMatchMeter("), script.indexOf("    async function importToAppleMusic("));
  const context = vm.createContext({ Date, Math });
  vm.runInContext(section, context);
  let time = 0;
  const meter = context.createMatchMeter(() => time);
  let snapshot;
  for (let completed = 1; completed <= 500; completed += 1) {
    time += completed <= 400 ? 500 : 1000;
    snapshot = meter.sample(completed);
  }
  assert.equal(snapshot.recentSpeed, 1);
  assert.ok(snapshot.averageSpeed > snapshot.recentSpeed);
});

test("version alternatives remain pending rather than failed or silently selected", async () => {
  const { script } = functions();
  const section = script.slice(script.indexOf("    async function matchAppleSongs("), script.indexOf("    async function findAppleSong("));
  const context = vm.createContext({ MATCH_CONCURRENCY: 1, SEARCH_REQUEST_INTERVAL_MS: 80, Array, Promise, Map, Math });
  vm.runInContext(section, context);
  context.state = { importControl: { running: true }, catalogCache: new Map() };
  context.createSearchLimiter = () => ({});
  context.waitForImportTurn = async () => {};
  const candidate = { id: "alternative", type: "songs", attributes: { name: "Song (DJ版)", artistName: "Artist" }, confirmationReason: "version_mismatch" };
  context.findAppleSong = async (_music, _region, _source, _cache, _limiter, onUnmatched) => {
    onUnmatched({ reason: "version_mismatch", candidates: [candidate] });
    return null;
  };
  context.setTrackStatus = () => {};
  context.recordFailedTrack = () => assert.fail("An undecided candidate is not a failure");
  let progress;
  const result = await context.matchAppleSongs(null, "cn", [{ id: 1 }], value => { progress = value; });
  assert.equal(result.failed, 0);
  assert.equal(result.pending, 1);
  assert.equal(result.rows[0].apple, null);
  assert.equal(result.rows[0].status, "needs_review");
  assert.equal(result.rows[0].candidates[0].id, "alternative");
  assert.equal(progress.pending, 1);
});

test("catalog diagnostics are collected without exposing subscriber credentials", async () => {
  const { context } = functions();
  context.state = { developerToken: "developer-secret", musicUserToken: "subscriber-secret", catalogMetrics: {
    requests: 0, cacheHits: 0, totalRoundTripMs: 0, rateLimited: 0
  } };
  context.runAppleSearchWithRetry = async (_label, _limiter, operation) => operation();
  context.fetch = async (_url, request) => {
    assert.ok(!JSON.stringify(request).includes("secret"));
    return Response.json({ data: [], cacheHit: true, diagnostics: { intervalMs: 800, queueDepth: 3, cooldownMs: 0,
      elapsedMs: 2, rateLimitEvents: 1, token: "subscriber-secret", otherSearchTerms: ["private playlist"] } });
  };
  await context.requestAppleCatalog({ action: "search", storefront: "cn", term: "Song" }, {});
  assert.equal(context.state.catalogMetrics.requests, 1);
  assert.equal(context.state.catalogMetrics.cacheHits, 1);
  assert.equal(context.state.catalogMetrics.latest.intervalMs, 800);
  assert.ok(!JSON.stringify(context.state.catalogMetrics).includes("secret"));
  assert.ok(!JSON.stringify(context.state.catalogMetrics).includes("private playlist"));
});

for (const status of [500, 502, 503, 504]) {
  test("HTTP " + status + " backoff belongs only to the failing request", async () => {
    const { context } = functions();
    context.SEARCH_MAX_RETRIES = 2;
    context.noteAppleRateLimit = () => {};
    const delays = [];
    const penalties = [];
    context.waitWithImportControl = async delay => { delays.push(delay); };
    const limiter = { waitTurn: async () => {}, penalize: delay => { penalties.push(delay); } };
    let calls = 0;
    await assert.rejects(context.runAppleSearchWithRetry("catalog", limiter, async () => {
      calls += 1;
      throw Object.assign(new Error("Unavailable"), { status, retryAfterMs: 1200 });
    }), error => error.status === status);
    assert.equal(calls, 3);
    assert.deepEqual(penalties, []);
    assert.deepEqual(delays, [1200, 1200]);
  });
}

test("a sibling request proceeds through the real limiter during network backoff", async () => {
  const { context } = functions();
  let time = 0;
  context.Date = { now: () => time };
  context.SEARCH_MAX_RETRIES = 1;
  context.noteAppleRateLimit = () => {};
  context.waitForImportTurn = async () => {};
  let enteredBackoff;
  const backoffEntered = new Promise(resolve => { enteredBackoff = resolve; });
  let releaseBackoff;
  const backoff = new Promise(resolve => { releaseBackoff = resolve; });
  context.waitWithImportControl = async delay => {
    if (delay >= 1200) { enteredBackoff(); await backoff; }
    time += delay;
  };
  let calls = 0;
  context.fetch = async () => {
    calls += 1;
    if (calls === 1) throw new TypeError("Offline");
    return Response.json({ data: [] });
  };
  const limiter = context.createSearchLimiter(10);
  const failing = context.requestAppleCatalog({ action: "search", storefront: "cn", term: "Private song" }, limiter);
  await backoffEntered;
  let siblingFinished = false;
  const sibling = context.requestAppleCatalog({ action: "isrc", storefront: "us", isrcs: ["private-isrc"] }, limiter)
    .then(() => { siblingFinished = true; });
  for (let turn = 0; turn < 30; turn += 1) await Promise.resolve();
  try { assert.equal(siblingFinished, true); }
  finally { releaseBackoff(); await Promise.all([failing, sibling]); }
});

test("429 still penalizes the shared limiter and credentials never retry", async () => {
  const { context } = functions();
  context.SEARCH_MAX_RETRIES = 1;
  context.noteAppleRateLimit = () => {};
  context.waitWithImportControl = async () => assert.fail("429 uses the shared gate");
  const penalties = [];
  const limiter = { waitTurn: async () => {}, penalize: delay => { penalties.push(delay); } };
  let calls = 0;
  await context.runAppleSearchWithRetry("catalog", limiter, async () => {
    calls += 1;
    if (calls === 1) throw Object.assign(new Error("Throttled"), { status: 429, retryAfterMs: 60000 });
    return [];
  });
  assert.deepEqual(penalties, [60000]);
  calls = 0;
  await assert.rejects(context.runAppleSearchWithRetry("catalog", limiter, async () => {
    calls += 1;
    throw Object.assign(new Error("Credentials missing"), { status: 503, code: "apple_credentials_missing" });
  }), error => error.code === "apple_credentials_missing");
  assert.equal(calls, 1);
});

test("canceling request-local backoff stops retries and clears the active retry gauge", async () => {
  const { context, script } = functions();
  vm.runInContext(script.slice(script.indexOf("    async function waitForImportTurn("), script.indexOf("    function recordFailedTrack(")), context);
  context.SEARCH_MAX_RETRIES = 2;
  context.noteAppleRateLimit = () => {};
  context.state = { importControl: { canceled: false, paused: false }, catalogMetrics: {} };
  context.wait = async () => { context.state.importControl.canceled = true; };
  let calls = 0;
  await assert.rejects(context.runAppleSearchWithRetry("catalog", { waitTurn: async () => {}, penalize: () => {} }, async () => {
    calls += 1;
    throw Object.assign(new Error("Unavailable"), { status: 503 });
  }), { name: "ImportCanceledError" });
  assert.equal(calls, 1);
  assert.equal(context.state.catalogMetrics.activeRetries, 0);
});

test("request-local backoff honors a pause before retrying the same operation", async () => {
  const { context, script } = functions();
  vm.runInContext(script.slice(script.indexOf("    async function waitForImportTurn("), script.indexOf("    function recordFailedTrack(")), context);
  let time = 0;
  context.Date = { now: () => time };
  context.SEARCH_MAX_RETRIES = 1;
  context.noteAppleRateLimit = () => {};
  context.state = { importControl: { canceled: false, paused: false }, catalogMetrics: {} };
  let enteredPause;
  const paused = new Promise(resolve => { enteredPause = resolve; });
  let resume;
  const resumed = new Promise(resolve => { resume = resolve; });
  const waits = [];
  context.wait = async delay => {
    waits.push(delay);
    if (context.state.importControl.paused) { enteredPause(); await resumed; }
    time += delay;
  };
  let calls = 0;
  const operation = context.runAppleSearchWithRetry("catalog", { waitTurn: () => context.waitForImportTurn(), penalize: () => {} }, async () => {
    calls += 1;
    if (calls === 1) {
      context.state.importControl.paused = true;
      throw Object.assign(new Error("Unavailable"), { status: 503, retryAfterMs: 1200 });
    }
    return "matched";
  });
  await paused;
  assert.equal(calls, 1);
  assert.equal(context.state.catalogMetrics.activeRetries, 1);
  context.state.importControl.paused = false;
  resume();
  assert.equal(await operation, "matched");
  assert.equal(calls, 2);
  assert.ok(waits.includes(250));
  assert.equal(context.state.catalogMetrics.retries, 1);
  assert.equal(context.state.catalogMetrics.activeRetries, 0);
});

test("additive backend diagnostics on errors retain only finite allowlisted numbers and cache sources", async () => {
  const { context } = functions();
  const fields = ["elapsedMs", "queueWaitMs", "upstreamMs", "cacheReadMs", "cacheWriteMs", "intervalMs", "queueDepth",
    "activeRequests", "cooldownMs", "rateLimitEvents", "concurrencyLimit", "pendingRequests", "pendingLimit",
    "memoryCacheEntries", "memoryCacheBytes", "persistentCacheEntries", "persistentCacheBytes", "upstreamRequests",
    "upstreamFailures", "timeoutEvents", "serverUptimeMs", "persistentCacheErrors", "coalesced"];
  const diagnostics = Object.fromEntries(fields.map((field, index) => [field, index + 1]));
  const expected = { ...diagnostics, cacheSource: "persistent" };
  Object.assign(diagnostics, { token: "secret-token", source: "secret-song", userId: 12345, otherSearchTerms: ["secret-term"] });
  context.state = { catalogMetrics: {} };
  context.runAppleSearchWithRetry = async (_label, _limiter, operation) => operation();
  context.fetch = async () => Response.json({ error: { code: "busy" }, diagnostics, cacheSource: "persistent" }, { status: 503 });
  await assert.rejects(context.requestAppleCatalog({ action: "search", storefront: "cn", term: "secret-term" }, {}), error => {
    assert.ok(error.diagnostics, "Error diagnostics must be retained");
    assert.deepEqual(JSON.parse(JSON.stringify(error.diagnostics)), expected);
    return error.status === 503;
  });
  assert.deepEqual(JSON.parse(JSON.stringify(context.state.catalogMetrics.latest)), expected);
  context.recordCatalogDiagnostics({ diagnostics: { queueWaitMs: "10", upstreamMs: -1, cacheReadMs: Infinity,
    cacheWriteMs: NaN, coalesced: true, intervalMs: 0, cacheSource: "secret-term" } }, Date.now());
  assert.deepEqual(JSON.parse(JSON.stringify(context.state.catalogMetrics.latest)), { intervalMs: 0 });
  for (const cacheSource of ["memory", "persistent", "upstream", "coalesced"]) {
    context.recordCatalogDiagnostics({ diagnostics: { cacheSource } }, Date.now());
    assert.equal(context.state.catalogMetrics.latest.cacheSource, cacheSource);
  }
});

test("recent diagnostics measure rolling queries per song, latency percentiles and bounded samples", () => {
  const { context } = functions();
  let time = 0;
  context.Date = { now: () => time };
  context.state.catalogMetrics = {};
  context.catalogMetricsText(0);
  for (let index = 0; index < 600; index += 1) {
    time += 10;
    context.state.catalogMetrics.requests = index + 1;
    context.recordCatalogDiagnostics({ cacheHit: true, cacheSource: index % 2 ? "memory" : "persistent",
      diagnostics: { queueWaitMs: 10, upstreamMs: 20 } }, time - 100);
  }
  assert.equal(context.state.catalogMetrics.requestSamples.length, 512);
  context.catalogMetricsText(25);
  time += 31000;
  const durations = [10, 20, 30, 40, 100];
  for (const duration of durations) {
    context.state.catalogMetrics.requests += 1;
    context.recordCatalogDiagnostics({ diagnostics: { queueWaitMs: 2, upstreamMs: 4 } }, time - duration);
  }
  context.catalogMetricsText(50);
  const snapshot = context.catalogMetricsSnapshot(50);
  assert.equal(snapshot.recentRequestsPerSong, 0.2);
  assert.equal(snapshot.roundTripAverageMs, 40);
  assert.equal(snapshot.roundTripP95Ms, 100);
  assert.equal(snapshot.queueWaitAverageMs, 2);
  assert.equal(snapshot.upstreamAverageMs, 4);
  assert.equal(context.state.catalogMetrics.requestSamples.length, 5);
  assert.equal(snapshot.memoryCacheHits, 300);
  assert.equal(snapshot.persistentCacheHits, 300);
  assert.equal(snapshot.sharedCacheHits, 600);
  for (let completed = 51; completed <= 1000; completed += 1) context.catalogMetricsText(completed);
  for (const value of Object.values(context.state.catalogMetrics)) {
    if (Array.isArray(value)) assert.ok(value.length <= 512);
  }
});

test("round trip p95 is a percentile rather than the slowest request and averages omit missing timings", () => {
  const { context } = functions();
  context.Date = { now: () => 1000 };
  context.state.catalogMetrics = {};
  for (let duration = 1; duration <= 100; duration += 1) {
    context.recordCatalogDiagnostics({ diagnostics: duration <= 50 ? { queueWaitMs: 4, upstreamMs: 8 } : {} }, 1000 - duration);
  }
  const snapshot = context.catalogMetricsSnapshot(25);
  assert.equal(snapshot.roundTripAverageMs, 50.5);
  assert.equal(snapshot.roundTripP95Ms, 95);
  assert.equal(snapshot.queueWaitAverageMs, 4);
  assert.equal(snapshot.upstreamAverageMs, 8);
  assert.equal(snapshot.queueWaitSamples, 50);
  assert.equal(snapshot.upstreamSamples, 50);
});

test("warm cache responses do not dilute upstream and queue averages, including legacy cache hits", () => {
  const { context } = functions();
  context.Date = { now: () => 1000 };
  context.state.catalogMetrics = {};
  for (const cacheSource of ["memory", "persistent"]) {
    context.recordCatalogDiagnostics({ cacheSource, cacheHit: true, diagnostics: { queueWaitMs: 0, upstreamMs: 0,
      cacheReadMs: 2, cacheWriteMs: 0 } }, 990);
  }
  context.recordCatalogDiagnostics({ cacheHit: true, diagnostics: { queueWaitMs: 0, upstreamMs: 0 } }, 990);
  context.recordCatalogDiagnostics({ cacheSource: "upstream", cacheHit: false, diagnostics: { queueWaitMs: 10, upstreamMs: 100,
    cacheReadMs: 4, cacheWriteMs: 8 } }, 890);
  context.recordCatalogDiagnostics({ cacheSource: "coalesced", diagnostics: { queueWaitMs: 20, upstreamMs: 200 } }, 780);
  context.recordCatalogDiagnostics({ error: { code: "busy" }, diagnostics: { queueWaitMs: 30, upstreamMs: 300 } }, 670);
  context.recordCatalogDiagnostics({ cacheHit: false, diagnostics: { queueWaitMs: 40, upstreamMs: 400 } }, 560);
  const snapshot = context.catalogMetricsSnapshot(25);
  assert.equal(snapshot.queueWaitAverageMs, 25);
  assert.equal(snapshot.upstreamAverageMs, 250);
  assert.equal(snapshot.queueWaitSamples, 4);
  assert.equal(snapshot.upstreamSamples, 4);
  assert.equal(snapshot.roundTripSamples, 7);
  assert.equal(snapshot.cacheReadAverageMs, 8 / 3);
  assert.equal(snapshot.cacheWriteAverageMs, 8 / 3);
  assert.equal(snapshot.cacheReadSamples, 3);
  assert.equal(snapshot.cacheWriteSamples, 3);
});

test("per-track progress keeps rolling song windows bounded without creating log snapshots", () => {
  const { context } = functions();
  let time = 0;
  context.Date = { now: () => time };
  context.state.catalogMetrics = { startedAt: 0, requests: 0 };
  assert.equal(typeof context.recordCatalogProgress, "function");
  for (let completed = 1; completed <= 1000; completed += 1) {
    time += 1000;
    context.state.catalogMetrics.requests += completed <= 900 ? 10 : 1;
    context.recordCatalogProgress(completed);
    assert.ok(context.state.catalogMetrics.progressSamples.length <= 512);
  }
  assert.equal(context.state.catalogMetrics.completed, 1000);
  assert.equal(context.state.catalogMetrics.snapshots, undefined);
  const snapshot = context.catalogMetricsSnapshot(1000);
  assert.equal(snapshot.recentRequestsPerSong, 1);
  assert.equal(snapshot.recentSongs, 30);
  assert.equal(snapshot.recentRequests, 30);
  time += 31000;
  const idle = context.catalogMetricsSnapshot(1000);
  assert.equal(idle.recentRequests, 0);
  assert.equal(idle.recentSongs, 0);
  context.state.catalogMetrics = { requests: 0 };
  for (let completed = 1; completed <= 1000; completed += 1) {
    context.state.catalogMetrics.requests += 1;
    context.recordCatalogProgress(completed);
  }
  assert.equal(context.state.catalogMetrics.progressSamples.length, 512);
  assert.equal(context.state.catalogMetrics.snapshots, undefined);
});

test("primary diagnostics stay compact while details and export retain cache IO and error aggregates", async () => {
  const { context } = functions();
  context.state.catalogMetrics = { requests: 10, cacheHits: 8, persistentCacheHits: 6, localCacheHits: 2, serverErrors: 3,
    queriesByStorefront: { cn: 4, jp: 2, kr: 2, us: 2 }, rateLimited: 1 };
  context.elements = { catalogDiagnosticReadout: { textContent: "" } };
  context.recordCatalogDiagnostics({ cacheSource: "upstream", diagnostics: { queueWaitMs: 10, upstreamMs: 20, cacheReadMs: 4,
    cacheWriteMs: 8, intervalMs: 250, activeRequests: 2, concurrencyLimit: 4, queueDepth: 3, upstreamFailures: 6,
    timeoutEvents: 2, persistentCacheErrors: 3, memoryCacheBytes: 256, persistentCacheBytes: 512, serverUptimeMs: 60000 } }, Date.now() - 30);
  const primary = context.catalogMetricsText(25);
  assert.ok(primary.length <= 220, "Primary logs must stay compact on mobile");
  assert.ok(!/序列化缓存|服务运行|来源地区|cn 4/.test(primary));
  assert.match(primary, /缓存.*80%.*持久.*60%/);
  assert.match(primary, /429 1.*5xx 3.*超时 2/);
  const details = context.elements.catalogDiagnosticReadout.textContent;
  assert.match(details, /缓存读取均值 4ms.*写入均值 8ms/);
  assert.match(details, /上游失败 6.*超时 2.*持久缓存错误 3/);
  assert.match(details, /序列化缓存.*256B.*512B/);
  assert.match(details, /运行 60s/);
  assert.match(details, /cn 4/);
  assert.ok(details.includes("\n"));
  const snapshot = context.state.catalogMetrics.snapshots[0];
  assert.equal(snapshot.cacheReadAverageMs, 4);
  assert.equal(snapshot.cacheWriteAverageMs, 8);
  assert.equal(snapshot.backend.upstreamFailures, 6);
  assert.equal(snapshot.backend.timeoutEvents, 2);
  assert.equal(snapshot.backend.persistentCacheErrors, 3);
});

test("failed HTTP attempts count 5xx separately from 429 for compact diagnostics", async () => {
  const { context } = functions();
  context.state.catalogMetrics = {};
  context.runAppleSearchWithRetry = async (_label, _limiter, operation) => operation();
  for (const status of [429, 500, 502, 503, 504]) {
    context.fetch = async () => Response.json({ error: { code: "unavailable" }, diagnostics: { queueWaitMs: 5, upstreamMs: 50 } }, { status });
    await assert.rejects(context.requestAppleCatalog({ action: "search", storefront: "cn", term: "private" }, {}), error => error.status === status);
  }
  const snapshot = context.catalogMetricsSnapshot(25);
  assert.equal(snapshot.serverErrors, 4);
  assert.equal(snapshot.rateLimited, 1);
  assert.equal(snapshot.queueWaitAverageMs, 5);
  assert.equal(snapshot.upstreamAverageMs, 50);
});

test("request aggregates count only fixed storefront groups, target/source roles and search/ISRC operations", async () => {
  const { context } = functions();
  context.state.catalogMetrics = { targetStorefront: "us" };
  context.runAppleSearchWithRetry = async (_label, _limiter, operation) => operation();
  context.fetch = async () => Response.json({ data: [], cacheSource: "upstream" });
  const cache = new Map();
  const payloads = [{ action: "search", storefront: "cn", term: "secret-term" },
    { action: "search", storefront: "jp", term: "secret-term" },
    { action: "isrc", storefront: "kr", isrcs: ["secret-isrc"] },
    { action: "isrc", storefront: "us", isrcs: ["secret-isrc"] },
    { action: "search", storefront: "secret-region", term: "secret-term" }];
  for (const payload of payloads) await context.cachedAppleCatalog(payload, cache, {});
  await context.cachedAppleCatalog(payloads[0], cache, {});
  const snapshot = context.catalogMetricsSnapshot(25);
  assert.equal(snapshot.searchQueries, 3);
  assert.equal(snapshot.isrcQueries, 2);
  assert.equal(snapshot.targetQueries, 1);
  assert.equal(snapshot.sourceQueries, 4);
  assert.equal(snapshot.localCacheHits, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot.queriesByStorefront)), { cn: 1, jp: 1, kr: 1, us: 1, other: 1 });
  assert.ok(!JSON.stringify(snapshot).includes("secret"));
});

test("numeric coalescing identifies upstream ISRC batch siblings as well as duplicate waiters", () => {
  const { context } = functions();
  context.state.catalogMetrics = {};
  context.recordCatalogDiagnostics({ cacheSource: "upstream", diagnostics: { coalesced: 1 } }, Date.now());
  context.recordCatalogDiagnostics({ cacheSource: "coalesced", diagnostics: { coalesced: 1 } }, Date.now());
  context.recordCatalogDiagnostics({ cacheHit: true, cacheSource: "persistent", diagnostics: { coalesced: 0 } }, Date.now());
  const snapshot = context.catalogMetricsSnapshot(25);
  assert.equal(snapshot.coalescedResponses, 2);
  assert.equal(snapshot.sharedCacheHits, 1);
  assert.equal(snapshot.persistentCacheHits, 1);
});

test("target query counts remain accurate when the account storefront is grouped under other", async () => {
  const { context } = functions();
  context.state.catalogMetrics = { targetStorefront: "ru" };
  context.runAppleSearchWithRetry = async (_label, _limiter, operation) => operation();
  context.fetch = async () => Response.json({ data: [] });
  await context.requestAppleCatalog({ action: "search", storefront: "ru", term: "private" }, {});
  await context.requestAppleCatalog({ action: "search", storefront: "jp", term: "private" }, {});
  const snapshot = context.catalogMetricsSnapshot(25);
  assert.equal(snapshot.targetQueries, 1);
  assert.equal(snapshot.sourceQueries, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot.queriesByStorefront)), { other: 1, jp: 1 });
});

test("diagnostic download contains numeric aggregate snapshots, never raw logs or private state", async () => {
  const { context, script } = functions();
  const html = renderAppHtml();
  assert.ok(/id="downloadDiagnostics"[^>]*title=/.test(html), "Import toolbar needs an accessible diagnostic download");
  assert.ok(/elements\.downloadDiagnostics\.addEventListener\("click"/.test(script), "Diagnostic download must be wired up");
  let downloaded;
  let revoked;
  const link = { click() { downloaded = this.download; } };
  let blob;
  context.Blob = Blob;
  context.URL = { createObjectURL(value) { blob = value; return "blob:temporary"; }, revokeObjectURL(value) { revoked = value; } };
  context.document = { createElement: () => link };
  context.elements = { importLog: { textContent: "secret song https://private.example Authorization: secret-token" } };
  context.state = { clientId: "secret-user", developerToken: "secret-token", musicUserToken: "secret-token",
    parsed: { tracks: [{ name: "secret-song" }] }, catalogMetrics: { requests: 1, latest: {
      queueDepth: 2, userId: 12345, source: "secret-song", cacheSource: "persistent" } } };
  context.catalogMetricsText(25);
  Object.assign(context.state.catalogMetrics.snapshots[0], { userId: 12345, token: "secret-token", url: "https://private.example" });
  Object.assign(context.state.catalogMetrics.snapshots[0].backend, { source: "secret-song", userId: 12345 });
  context.state.catalogMetrics.snapshots[0].queriesByStorefront["secret-term"] = 12345;
  context.downloadCatalogDiagnostics();
  assert.equal(downloaded, "m2m-diagnostics.json");
  assert.equal(revoked, "blob:temporary");
  assert.equal(blob.type, "application/json");
  const text = await blob.text();
  assert.ok(!/secret|https:|Authorization|userId|cacheSource|12345/.test(text));
  const exported = JSON.parse(text);
  assert.equal(exported.aggregates.requests, 1);
  assert.equal(exported.aggregates.backend.queueDepth, 2);
  assert.equal(exported.logs.length, 1);
  function assertNumericLeaves(value) {
    for (const entry of Object.values(value)) {
      if (entry && typeof entry === "object") assertNumericLeaves(entry);
      else assert.ok(typeof entry === "number" && Number.isFinite(entry));
    }
  }
  assertNumericLeaves(exported);
});

test("partial and absent catalog diagnostics remain usable without reporting invented server values", () => {
  const { context } = functions();
  assert.doesNotThrow(() => context.catalogMetricsText(0));
  context.state.catalogMetrics = { requests: 2 };
  context.recordCatalogDiagnostics(null, Date.now());
  const text = context.catalogMetricsText(25);
  assert.ok(!/NaN|undefined|Infinity/.test(text));
  assert.ok(!/CPU.*\d|负载.*\d/.test(text));
  const snapshot = context.catalogMetricsSnapshot(25);
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot.backend)), {});
});

function reviewFunctions() {
  const { script } = functions();
  const created = [];
  const node = (tag = "div") => ({
    tagName: tag, children: [], textContent: "", hidden: true, disabled: false,
    append(...children) { this.children.push(...children); },
    appendChild(child) { this.children.push(child); },
    replaceChildren(...children) { this.children = children; },
    addEventListener() {},
    setAttribute(name, value) { this[name] = value; }
  });
  const elements = Object.fromEntries(["versionReviewPanel", "versionReviewPosition", "versionReviewSource", "versionReviewMetadata",
    "versionReviewReason", "versionReviewCandidates", "confirmVersion", "skipVersion", "skipAllVersions", "importTotal", "importMatched", "importSucceeded", "importFailed", "importLog", "appStatus"]
    .map(name => [name, node()]));
  const context = vm.createContext({ Array, Promise, Number, Math, String, URL, Date, Error,
    document: { createElement(tag) { const element = node(tag); created.push(element); return element; } },
    state: { importControl: { running: true, canceled: false } }, elements,
    waitForImportTurn: async () => {}, updateImportControlButtons: () => {}, setImportProgress: () => {},
    setTrackStatus: () => {}, addLog: () => {},
    recordFailedTrack: () => {},
    createImportCanceledError: () => Object.assign(new Error("Canceled"), { name: "ImportCanceledError" }) });
  const section = script.slice(script.indexOf("    function unmatchedReason("), script.indexOf("    async function findAppleSong("));
  vm.runInContext(section, context);
  return { script, context, elements, created };
}

function pendingRow(id = 1) {
  return { source: { id, index: id, name: "Song", artists: ["Artist"], album: "Album", durationMs: 160000 },
    apple: null, status: "needs_review", reason: "时长不一致", candidates: [{
      id: "alternative", type: "songs", confirmationReason: "duration_mismatch", attributes: {
        name: "Song", artistName: "Artist", albumName: "Album", durationInMillis: 210596,
        url: "https://music.apple.com/cn/song/123"
      }
    }] };
}

test("new imports clear previous diagnostic readouts and exported aggregates", () => {
  const { script, context, elements } = reviewFunctions();
  vm.runInContext(script.slice(script.indexOf("    function resetImportMetrics("), script.indexOf("    function setImportProgress(")), context);
  context.state.catalogMetrics = { requests: 99, snapshots: [{ requests: 99 }] };
  elements.failedTrackTable = { innerHTML: "" };
  elements.failedListCount = { textContent: "1" };
  elements.failedPanel = { hidden: false };
  elements.catalogDiagnosticReadout = { textContent: "Previous diagnostics" };
  context.resetImportMetrics();
  assert.equal(context.state.catalogMetrics, null);
  assert.equal(elements.catalogDiagnosticReadout.textContent, "-");
});

test("import progress updates diagnostic exports between log checkpoints without creating extra snapshots", async () => {
  const { script, context } = reviewFunctions();
  vm.runInContext(script.slice(script.indexOf("    function createMatchMeter("), script.indexOf("    async function findAppleSong(")), context);
  vm.runInContext(script.slice(script.indexOf("    async function searchAppleSongs("), script.indexOf("    async function createApplePlaylist(")), context);
  const tracks = Array.from({ length: 26 }, (_value, index) => ({ id: index + 1 }));
  let betweenLogs;
  context.Blob = Blob;
  context.URL = { createObjectURL(blob) { betweenLogs = blob; return "blob:diagnostics"; }, revokeObjectURL() {} };
  context.document = { createElement: () => ({ click() {} }) };
  context.matchAppleSongs = async (_music, _storefront, _tracks, onProgress) => {
    for (let completed = 1; completed <= 26; completed += 1) {
      context.state.catalogMetrics.requests += 1;
      onProgress({ completed, matched: completed, failed: 0, pending: 0 });
      if (completed === 12) context.downloadCatalogDiagnostics();
    }
    return { rows: tracks.map(source => ({ source, apple: { id: "matched" } })), matched: 26, failed: 0, pending: 0 };
  };
  context.createApplePlaylist = async () => "playlist";
  context.addTracksToApplePlaylist = async (_playlist, rows) => ({ succeeded: rows.length, failed: 0 });
  await context.importToAppleMusic({ storefrontId: "us" }, { tracks }, "private playlist");
  const exported = JSON.parse(await betweenLogs.text());
  assert.equal(exported.aggregates.completed, 12);
  assert.equal(exported.aggregates.requests, 12);
  assert.equal(exported.logs.length, 0);
  assert.equal(context.state.catalogMetrics.snapshots.length, 2);
  assert.equal(context.state.catalogMetrics.progressSamples.length, 27);
});

test("matching logs aggregate diagnostics every 25 songs and updates the compact readout", async () => {
  const { script, context, elements } = reviewFunctions();
  vm.runInContext(script.slice(script.indexOf("    function createMatchMeter("), script.indexOf("    async function findAppleSong(")), context);
  vm.runInContext(script.slice(script.indexOf("    async function searchAppleSongs("), script.indexOf("    async function createApplePlaylist(")), context);
  let time = 0;
  context.Date = { now: () => time };
  context.MATCH_CONCURRENCY = 1;
  context.SEARCH_MAX_RETRIES = 1;
  context.SEARCH_REQUEST_INTERVAL_MS = 80;
  context.SEARCH_RESULT_LIMIT = 25;
  context.AbortSignal = AbortSignal;
  context.readableError = error => error.message;
  context.state.catalogCache = new Map();
  context.createSearchLimiter = () => ({ waitTurn: async () => {}, penalize: () => {} });
  context.fetch = async () => {
    time += 100;
    return Response.json({ data: [{ id: "matched" }], cacheHit: true, cacheSource: "persistent", diagnostics: {
      queueWaitMs: 10, upstreamMs: 20, activeRequests: 2, concurrencyLimit: 4, queueDepth: 3, pendingRequests: 5,
      pendingLimit: 100, memoryCacheBytes: 256, memoryCacheEntries: 2, persistentCacheBytes: 512,
      persistentCacheEntries: 3, serverUptimeMs: 60000
    } });
  };
  context.findAppleSong = async (_music, _region, source, cache, limiter) => {
    await context.cachedAppleCatalog({ action: "search", storefront: "cn", term: "secret song " + source.id }, cache, limiter);
    const result = await context.cachedAppleCatalog({ action: "isrc", storefront: "us", isrcs: ["secret-isrc-" + source.id] }, cache, limiter);
    return result[0];
  };
  context.createApplePlaylist = async () => "private-playlist";
  context.addTracksToApplePlaylist = async (_playlist, rows) => ({ succeeded: rows.length, failed: 0 });
  elements.catalogDiagnosticReadout = { textContent: "-" };
  const logs = [];
  context.addLog = (_container, message) => { logs.push(message); };
  await context.importToAppleMusic({ storefrontId: "us" }, { tracks: Array.from({ length: 50 }, (_value, index) => ({ id: index + 1 })) }, "secret playlist");
  assert.ok(logs.some(message => /Workers.*CPU.*内存/.test(message)));
  const progressLogs = logs.filter(message => message.includes("近30秒查询"));
  assert.equal(progressLogs.length, 2);
  assert.ok(progressLogs[0].includes("25/50"));
  assert.ok(progressLogs[1].includes("50/50"));
  assert.match(progressLogs[1], /RTT 100ms \/ p95 100ms/);
  assert.match(progressLogs[1], /队列 - \/ 上游 -/);
  assert.match(progressLogs[1], /缓存 100%.*持久 100%.*本地 0/);
  assert.match(progressLogs[1], /活跃 2\/4.*排队 3/);
  const details = elements.catalogDiagnosticReadout.textContent;
  assert.match(details, /重试 0.*等待 0/);
  assert.match(details, /待处理 5\/100/);
  assert.match(details, /序列化缓存 内存 256B \/ 2 条.*持久 512B \/ 3 条/);
  assert.match(details, /运行 60s/);
  assert.match(details, /来源地区请求 50.*目标地区请求 50.*搜索 50 \/ ISRC 50/);
  assert.match(details, /cn 50.*us 50/);
  assert.ok(progressLogs.every(message => !message.includes("secret")));
  assert.ok(elements.catalogDiagnosticReadout.textContent.includes("p95 100ms"));
  assert.equal(context.state.catalogMetrics.snapshots.length, 2);
});

async function waitForReview(context) {
  for (let turn = 0; turn < 20 && !context.state.versionReview; turn += 1) await Promise.resolve();
  assert.ok(context.state.versionReview);
}

test("manual review renders generic candidate and track confirmation labels", () => {
  const html = renderAppHtml();
  const panel = html.match(/<section[^>]*id="versionReviewPanel"[\s\S]*?<\/section>/)[0];
  assert.match(panel, /<h3 id="versionReviewTitle">确认候选曲目<\/h3>/);
  assert.match(panel, /<button[^>]*id="confirmVersion"[^>]*disabled>确认选中曲目<\/button>/);
});

test("artist identity candidates wait for matching and explicit confirmation before import", async () => {
  const { script, context, elements, created } = reviewFunctions();
  const section = script.slice(script.indexOf("    function createMatchMeter("), script.indexOf("    async function findAppleSong("));
  vm.runInContext(section, context);
  context.MATCH_CONCURRENCY = 1;
  context.SEARCH_REQUEST_INTERVAL_MS = 80;
  context.state.catalogCache = new Map();
  context.createSearchLimiter = () => ({});
  context.catalogMetricsText = () => "";
  context.recordFailedTrack = () => assert.fail("An unconfirmed artist is not a failed match");
  const first = pendingRow(1).source;
  const second = pendingRow(2).source;
  const candidate = pendingRow().candidates[0];
  candidate.confirmationReason = "artist_mismatch";
  candidate.attributes.artistName = "Unconfirmed Artist";
  candidate.attributes.durationInMillis = first.durationMs;
  let finishMatching;
  const lastMatch = new Promise(resolve => { finishMatching = resolve; });
  let reachedLastTrack;
  const matchingLastTrack = new Promise(resolve => { reachedLastTrack = resolve; });
  context.findAppleSong = async (_music, _region, source, _cache, _limiter, onUnmatched) => {
    if (source.id === first.id) {
      onUnmatched({ reason: "artist_mismatch", candidates: [candidate] });
      return null;
    }
    reachedLastTrack();
    return lastMatch;
  };
  const progress = [];
  context.setImportProgress = (percent, label) => { progress.push({ percent, label }); };
  const imports = [];
  context.createApplePlaylist = async () => { imports.push("create"); return "playlist"; };
  context.addTracksToApplePlaylist = async (_playlistId, rows) => {
    imports.push("add");
    assert.deepEqual(Array.from(rows, row => row.source.id), [1, 2]);
    assert.deepEqual(Array.from(rows, row => row.apple.id), ["alternative", "automatic"]);
    return { succeeded: rows.length, failed: 0 };
  };
  const operation = context.importToAppleMusic({ storefrontId: "cn" }, { tracks: [first, second] }, "Playlist");
  await matchingLastTrack;
  assert.equal(elements.versionReviewPanel.hidden, true);
  assert.ok(!context.state.versionReview);
  assert.deepEqual(imports, []);
  finishMatching({ id: "automatic", type: "songs" });
  await waitForReview(context);
  const review = context.state.versionReview;
  const row = review.rows[0];
  assert.equal(row.status, "needs_review");
  assert.equal(row.apple, null);
  assert.equal(review.selectedIndex, -1);
  assert.equal(review.summary.matched, 1);
  assert.equal(review.summary.failed, 0);
  assert.equal(review.summary.pending, 1);
  assert.equal(elements.confirmVersion.disabled, true);
  assert.match(elements.versionReviewReason.textContent, /歌手署名无法可靠对应/);
  assert.ok(created.some(element => element.textContent.includes("歌手署名无法可靠对应")));
  assert.ok(created.filter(element => element.type === "radio").every(element => !element.checked));
  context.completeVersionChoice(false);
  assert.equal(row.apple, null);
  assert.deepEqual(imports, []);
  context.selectVersionCandidate(0);
  assert.equal(elements.confirmVersion.disabled, false);
  assert.equal(row.apple, null);
  assert.deepEqual(imports, []);
  context.completeVersionChoice(false);
  await operation;
  assert.equal(row.apple, candidate);
  assert.equal(row.confirmed, true);
  assert.deepEqual(imports, ["create", "add"]);
  assert.equal(context.state.versionReview, null);
  assert.equal(elements.versionReviewPanel.hidden, true);
  assert.ok(progress.some(update => update.percent === 70 && update.label === "待确认曲目 1 首"));
});

test("skipping an artist identity candidate records a generic failure with the artist reason", async () => {
  const { context } = reviewFunctions();
  const row = pendingRow();
  row.reason = context.unmatchedReason("artist_mismatch", "cn");
  row.candidates[0].confirmationReason = "artist_mismatch";
  const failures = [];
  context.recordFailedTrack = (source, reason) => { failures.push({ source, reason }); };
  const summary = { matched: 0, failed: 0, pending: 1 };
  const operation = context.reviewMatchedRows([row], summary);
  await waitForReview(context);
  assert.equal(failures.length, 0);
  context.completeVersionChoice(true);
  await operation;
  assert.equal(row.apple, null);
  assert.equal(row.status, "not_found");
  assert.deepEqual(summary, { matched: 0, failed: 1, pending: 0 });
  assert.deepEqual(failures, [{ source: row.source, reason: "已跳过候选曲目：已找到候选，但歌手署名无法可靠对应" }]);
});

test("manual confirmation requires an explicit selection and preserves the source track order", async () => {
  const { context, elements } = reviewFunctions();
  assert.equal(typeof context.reviewMatchedRows, "function");
  const first = { ...pendingRow(1), apple: { id: "automatic" }, status: "matched" };
  const second = pendingRow(2);
  const summary = { matched: 1, failed: 0, pending: 1 };
  const operation = context.reviewMatchedRows([first, second], summary);
  await waitForReview(context);
  assert.equal(second.apple, null);
  assert.equal(elements.confirmVersion.disabled, true);
  context.completeVersionChoice(false);
  assert.equal(second.apple, null);
  context.selectVersionCandidate(0);
  assert.equal(elements.confirmVersion.disabled, false);
  context.completeVersionChoice(false);
  await operation;
  assert.equal(second.apple.id, "alternative");
  assert.equal(second.confirmed, true);
  assert.equal(first.apple.id, "automatic");
  assert.equal(summary.matched, 2);
  assert.equal(summary.pending, 0);
  assert.equal(context.state.versionReview, null);
});

test("skipping remaining alternatives records failures only after the user's decision", async () => {
  const { context } = reviewFunctions();
  let failures = 0;
  context.recordFailedTrack = () => { failures += 1; };
  const rows = [pendingRow(1), pendingRow(2)];
  const summary = { matched: 0, failed: 0, pending: 2 };
  const operation = context.reviewMatchedRows(rows, summary);
  await waitForReview(context);
  assert.equal(failures, 0);
  context.skipRemainingVersions();
  await operation;
  assert.equal(failures, 2);
  assert.equal(summary.failed, 2);
  assert.equal(summary.pending, 0);
  assert.ok(rows.every(row => !row.apple && row.status === "not_found"));
});

test("canceling version review rejects the import without selecting or failing pending songs", async () => {
  const { context } = reviewFunctions();
  context.recordFailedTrack = () => assert.fail("Cancellation is not a failure");
  const row = pendingRow();
  const operation = context.reviewMatchedRows([row], { matched: 0, failed: 0, pending: 1 });
  const rejection = assert.rejects(operation, { name: "ImportCanceledError" });
  await waitForReview(context);
  context.cancelVersionReview();
  await rejection;
  assert.equal(row.apple, null);
  assert.equal(context.state.versionReview, null);
});

test("candidate metadata remains text and untrusted links are not navigable", async () => {
  const { context, created } = reviewFunctions();
  const row = pendingRow();
  row.candidates[0].attributes.name = "<img src=x onerror=alert(1)>";
  row.candidates[0].attributes.url = "javascript:alert(1)";
  const operation = context.reviewMatchedRows([row], { matched: 0, failed: 0, pending: 1 });
  await waitForReview(context);
  assert.ok(created.some(element => element.textContent.includes("<img src=x")));
  assert.ok(created.every(element => !element.innerHTML));
  assert.ok(created.every(element => !element.href || element.href.startsWith("https://music.apple.com/")));
  context.skipRemainingVersions();
  await operation;
});

test("1000 log updates retain bounded rows and coalesce forced layout reads into one animation frame", () => {
  const { script } = functions();
  const section = script.slice(script.indexOf("    function addLog("), script.indexOf("    function downloadParsedJson("));
  const frames = [];
  let layoutReads = 0;
  const container = {
    children: [],
    appendChild(row) { this.children.push(row); row.remove = () => { this.children.splice(this.children.indexOf(row), 1); }; },
    get firstElementChild() { return this.children[0]; },
    get scrollHeight() { layoutReads += 1; return 100; }
  };
  const context = vm.createContext({ Date, Math, WeakSet, state: {}, document: { createElement: () => ({}) },
    requestAnimationFrame: callback => frames.push(callback), escapeHtml: text => text });
  vm.runInContext(section, context);
  for (let index = 0; index < 1000; index += 1) context.addLog(container, "Query " + index);
  assert.equal(container.children.length, 100);
  assert.equal(layoutReads, 0);
  assert.equal(frames.length, 1);
  frames[0]();
  assert.equal(layoutReads, 1);
  context.addLog(container, "Next frame");
  assert.equal(frames.length, 2);
});
