const QUEUE_STORAGE_KEY = "m2m-queue-state-v1";
const DEFAULT_MAX_ACTIVE = 2;
const DEFAULT_ACTIVE_TTL_SECONDS = 90;
const DEFAULT_AVERAGE_SECONDS = 45;
const MAX_DURATION_SAMPLES = 20;

export class QueueCoordinator {
  constructor(state, env) {
    this.state = state;
    this.env = env || {};
  }

  async fetch(request) {
    const requestUrl = new URL(request.url);
    const action = requestUrl.pathname.replace(/^\/+/, "");
    const payload =
      request.method === "GET"
        ? Object.fromEntries(requestUrl.searchParams.entries())
        : await readJsonBody(request);
    const queueState = await loadQueueState(this.state.storage);
    const config = getQueueConfig(this.env);
    const now = Date.now();

    normalizeQueue(queueState, now, config);

    let result;
    if (action === "join") {
      result = joinQueue(queueState, payload, now, config);
    } else if (action === "status" || action === "heartbeat") {
      result = touchQueueEntry(queueState, payload, now, config);
    } else if (action === "leave") {
      result = leaveQueue(queueState, payload, now, config);
    } else {
      return jsonResponse({ error: { code: "not_found", message: "Queue route not found." } }, 404);
    }

    await saveQueueState(this.state.storage, queueState);
    return jsonResponse(result);
  }
}

export function getQueueConfig(env = {}) {
  return {
    maxActive: positiveInteger(env.QUEUE_MAX_ACTIVE, DEFAULT_MAX_ACTIVE),
    activeTtlMs: positiveInteger(env.QUEUE_ACTIVE_TTL_SECONDS, DEFAULT_ACTIVE_TTL_SECONDS) * 1000,
    averageSeconds: positiveInteger(env.QUEUE_AVERAGE_SECONDS, DEFAULT_AVERAGE_SECONDS)
  };
}

export function joinQueue(queueState, payload, now, config = getQueueConfig()) {
  const clientId = normalizeId(payload.clientId);
  const ticketId = normalizeId(payload.ticketId);
  if (!clientId) {
    return {
      status: "error",
      error: { code: "missing_client_id", message: "Missing queue client ID." }
    };
  }

  let entry = findEntry(queueState, ticketId, clientId);
  if (!entry) {
    entry = {
      ticketId: ticketId || createTicketId(),
      clientId,
      joinedAt: now,
      lastSeenAt: now,
      activatedAt: null,
      progress: 0,
      statusText: "等待服务器解析名额"
    };

    if (queueState.active.length < config.maxActive) {
      activateEntry(queueState, entry, now);
    } else {
      queueState.waiting.push(entry);
    }
  } else {
    updateEntry(entry, payload, now);
  }

  promoteQueue(queueState, now, config);
  return buildQueueStatus(queueState, entry.ticketId, clientId, now, config);
}

export function touchQueueEntry(queueState, payload, now, config = getQueueConfig()) {
  const clientId = normalizeId(payload.clientId);
  const ticketId = normalizeId(payload.ticketId);
  const entry = findEntry(queueState, ticketId, clientId);

  if (!entry) {
    promoteQueue(queueState, now, config);
    return {
      status: "missing",
      ticketId,
      clientId,
      ...queueSummary(queueState, now, config)
    };
  }

  updateEntry(entry, payload, now);
  promoteQueue(queueState, now, config);
  return buildQueueStatus(queueState, entry.ticketId, clientId, now, config);
}

export function leaveQueue(queueState, payload, now, config = getQueueConfig()) {
  const clientId = normalizeId(payload.clientId);
  const ticketId = normalizeId(payload.ticketId);
  const activeIndex = findEntryIndex(queueState.active, ticketId, clientId);
  const waitingIndex = findEntryIndex(queueState.waiting, ticketId, clientId);
  let released = false;

  if (activeIndex >= 0) {
    const [entry] = queueState.active.splice(activeIndex, 1);
    if (entry.activatedAt) {
      recordDuration(queueState, Math.max(1, Math.round((now - entry.activatedAt) / 1000)));
    }
    released = true;
  }

  if (waitingIndex >= 0) {
    queueState.waiting.splice(waitingIndex, 1);
    released = true;
  }

  promoteQueue(queueState, now, config);
  return {
    status: released ? "released" : "missing",
    ticketId,
    clientId,
    ...queueSummary(queueState, now, config)
  };
}

function normalizeQueue(queueState, now, config) {
  queueState.active = queueState.active.filter((entry) => now - entry.lastSeenAt <= config.activeTtlMs);
  queueState.waiting = queueState.waiting.filter((entry) => now - entry.lastSeenAt <= config.activeTtlMs * 2);
  promoteQueue(queueState, now, config);
}

function promoteQueue(queueState, now, config) {
  while (queueState.active.length < config.maxActive && queueState.waiting.length > 0) {
    activateEntry(queueState, queueState.waiting.shift(), now);
  }
}

function activateEntry(queueState, entry, now) {
  entry.activatedAt = now;
  entry.lastSeenAt = now;
  entry.progress = 0;
  entry.statusText = "已获得服务器解析名额";
  queueState.active.push(entry);
}

function updateEntry(entry, payload, now) {
  entry.lastSeenAt = now;
  if (payload.progress !== undefined) {
    entry.progress = clampProgress(payload.progress);
  }
  if (payload.statusText) {
    entry.statusText = String(payload.statusText).slice(0, 80);
  }
}

function buildQueueStatus(queueState, ticketId, clientId, now, config) {
  const activeIndex = findEntryIndex(queueState.active, ticketId, clientId);
  const waitingIndex = findEntryIndex(queueState.waiting, ticketId, clientId);
  const summary = queueSummary(queueState, now, config);

  if (activeIndex >= 0) {
    return {
      status: "active",
      ticketId: queueState.active[activeIndex].ticketId,
      clientId,
      position: 0,
      ahead: 0,
      etaSeconds: 0,
      ...summary
    };
  }

  if (waitingIndex >= 0) {
    const ahead = waitingIndex;
    return {
      status: "queued",
      ticketId: queueState.waiting[waitingIndex].ticketId,
      clientId,
      position: waitingIndex + 1,
      ahead,
      etaSeconds: estimateWaitSeconds(queueState, ahead, config),
      ...summary
    };
  }

  return {
    status: "missing",
    ticketId,
    clientId,
    ...summary
  };
}

function queueSummary(queueState, now, config) {
  const activeProgress = queueState.active.map((entry) => ({
    progress: clampProgress(entry.progress),
    statusText: entry.statusText || "",
    elapsedSeconds: entry.activatedAt ? Math.max(0, Math.round((now - entry.activatedAt) / 1000)) : 0
  }));
  const frontProgress = activeProgress.length
    ? Math.round(activeProgress.reduce((sum, entry) => sum + entry.progress, 0) / activeProgress.length)
    : 100;

  return {
    activeCount: queueState.active.length,
    waitingCount: queueState.waiting.length,
    maxActive: config.maxActive,
    averageSeconds: averageDuration(queueState, config),
    frontProgress,
    activeProgress
  };
}

function estimateWaitSeconds(queueState, ahead, config) {
  const averageSeconds = averageDuration(queueState, config);
  const frontProgress = queueState.active.length
    ? queueState.active.reduce((sum, entry) => sum + clampProgress(entry.progress), 0) / queueState.active.length
    : 0;
  const activeRemaining = Math.max(8, Math.round(averageSeconds * (1 - frontProgress / 100)));
  const fullWavesAhead = Math.floor(ahead / Math.max(config.maxActive, 1));
  return activeRemaining + fullWavesAhead * averageSeconds;
}

function averageDuration(queueState, config) {
  if (!queueState.completedDurations.length) {
    return config.averageSeconds;
  }

  const sum = queueState.completedDurations.reduce((total, seconds) => total + seconds, 0);
  return Math.max(8, Math.round(sum / queueState.completedDurations.length));
}

function recordDuration(queueState, seconds) {
  queueState.completedDurations.push(seconds);
  if (queueState.completedDurations.length > MAX_DURATION_SAMPLES) {
    queueState.completedDurations.splice(0, queueState.completedDurations.length - MAX_DURATION_SAMPLES);
  }
}

function findEntry(queueState, ticketId, clientId) {
  return (
    findEntryById(queueState.active, ticketId, clientId) ||
    findEntryById(queueState.waiting, ticketId, clientId)
  );
}

function findEntryById(entries, ticketId, clientId) {
  if (ticketId) {
    const byTicket = entries.find((entry) => entry.ticketId === ticketId);
    if (byTicket && (!clientId || byTicket.clientId === clientId)) {
      return byTicket;
    }
  }

  return clientId ? entries.find((entry) => entry.clientId === clientId) : null;
}

function findEntryIndex(entries, ticketId, clientId) {
  if (ticketId) {
    const byTicket = entries.findIndex(
      (entry) => entry.ticketId === ticketId && (!clientId || entry.clientId === clientId)
    );
    if (byTicket >= 0) {
      return byTicket;
    }
  }

  return clientId ? entries.findIndex((entry) => entry.clientId === clientId) : -1;
}

async function loadQueueState(storage) {
  const stored = await storage.get(QUEUE_STORAGE_KEY);
  return {
    active: Array.isArray(stored && stored.active) ? stored.active : [],
    waiting: Array.isArray(stored && stored.waiting) ? stored.waiting : [],
    completedDurations: Array.isArray(stored && stored.completedDurations)
      ? stored.completedDurations.filter((value) => Number.isFinite(value) && value > 0)
      : []
  };
}

async function saveQueueState(storage, queueState) {
  await storage.put(QUEUE_STORAGE_KEY, queueState);
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function positiveInteger(value, fallbackValue) {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallbackValue;
}

function normalizeId(value) {
  return typeof value === "string" ? value.trim() : "";
}

function createTicketId() {
  if (globalThis.crypto && globalThis.crypto.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return "ticket-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}

function clampProgress(value) {
  const progress = Number(value);
  if (!Number.isFinite(progress)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(progress)));
}
