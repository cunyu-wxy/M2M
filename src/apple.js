export class AppleError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.name = "AppleError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function createAppleDeveloperToken(env, now = Math.floor(Date.now() / 1000)) {
  const teamId = valueFromEnv(env, "APPLE_TEAM_ID");
  const keyId = valueFromEnv(env, "APPLE_KEY_ID");
  const privateKey = valueFromEnv(env, "APPLE_PRIVATE_KEY");

  if (!teamId || !keyId || !privateKey) {
    throw new AppleError(
      503,
      "apple_credentials_missing",
      "Apple Music app credentials are not configured on this Worker.",
      {
        requiredSiteSecrets: ["APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY"],
        note: "These are site-level Apple Music API credentials, not end-user Apple ID credentials."
      }
    );
  }

  const ttlSeconds = Number.parseInt(valueFromEnv(env, "APPLE_TOKEN_TTL_SECONDS") || "43200", 10);
  const header = { alg: "ES256", kid: keyId };
  const payload = {
    iss: teamId,
    iat: now,
    exp: now + (Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds : 43200)
  };
  const signingInput = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
  const key = await importApplePrivateKey(privateKey);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput)
  );

  return {
    developerToken: `${signingInput}.${base64UrlBytes(new Uint8Array(signature))}`,
    expiresAt: payload.exp
  };
}

export function hasAppleCredentials(env) {
  return Boolean(
    valueFromEnv(env, "APPLE_TEAM_ID") &&
      valueFromEnv(env, "APPLE_KEY_ID") &&
      valueFromEnv(env, "APPLE_PRIVATE_KEY")
  );
}

async function importApplePrivateKey(pem) {
  const keyData = pemToArrayBuffer(pem);
  return crypto.subtle.importKey(
    "pkcs8",
    keyData,
    {
      name: "ECDSA",
      namedCurve: "P-256"
    },
    false,
    ["sign"]
  );
}

function pemToArrayBuffer(pem) {
  const normalizedPem = pem.replace(/\\n/g, "\n");
  const base64 = normalizedPem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");

  if (!base64) {
    throw new AppleError(500, "invalid_apple_private_key", "Apple private key is empty or invalid.");
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function base64UrlJson(value) {
  return base64UrlBytes(new TextEncoder().encode(JSON.stringify(value)));
}

function base64UrlBytes(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function valueFromEnv(env, key) {
  return env && typeof env[key] === "string" ? env[key].trim() : "";
}
