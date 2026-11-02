import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import worker from "../src/index.js";
import { writeBuildVersion } from "../scripts/build-version.mjs";
import { verifyProduction } from "../scripts/verify-production.mjs";

const sha = "1234567890abcdef1234567890abcdef12345678";
const oldSha = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

test("build identity supports both CI providers, overwrites old output and rejects invalid metadata", async () => {
  const root = await mkdtemp(join(tmpdir(), "m2m-version-"));
  try {
    for (const env of [{ GITHUB_SHA: oldSha }, { WORKERS_CI_COMMIT_SHA: sha }]) {
      await writeBuildVersion({ root, env });
    }
    assert.equal(await readFile(join(root, "dist/version.js"), "utf8"), `export const GIT_SHA = "${sha}";\n`);
    await assert.rejects(writeBuildVersion({ root, env: { GITHUB_SHA: "secret-marker" } }), /valid Git commit SHA/);
    await assert.rejects(writeBuildVersion({ root, env: { GITHUB_SHA: sha, WORKERS_CI_COMMIT_SHA: oldSha } }), /disagree/);
    await assert.rejects(writeBuildVersion({ root, env: {} }), /Git commit SHA/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("health identifies built code independently of runtime variables and never returns credentials", async () => {
  const expected = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const response = await worker.fetch(new Request("https://m2m.example/health"), {
    GIT_SHA: oldSha, APPLE_PRIVATE_KEY: "private-marker", APPLE_DEVELOPER_TOKEN: "token-marker",
    CF_VERSION_METADATA: { id: "1be07e54-15ae-4d37-be7e-ba225808cb30", secret: "secret-marker" }
  });
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const text = await response.text();
  const health = JSON.parse(text);
  assert.deepEqual(health.version, { gitSha: expected, workerVersionId: "1be07e54-15ae-4d37-be7e-ba225808cb30" });
  assert.doesNotMatch(text, /private-marker|token-marker|secret-marker/);
  const local = await (await worker.fetch(new Request("https://m2m.example/health"), {})).json();
  assert.equal(local.version.workerVersionId, null);
});

async function fixture(t, { versions = [sha], healthy = true, insecure = false, redirect = false } = {}) {
  let healthCalls = 0;
  let tokenCalls = 0;
  const server = createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    if (req.url.startsWith("/health")) {
      const served = versions[Math.min(healthCalls++, versions.length - 1)];
      res.end(JSON.stringify({ ok: true, version: served ? { gitSha: served, workerVersionId: null } : undefined,
        appleConfigured: healthy, appleCatalogConfigured: healthy, queueConfigured: healthy }));
      return;
    }
    tokenCalls++;
    if (redirect) {
      res.writeHead(302, { Location: "/health" });
      res.end("{}");
      return;
    }
    const status = insecure ? 200 : req.method === "GET" ? 405 : !req.headers.origin || req.headers.origin === "https://foreign.invalid" ? 403 : 415;
    res.writeHead(status);
    res.end(JSON.stringify(insecure ? { developerToken: "never-log-this-token" } : { error: { code: status === 405 ? "method_not_allowed" : status === 403 ? "token_origin_denied" : "invalid_content_type" } }));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return { baseUrl: `http://127.0.0.1:${server.address().port}`, counts: () => ({ healthCalls, tokenCalls }) };
}

test("production verification waits for the exact SHA then checks rejection behavior without minting tokens", async t => {
  const site = await fixture(t, { versions: [oldSha, sha] });
  const report = await verifyProduction({ baseUrl: site.baseUrl, expectedSha: sha, attempts: 2, intervalMs: 0 });
  assert.equal(report.gitSha, sha);
  assert.equal(report.securityChecks, 4);
  assert.deepEqual(site.counts(), { healthCalls: 2, tokenCalls: 4 });
});

for (const [name, options] of [
  ["old code", { versions: [oldSha] }],
  ["unversioned code", { versions: [null] }],
  ["missing configuration", { healthy: false }],
  ["unsafe token endpoint", { insecure: true }],
  ["redirected token endpoint", { redirect: true }]
]) {
  test(`production verification fails closed for ${name} without logging response bodies`, async t => {
    const site = await fixture(t, options);
    await assert.rejects(verifyProduction({ baseUrl: site.baseUrl, expectedSha: sha, attempts: 1, intervalMs: 0 }), error => {
      assert.doesNotMatch(error.message, /never-log-this-token/);
      return true;
    });
  });
}
