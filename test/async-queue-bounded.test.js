import { test } from "node:test";
import assert from "node:assert/strict";
import { getEventListeners } from "node:events";
import { AsyncQueue, QueueClosedError, QueueFullError } from "../index.js";

const tick = () => new Promise((resolve) => setImmediate(resolve));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const settled = (promise) => {
  const state = { done: false };
  promise.then(() => (state.done = true), () => (state.done = true));
  return state;
};

// ---------- bounded queues and put() ----------

test("bounded(): capacity must be a positive integer", () => {
  for (const bad of [0, -1, 1.5, NaN, Infinity, "3", undefined, null]) {
    assert.throws(() => AsyncQueue.bounded(bad), RangeError, String(bad));
  }
  assert.equal(AsyncQueue.bounded(1).capacity, 1);
});

test("capacity and full: unbounded is Infinity/never full, bounded reports fullness", () => {
  const unbounded = AsyncQueue.from([1, 2, 3]);
  assert.equal(unbounded.capacity, Infinity);
  assert.equal(unbounded.full, false);

  const q = AsyncQueue.bounded(2);
  assert.equal(q.full, false);
  q.enqueue(1);
  assert.equal(q.full, false);
  q.enqueue(2);
  assert.equal(q.full, true);
});

test("bounded(capacity, iterable) starts with items; too many is a RangeError", () => {
  const q = AsyncQueue.bounded(3, [1, 2]);
  assert.equal(q.size(), 2);
  assert.throws(() => AsyncQueue.bounded(2, [1, 2, 3]), RangeError);
  assert.equal(AsyncQueue.bounded(2, [1, 2]).full, true);
});

test("enqueue on a full bounded queue throws QueueFullError and changes nothing", async () => {
  const q = AsyncQueue.bounded(2, [1, 2]);
  assert.throws(() => q.enqueue(3), QueueFullError);
  assert.equal(new QueueFullError().name, "QueueFullError");
  assert.equal(q.size(), 2);
  assert.equal(await q.take(), 1);
  assert.equal(await q.take(), 2);
  assert.equal(q.isEmpty(), true);
});

test("put resolves immediately while there is space", async () => {
  const q = AsyncQueue.bounded(2);
  const a = settled(q.put("a"));
  const b = settled(q.put("b"));
  await tick();
  assert.deepEqual([a.done, b.done], [true, true]);
  assert.equal(q.size(), 2);
});

test("put waits while full and resumes when a consumer takes an item", async () => {
  const q = AsyncQueue.bounded(1, ["first"]);
  const blocked = settled(q.put("second"));
  await tick();
  assert.equal(blocked.done, false, "producer is waiting for space");
  assert.equal(q.size(), 1, "the waiting item is not in the buffer yet");

  assert.equal(await q.take(), "first");
  await tick();
  assert.equal(blocked.done, true);
  assert.equal(q.size(), 1, "the freed slot was filled by the waiting producer");
  assert.equal(await q.take(), "second");
});

test("waiting producers are admitted in arrival order and items stay FIFO", async () => {
  const q = AsyncQueue.bounded(1, [0]);
  const puts = [1, 2, 3].map((v) => q.put(v));
  const out = [];
  for (let i = 0; i < 4; i++) out.push(await q.take());
  await Promise.all(puts);
  assert.deepEqual(out, [0, 1, 2, 3]);
});

test("put hands an item straight to a waiting consumer without buffering it", async () => {
  const q = AsyncQueue.bounded(1);
  const waiting = q.take();
  await q.put("direct");
  assert.equal(await waiting, "direct");
  assert.equal(q.size(), 0);
  assert.equal(q.full, false);
});

test("enqueue still hands off to a waiting consumer on a capacity-1 queue", async () => {
  const q = AsyncQueue.bounded(1);
  const waiting = q.take();
  q.enqueue("x");
  assert.equal(await waiting, "x");
});

test("backpressure: a fast producer never overfills while a slow consumer drains in order", async () => {
  const capacity = 5;
  const q = AsyncQueue.bounded(capacity);
  let maxSeen = 0;
  const producer = (async () => {
    for (let i = 0; i < 200; i++) {
      await q.put(i);
      maxSeen = Math.max(maxSeen, q.size());
    }
    q.close();
  })();
  const consumed = [];
  for await (const v of q) {
    consumed.push(v);
    if (v % 20 === 0) await tick(); // slow consumer
  }
  await producer;
  assert.deepEqual(consumed, Array.from({ length: 200 }, (_, i) => i));
  assert.ok(maxSeen <= capacity, `buffer reached ${maxSeen}`);
});

test("put({ signal }): an abort while waiting rejects and the item is never added", async () => {
  const q = AsyncQueue.bounded(1, ["kept"]);
  const ctrl = new AbortController();
  const pending = q.put("dropped", { signal: ctrl.signal });
  await tick();
  const reason = new Error("gave up");
  ctrl.abort(reason);
  await assert.rejects(pending, (error) => error === reason);
  assert.equal(await q.take(), "kept");
  assert.equal(q.size(), 0, "the aborted producer's item did not sneak in");
  await q.put("later");
  assert.equal(await q.take(), "later");
});

test("put({ signal }): a pre-aborted signal rejects even when there is space", async () => {
  const q = AsyncQueue.bounded(5);
  const ctrl = new AbortController();
  ctrl.abort();
  await assert.rejects(q.put("x", { signal: ctrl.signal }), { name: "AbortError" });
  assert.equal(q.size(), 0);
});

test("cancelling a middle producer keeps the others in order", async () => {
  const q = AsyncQueue.bounded(1, [0]);
  const ctrl = new AbortController();
  const a = q.put("a");
  const b = q.put("b", { signal: ctrl.signal });
  const c = q.put("c");
  await tick();
  ctrl.abort();
  await assert.rejects(b, { name: "AbortError" });
  const out = [];
  for (let i = 0; i < 3; i++) out.push(await q.take());
  await Promise.all([a, c]);
  assert.deepEqual(out, [0, "a", "c"]);
});

test("put cleans up abort listeners on admit, abort and close", async () => {
  const q = AsyncQueue.bounded(1, [0]);
  const admitted = new AbortController();
  const p1 = q.put(1, { signal: admitted.signal });
  assert.equal(getEventListeners(admitted.signal, "abort").length, 1);
  await q.take();
  await p1;
  assert.equal(getEventListeners(admitted.signal, "abort").length, 0, "after admit");

  const closed = new AbortController();
  const p2 = q.put(2, { signal: closed.signal });
  q.close();
  await assert.rejects(p2, QueueClosedError);
  assert.equal(getEventListeners(closed.signal, "abort").length, 0, "after close");
});

test("close rejects waiting producers (their items are dropped) but buffered items remain", async () => {
  const q = AsyncQueue.bounded(1, ["buffered"]);
  const blocked = q.put("never-added");
  await tick();
  q.close();
  await assert.rejects(blocked, QueueClosedError);
  assert.equal(await q.take(), "buffered");
  await assert.rejects(q.take(), QueueClosedError);
  await assert.rejects(q.put("after-close"), QueueClosedError);
});

test("an unbounded queue's put never waits", async () => {
  const q = new AsyncQueue();
  const results = await Promise.all(Array.from({ length: 1000 }, (_, i) => q.put(i)));
  assert.equal(results.length, 1000);
  assert.equal(q.size(), 1000);
});

test("several consumers on a bounded queue get every item exactly once", async () => {
  const q = AsyncQueue.bounded(3);
  const producer = (async () => {
    for (let i = 0; i < 300; i++) await q.put(i);
    q.close();
  })();
  const worker = async () => { const got = []; for await (const v of q) got.push(v); return got; };
  const all = (await Promise.all([worker(), worker(), worker()])).flat().sort((a, b) => a - b);
  await producer;
  assert.deepEqual(all, Array.from({ length: 300 }, (_, i) => i));
});
