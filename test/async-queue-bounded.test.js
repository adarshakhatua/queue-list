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

// ---------- takeBatch() ----------

test("takeBatch takes the buffered items up to max, in order", async () => {
  const q = AsyncQueue.from([1, 2, 3, 4, 5]);
  assert.deepEqual(await q.takeBatch({ max: 3 }), [1, 2, 3]);
  assert.deepEqual(await q.takeBatch({ max: 10 }), [4, 5]);
  assert.equal(q.size(), 0);
});

test("takeBatch without max takes everything buffered", async () => {
  const q = AsyncQueue.from([1, 2, 3]);
  assert.deepEqual(await q.takeBatch(), [1, 2, 3]);
});

test("takeBatch waits for the first item, then returns without lingering", async () => {
  const q = new AsyncQueue();
  const pending = q.takeBatch({ max: 10 });
  await tick();
  q.enqueue("a");
  assert.deepEqual(await pending, ["a"]);
});

test("takeBatch with a timeout collects items that arrive within the window", async () => {
  const q = new AsyncQueue();
  setTimeout(() => q.enqueue(1), 5);
  setTimeout(() => q.enqueue(2), 15);
  setTimeout(() => q.enqueue(3), 300); // after the 80 ms window
  const batch = await q.takeBatch({ max: 10, timeout: 80 });
  assert.deepEqual(batch, [1, 2]);
  assert.equal(await q.take(), 3, "the late item was not lost");
});

test("takeBatch returns early once max items are collected", async () => {
  const q = new AsyncQueue();
  setTimeout(() => q.enqueue(1), 5);
  setTimeout(() => q.enqueue(2), 10);
  const started = Date.now();
  const batch = await q.takeBatch({ max: 2, timeout: 5000 });
  assert.deepEqual(batch, [1, 2]);
  assert.ok(Date.now() - started < 2000, "did not wait out the window");
});

test("takeBatch leaves no timer running after it returns", async () => {
  const q = AsyncQueue.from([1]);
  const timers = () => process.getActiveResourcesInfo().filter((name) => name === "Timeout").length;
  const before = timers();
  await q.takeBatch({ max: 1, timeout: 60_000 }); // max reached immediately
  const q2 = new AsyncQueue();
  setTimeout(() => q2.enqueue(1), 5);
  await q2.takeBatch({ max: 2, timeout: 20 });
  await sleep(5);
  assert.equal(timers(), before);
});

test("takeBatch on a closed queue returns what is buffered, then rejects", async () => {
  const q = AsyncQueue.from([1, 2, 3]);
  q.close();
  assert.deepEqual(await q.takeBatch({ max: 2, timeout: 5000 }), [1, 2], "does not linger once closed");
  assert.deepEqual(await q.takeBatch({ max: 2 }), [3]);
  await assert.rejects(q.takeBatch({ max: 2 }), QueueClosedError);
});

test("closing during the linger window returns the partial batch", async () => {
  const q = new AsyncQueue(1);
  setTimeout(() => q.close(), 10);
  assert.deepEqual(await q.takeBatch({ max: 5, timeout: 5000 }), [1]);
});

test("takeBatch({ signal }): abort before the first item rejects and takes nothing", async () => {
  const q = new AsyncQueue();
  const ctrl = new AbortController();
  const pending = q.takeBatch({ max: 3, signal: ctrl.signal });
  await tick();
  ctrl.abort();
  await assert.rejects(pending, { name: "AbortError" });
  q.enqueue("kept");
  assert.equal(await q.take(), "kept");

  const pre = new AbortController();
  pre.abort();
  const full = AsyncQueue.from([1, 2]);
  await assert.rejects(full.takeBatch({ signal: pre.signal }), { name: "AbortError" });
  assert.equal(full.size(), 2);
});

test("takeBatch({ signal }): abort while lingering returns the partial batch, losing nothing", async () => {
  const q = AsyncQueue.from([1, 2]);
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 10);
  const batch = await q.takeBatch({ max: 10, timeout: 5000, signal: ctrl.signal });
  assert.deepEqual(batch, [1, 2]);
  assert.equal(getEventListeners(ctrl.signal, "abort").length, 0);
  q.enqueue(3);
  assert.equal(await q.take(), 3);
});

test("takeBatch frees space for waiting producers as it takes items", async () => {
  const q = AsyncQueue.bounded(2, [1, 2]);
  const p3 = q.put(3);
  const p4 = q.put(4);
  await tick();
  assert.deepEqual(await q.takeBatch({ max: 4 }), [1, 2, 3, 4]);
  await Promise.all([p3, p4]);
  assert.equal(q.size(), 0);
});

test("takeBatch validates max and timeout", async () => {
  const q = AsyncQueue.from([1]);
  for (const max of [0, -1, 1.5, NaN, "2"]) {
    await assert.rejects(q.takeBatch({ max }), RangeError, `max=${max}`);
  }
  for (const timeout of [-1, NaN, Infinity, "5"]) {
    await assert.rejects(q.takeBatch({ timeout }), RangeError, `timeout=${timeout}`);
  }
  assert.equal(q.size(), 1, "invalid options take nothing");
  assert.deepEqual(await q.takeBatch({ max: Infinity }), [1]);
});

test("concurrent batch consumers get disjoint batches covering every item", async () => {
  const q = AsyncQueue.from(Array.from({ length: 100 }, (_, i) => i));
  setTimeout(() => q.close(), 20);
  const worker = async () => {
    const got = [];
    while (true) {
      try { got.push(...(await q.takeBatch({ max: 7, timeout: 5 }))); } catch { return got; }
    }
  };
  const all = (await Promise.all([worker(), worker(), worker()])).flat().sort((a, b) => a - b);
  assert.deepEqual(all, Array.from({ length: 100 }, (_, i) => i));
});
