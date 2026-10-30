import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

export async function verifyProduction({ baseUrl, expectedSha, attempts = 30, intervalMs = 10000, timeoutMs = 10000 }) {
  if (!/^[a-f0-9]{40}$/i.test(expectedSha || "")) throw new Error("Expected a full Git commit SHA.");
  const site = new URL(baseUrl);
  if (site.username || site.password || site.search || site.hash || site.pathname !== "/" ||
      (site.protocol !== "https:" && !(site.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(site.hostname)))) {
    throw new Error("Production URL must be an HTTPS origin (HTTP is allowed only on loopback).");
  }
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 60 || !Number.isFinite(intervalMs) || intervalMs < 0) {
    throw new Error("Invalid verification retry settings.");
  }
  expectedSha = expectedSha.toLowerCase();
  const request = async (path, options = {}) => {
    const response = await fetch(new URL(path, site), {
      ...options, redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(timeoutMs),
      headers: { "Cache-Control": "no-cache", ...options.headers }
    });
    // Never include response bodies in exceptions: an old endpoint may return a token.
    let data;
    try { data = await response.json(); } catch { data = null; }
    return { response, data };
  };
  let health;
  let servedSha = "unknown";
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const { response, data } = await request("/health?m2m_verify=" + Date.now() + "-" + attempt);
      const sha = data?.version?.gitSha;
      servedSha = /^[a-f0-9]{40}$/.test(sha || "") ? sha : "unknown";
      if (response.status === 200 && response.headers.get("Cache-Control")?.includes("no-store") &&
          data?.ok === true && servedSha === expectedSha && data.appleConfigured === true &&
          data.appleCatalogConfigured === true && data.queueConfigured === true) {
        health = data;
        break;
      }
    } catch {
      // A build or route switch may be in progress; retry within the bounded window.
    }
    if (attempt + 1 < attempts) await delay(intervalMs);
  }
  if (!health) throw new Error(`Production version/readiness not verified: expected ${expectedSha}, observed ${servedSha}.`);

  // Rejection probes exercise the deployed router without issuing tokens or touching user data.
  const probes = [
    { name: "GET denied", status: 405, code: "method_not_allowed", options: {} },
    { name: "Missing Origin denied", status: 403, code: "token_origin_denied", options: { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" } },
    { name: "Foreign Origin denied", status: 403, code: "token_origin_denied", options: { method: "POST", headers: { Origin: "https://foreign.invalid", "Content-Type": "application/json" }, body: "{}" } },
    { name: "Non-JSON denied", status: 415, code: "invalid_content_type", options: { method: "POST", headers: { Origin: site.origin, "Content-Type": "text/plain" }, body: "{}" } }
  ];
  for (const probe of probes) {
    const { response, data } = await request("/apple/developer-token", probe.options);
    if (response.status !== probe.status || data?.error?.code !== probe.code || data?.developerToken !== undefined ||
        !response.headers.get("Cache-Control")?.includes("no-store")) {
      throw new Error(`Production security check failed: ${probe.name} (HTTP ${response.status}).`);
    }
  }
  const id = health.version.workerVersionId;
  return { gitSha: expectedSha, workerVersionId: /^[a-f0-9-]{36}$/i.test(id || "") ? id : null,
    securityChecks: probes.length, checkedAt: new Date().toISOString() };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await verifyProduction({ baseUrl: process.argv[2], expectedSha: process.argv[3],
      attempts: process.env.VERIFY_ATTEMPTS ? Number(process.env.VERIFY_ATTEMPTS) : 30 }), null, 2));
  } catch (error) {
    // The verifier's own messages contain status/SHA only; never dump a remote body.
    console.error(error.message);
    process.exitCode = 1;
  }
}
