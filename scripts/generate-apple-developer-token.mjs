#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { createSign } from "node:crypto";

const MAX_TTL_SECONDS = 180 * 24 * 60 * 60;

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  printHelp();
  process.exit(0);
}

const privateKeyPath = options["private-key"] || process.env.APPLE_PRIVATE_KEY_PATH;
const privateKey = process.env.APPLE_PRIVATE_KEY || readPrivateKey(privateKeyPath);
const teamId = options["team-id"] || process.env.APPLE_TEAM_ID;
const keyId = options["key-id"] || process.env.APPLE_KEY_ID || inferKeyId(privateKeyPath);
const ttlSeconds = parseTtlSeconds(options["ttl-days"], options["ttl-seconds"]);

if (!teamId) {
  fail("Missing --team-id or APPLE_TEAM_ID.");
}

if (!keyId) {
  fail("Missing --key-id or APPLE_KEY_ID. It can usually be inferred from AuthKey_<KEY_ID>.p8.");
}

if (!privateKey) {
  fail("Missing --private-key, APPLE_PRIVATE_KEY_PATH, or APPLE_PRIVATE_KEY.");
}

const issuedAt = Math.floor(Date.now() / 1000);
const expiresAt = issuedAt + ttlSeconds;
const header = { alg: "ES256", kid: keyId };
const payload = { iss: teamId, iat: issuedAt, exp: expiresAt };
const signingInput = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
const signature = createSign("SHA256")
  .update(signingInput)
  .end()
  .sign({ key: privateKey, dsaEncoding: "ieee-p1363" });
const token = `${signingInput}.${base64UrlBytes(signature)}`;

if (options.json) {
  console.log(
    JSON.stringify(
      {
        developerToken: token,
        keyId,
        teamId,
        expiresAt,
        expiresAtIso: new Date(expiresAt * 1000).toISOString()
      },
      null,
      2
    )
  );
} else {
  console.log(token);
}

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      continue;
    }

    const key = arg.slice(2);
    if (key === "help" || key === "json") {
      parsed[key] = true;
      continue;
    }

    parsed[key] = argv[index + 1];
    index += 1;
  }

  return parsed;
}

function readPrivateKey(path) {
  if (!path) {
    return "";
  }

  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    fail(`Unable to read private key: ${error.message}`);
  }
}

function inferKeyId(path) {
  if (!path) {
    return "";
  }

  const match = basename(path).match(/^AuthKey_([A-Z0-9]+)\.p8$/);
  return match ? match[1] : "";
}

function parseTtlSeconds(ttlDays, ttlSeconds) {
  const fromSeconds = Number.parseInt(ttlSeconds || "", 10);
  const fromDays = Number.parseInt(ttlDays || "", 10);
  const requestedTtl = Number.isFinite(fromSeconds)
    ? fromSeconds
    : Number.isFinite(fromDays)
      ? fromDays * 24 * 60 * 60
      : MAX_TTL_SECONDS;

  if (requestedTtl <= 0) {
    fail("TTL must be greater than zero.");
  }

  return Math.min(requestedTtl, MAX_TTL_SECONDS);
}

function base64UrlJson(value) {
  return base64UrlBytes(Buffer.from(JSON.stringify(value), "utf8"));
}

function base64UrlBytes(bytes) {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function printHelp() {
  console.log(`Usage:
  node scripts/generate-apple-developer-token.mjs --team-id TEAM_ID --private-key ~/share/AuthKey_<KEY_ID>.p8

Options:
  --team-id TEAM_ID        Apple Developer Team ID.
  --key-id KEY_ID          Apple Music API key ID. Inferred from AuthKey_<KEY_ID>.p8 when omitted.
  --private-key PATH       Path to the .p8 private key.
  --ttl-days DAYS          Token lifetime in days. Defaults to 180 and is capped at 180.
  --ttl-seconds SECONDS    Token lifetime in seconds.
  --json                   Print token metadata as JSON.
  --help                   Print this help.`);
}
