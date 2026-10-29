import { AppleError } from "./apple.js";

const STORAGE_KEY = "apple-token-limits-v1";
const CLIENT_WINDOW_MS = 600000;
const GLOBAL_WINDOW_MS = 60000;
const CLIENT_LIMIT = 12;
const GLOBAL_LIMIT = 120;
const MAX_CLIENTS = 500;

export async function consumeTokenAllowance(storage, clientHash, now = Date.now()) {
  if (!/^[a-f0-9]{64}$/.test(clientHash || "")) {
    throw new AppleError(400, "invalid_token_client", "Invalid token request.");
  }
  return storage.transaction(async transaction => {
    const state = await transaction.get(STORAGE_KEY) || { clients: {} };
    for (const [key, entry] of Object.entries(state.clients)) {
      if (entry.expiresAt <= now) delete state.clients[key];
    }
    if (!state.global || state.global.expiresAt <= now) {
      state.global = { count: 0, expiresAt: now + GLOBAL_WINDOW_MS };
    }
    const client = state.clients[clientHash];
    let retryAt = 0;
    if (state.global.count >= GLOBAL_LIMIT) retryAt = state.global.expiresAt;
    if (client?.count >= CLIENT_LIMIT) retryAt = Math.max(retryAt, client.expiresAt);
    if (!client && Object.keys(state.clients).length >= MAX_CLIENTS) {
      retryAt = Math.max(retryAt, Math.min(...Object.values(state.clients).map(entry => entry.expiresAt)));
    }
    if (retryAt) return { allowed: false, retryAfterMs: retryAt - now };
    state.clients[clientHash] = client || { count: 0, expiresAt: now + CLIENT_WINDOW_MS };
    state.clients[clientHash].count += 1;
    state.global.count += 1;
    await transaction.put(STORAGE_KEY, state);
    await transaction.setAlarm(now + CLIENT_WINDOW_MS);
    return { allowed: true };
  });
}

export async function clearExpiredTokenAllowances(storage, now = Date.now()) {
  await storage.transaction(async transaction => {
    const state = await transaction.get(STORAGE_KEY);
    if (!state) return;
    for (const [key, entry] of Object.entries(state.clients)) {
      if (entry.expiresAt <= now) delete state.clients[key];
    }
    const deadlines = Object.values(state.clients).map(entry => entry.expiresAt);
    if (state.global?.expiresAt > now) deadlines.push(state.global.expiresAt);
    if (!deadlines.length) {
      await transaction.delete(STORAGE_KEY);
    } else {
      await transaction.put(STORAGE_KEY, state);
      await transaction.setAlarm(Math.max(...deadlines));
    }
  });
}
