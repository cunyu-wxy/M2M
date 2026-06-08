import assert from "node:assert/strict";
import test from "node:test";

import { getQueueConfig, joinQueue, leaveQueue, touchQueueEntry } from "../src/queue.js";

test("queues excess parse jobs and promotes after release", () => {
  const queueState = { active: [], waiting: [], completedDurations: [] };
  const config = getQueueConfig({
    QUEUE_MAX_ACTIVE: "1",
    QUEUE_ACTIVE_TTL_SECONDS: "90",
    QUEUE_AVERAGE_SECONDS: "40"
  });
  const startedAt = 1_000_000;

  const first = joinQueue(queueState, { clientId: "client-a", ticketId: "ticket-a" }, startedAt, config);
  assert.equal(first.status, "active");
  assert.equal(first.activeCount, 1);

  const second = joinQueue(queueState, { clientId: "client-b", ticketId: "ticket-b" }, startedAt + 1000, config);
  assert.equal(second.status, "queued");
  assert.equal(second.position, 1);
  assert.equal(second.ahead, 0);

  const progress = touchQueueEntry(
    queueState,
    { clientId: "client-a", ticketId: "ticket-a", progress: 75, statusText: "读取歌曲详情" },
    startedAt + 2000,
    config
  );
  assert.equal(progress.status, "active");
  assert.equal(progress.frontProgress, 75);

  const waiting = touchQueueEntry(
    queueState,
    { clientId: "client-b", ticketId: "ticket-b" },
    startedAt + 3000,
    config
  );
  assert.equal(waiting.status, "queued");
  assert.equal(waiting.frontProgress, 75);
  assert.equal(waiting.etaSeconds, 10);

  const release = leaveQueue(
    queueState,
    { clientId: "client-a", ticketId: "ticket-a" },
    startedAt + 12000,
    config
  );
  assert.equal(release.status, "released");
  assert.equal(release.activeCount, 1);
  assert.equal(release.waitingCount, 0);

  const promoted = touchQueueEntry(
    queueState,
    { clientId: "client-b", ticketId: "ticket-b" },
    startedAt + 13000,
    config
  );
  assert.equal(promoted.status, "active");
});
