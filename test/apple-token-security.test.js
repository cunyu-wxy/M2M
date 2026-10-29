import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.js";
import { createAppleDeveloperToken, createAppleWebDeveloperToken } from "../src/apple.js";
import { consumeTokenAllowance, clearExpiredTokenAllowances } from "../src/apple-token-limit.js";
import { QueueCoordinator } from "../src/queue.js";

const origin = "https://m2m.example";
const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const privateKey = Buffer.from(await crypto.subtle.exportKey("pkcs8", pair.privateKey)).toString("base64");
const credentials = { APPLE_TEAM_ID: "TESTTEAM00", APPLE_KEY_ID: "TESTKEY000",
  APPLE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\n" + privateKey + "\n-----END PRIVATE KEY-----" };
const claims = token => JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
const hash = index => index.toString(16).padStart(64, "0");

function storageFixture() {
  const data = new Map();
  let pending = Promise.resolve();
  const storage = {
    alarm: null,
    get: async key => structuredClone(data.get(key)),
    put: async (key, value) => { data.set(key, structuredClone(value)); },
    delete: async key => data.delete(key),
    setAlarm: async when => { storage.alarm = when; },
    transaction: operation => {
      const result = pending.then(() => operation(storage));
      pending = result.catch(() => {});
      return result;
    }
  };
  return storage;
}

function environment(allowance = { allowed: true }) {
  return { ...credentials, M2M_QUEUE: {
    idFromName: name => { assert.equal(name, "global"); return name; },
    get: () => ({ fetch: async request => {
      assert.equal(new URL(request.url).pathname, "/apple/token-limit");
      const payload = await request.json();
      assert.deepEqual(Object.keys(payload), ["clientHash"]);
      assert.match(payload.clientHash, /^[a-f0-9]{64}$/);
      assert.ok(!JSON.stringify(payload).includes("198.51.100.1"));
      return Response.json(allowance);
    } })
  } };
}

function tokenRequest(options = {}) {
  return new Request(origin + "/apple/developer-token", { method: "POST", headers: {
    Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": "198.51.100.1"
  }, ...options });
}

test("web tokens are signed, origin-bound, short-lived and independent of static server tokens", async () => {
  const env = { ...credentials, APPLE_DEVELOPER_TOKEN: "server-secret" };
  const result = await createAppleWebDeveloperToken(env, origin, 10000);
  assert.deepEqual(claims(result.developerToken), { iss: credentials.APPLE_TEAM_ID, iat: 10000, exp: 11800, origin: [origin] });
  const [header, payload, signature] = result.developerToken.split(".");
  assert.equal(await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pair.publicKey,
    Buffer.from(signature, "base64url"), new TextEncoder().encode(header + "." + payload)), true);
  assert.equal((await createAppleDeveloperToken(env)).developerToken, "server-secret");
  assert.equal(claims((await createAppleDeveloperToken(credentials, 10000)).developerToken).origin, undefined);
  assert.ok(!JSON.stringify(result).includes(privateKey));
});

test("web token lifetime is capped and server-only credentials never fall through to the browser", async () => {
  for (const [configured, expected] of [["999999", 3600], ["-1", 300], ["bad", 1800]]) {
    const result = await createAppleWebDeveloperToken({ ...credentials, APPLE_WEB_TOKEN_TTL_SECONDS: configured }, origin, 10000);
    assert.equal(result.expiresAt, 10000 + expected);
  }
  await assert.rejects(createAppleWebDeveloperToken({ APPLE_DEVELOPER_TOKEN: "never-expose" }, origin),
    error => error.code === "apple_credentials_missing" && !JSON.stringify(error).includes("never-expose"));
});

test("token route only issues with an allowed POST origin and JSON content type", async () => {
  for (const [options, status] of [
    [{ method: "GET" }, 405],
    [{ headers: { "Content-Type": "application/json" } }, 403],
    [{ headers: { Origin: "https://foreign.example", "Content-Type": "application/json" } }, 403],
    [{ headers: { Origin: "null", "Content-Type": "application/json" } }, 403],
    [{ headers: { Origin: origin, "Sec-Fetch-Site": "cross-site", "Content-Type": "application/json" } }, 403],
    [{ headers: { Origin: origin, "Content-Type": "text/plain" } }, 415]
  ]) {
    const result = await worker.fetch(tokenRequest(options), environment());
    assert.equal(result.status, status);
    assert.equal((await result.json()).developerToken, undefined);
  }
  const response = await worker.fetch(tokenRequest(), environment());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
  assert.deepEqual(claims((await response.json()).developerToken).origin, [origin]);
});

test("configured origin overrides worker aliases and rejects malformed origins", async () => {
  const env = { ...environment(), PUBLIC_ORIGIN: "https://custom.example" };
  assert.equal((await worker.fetch(tokenRequest(), env)).status, 403);
  const response = await worker.fetch(tokenRequest({ headers: { Origin: env.PUBLIC_ORIGIN, "Content-Type": "application/json" } }), env);
  assert.equal(response.status, 200);
  assert.deepEqual(claims((await response.json()).developerToken).origin, [env.PUBLIC_ORIGIN]);
  for (const invalid of ["https://custom.example/", "https://custom.example/path", "http://remote.example", "null", "https://user@custom.example"]) {
    assert.equal((await worker.fetch(tokenRequest(), { ...env, PUBLIC_ORIGIN: invalid })).status, 503);
  }
});

test("limiter denial exposes Retry-After but no token, and unavailable coordination fails closed", async () => {
  const limited = await worker.fetch(tokenRequest(), environment({ allowed: false, retryAfterMs: 2500 }));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("Retry-After"), "3");
  assert.equal((await limited.json()).developerToken, undefined);
  assert.equal((await worker.fetch(tokenRequest(), credentials)).status, 503);
  assert.equal((await worker.fetch(tokenRequest(), environment({}))).status, 503);
  const env = environment();
  env.M2M_QUEUE.get = () => ({ fetch: async () => { throw new Error("private internal error"); } });
  const failed = await worker.fetch(tokenRequest(), env);
  assert.equal(failed.status, 503);
  assert.ok(!(await failed.text()).includes("private internal"));
  assert.equal((await worker.fetch(new Request(origin + "/queue/apple/token-limit"), env)).status, 404);
});

test("concurrent issuance is bounded per client and persists across coordinator restarts", async () => {
  const storage = storageFixture();
  const now = Date.now();
  const outcomes = await Promise.all(Array.from({ length: 20 }, () => consumeTokenAllowance(storage, hash(1), now)));
  assert.equal(outcomes.filter(result => result.allowed).length, 12);
  assert.equal(outcomes.at(-1).retryAfterMs, 600000);
  assert.equal((await consumeTokenAllowance(storage, hash(2), now)).allowed, true);
  const coordinator = new QueueCoordinator({ storage }, {});
  const response = await coordinator.fetch(new Request("https://internal/apple/token-limit", {
    method: "POST", body: JSON.stringify({ clientHash: hash(1) })
  }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).allowed, false);
  assert.equal((await consumeTokenAllowance(storage, hash(1), now + 600000)).allowed, true);
});

test("global allowance limits distributed clients and permits requests after the window", async () => {
  const storage = storageFixture();
  for (let index = 1; index <= 120; index += 1) {
    assert.equal((await consumeTokenAllowance(storage, hash(index), 1000)).allowed, true);
  }
  assert.deepEqual(await consumeTokenAllowance(storage, hash(121), 1000), { allowed: false, retryAfterMs: 60000 });
  assert.equal((await consumeTokenAllowance(storage, hash(121), 61000)).allowed, true);
});

test("alarm cleanup removes expired counters without resetting fresh allowances", async () => {
  const storage = storageFixture();
  await consumeTokenAllowance(storage, hash(1), 1000);
  await consumeTokenAllowance(storage, hash(2), 301000);
  await clearExpiredTokenAllowances(storage, 601000);
  const state = await storage.get("apple-token-limits-v1");
  assert.equal(state.clients[hash(1)], undefined);
  assert.equal(state.clients[hash(2)].count, 1);
  assert.equal(storage.alarm, 901000);
  await clearExpiredTokenAllowances(storage, 901000);
  assert.equal(await storage.get("apple-token-limits-v1"), undefined);
});

test("client state stays bounded under address churn and never exceeds the storage value limit", async () => {
  const storage = storageFixture();
  for (let index = 1; index <= 500; index += 1) {
    const now = 1000 + Math.floor((index - 1) / 120) * 60000;
    assert.equal((await consumeTokenAllowance(storage, hash(index), now)).allowed, true);
  }
  assert.equal((await consumeTokenAllowance(storage, hash(501), 241000)).allowed, false);
  const state = await storage.get("apple-token-limits-v1");
  assert.equal(Object.keys(state.clients).length, 500);
  assert.ok(Buffer.byteLength(JSON.stringify(state)) < 128 * 1024);
  assert.equal((await consumeTokenAllowance(storage, hash(501), 601000)).allowed, true);
  await assert.rejects(consumeTokenAllowance(storage, "untrusted", 601000), { code: "invalid_token_client" });
});

test("signing errors never expose secret material in HTTP responses", async () => {
  const response = await worker.fetch(tokenRequest(), { ...environment(), APPLE_PRIVATE_KEY: "private-marker-invalid-pem" });
  assert.equal(response.status, 503);
  const body = await response.text();
  assert.ok(body.includes("apple_token_signing_failed"));
  assert.ok(!body.includes("private-marker"));
});
