import { test } from "node:test";
import assert from "node:assert/strict";
import { getEventListeners } from "node:events";
import { AsyncQueue, QueueClosedError } from "../index.js";

const tick = () => new Promise((resolve) => setImmediate(resolve));

test("take resolves buffered items in FIFO order", async () => {
  const q = new AsyncQueue(1, 2).enqueue(3);
  assert.equal(q.size(), 3);
  assert.deepEqual([await q.take(), await q.take(), await q.take()], [1, 2, 3]);
  assert.equal(q.isEmpty(), true);
});

test("take waits for an item to be enqueued", async () => {
  const q = new AsyncQueue();
  let got;
  const pending = q.take().then((v) => (got = v));
  await tick();
  assert.equal(got, undefined, "still waiting");
  q.enqueue("late");
  await pending;
  assert.equal(got, "late");
  assert.equal(q.size(), 0, "item went to the consumer, not the buffer");
});

test("waiting consumers are served in arrival order", async () => {
  const q = new AsyncQueue();
  const order = [];
  const a = q.take().then((v) => order.push(["a", v]));
  const b = q.take().then((v) => order.push(["b", v]));
  q.enqueue(1).enqueue(2);
  await Promise.all([a, b]);
  assert.deepEqual(order, [["a", 1], ["b", 2]]);
});

test("stored null and undefined are delivered, not mistaken for empty", async () => {
  const q = new AsyncQueue(null, undefined, 0);
  assert.deepEqual([await q.take(), await q.take(), await q.take()], [null, undefined, 0]);
  const waiting = q.take();
  q.enqueue(null);
  assert.equal(await waiting, null);
});

test("close rejects waiting consumers", async () => {
  const q = new AsyncQueue();
  const a = q.take();
  const b = q.take();
  q.close();
  await assert.rejects(a, QueueClosedError);
  await assert.rejects(b, QueueClosedError);
  assert.equal(q.closed, true);
});

test("buffered items can still be taken after close, then take rejects", async () => {
  const q = new AsyncQueue(1, 2);
  q.close();
  assert.equal(await q.take(), 1);
  assert.equal(await q.take(), 2);
  await assert.rejects(q.take(), QueueClosedError);
});

test("enqueue after close throws; close is idempotent", () => {
  const q = new AsyncQueue();
  assert.equal(q.close().close(), q);
  assert.throws(() => q.enqueue(1), QueueClosedError);
  assert.equal(new QueueClosedError().name, "QueueClosedError");
});

test("for await consumes buffered items and ends when closed", async () => {
  const q = AsyncQueue.from([1, 2, 3]);
  setTimeout(() => q.enqueue(4).close(), 5);
  const seen = [];
  for await (const v of q) seen.push(v);
  assert.deepEqual(seen, [1, 2, 3, 4]);
});

test("breaking out of for await leaves the rest in the queue", async () => {
  const q = AsyncQueue.from([1, 2, 3]);
  for await (const v of q) if (v === 1) break;
  assert.equal(q.size(), 2);
  assert.equal(await q.take(), 2);
});

test("producer and consumer run concurrently", async () => {
  const q = new AsyncQueue();
  const produced = Array.from({ length: 1000 }, (_, i) => i);
  const producer = (async () => {
    for (const v of produced) {
      q.enqueue(v);
      if (v % 100 === 0) await tick();
    }
    q.close();
  })();
  const consumed = [];
  for await (const v of q) consumed.push(v);
  await producer;
  assert.deepEqual(consumed, produced);
});

test("multiple consumers share the stream without duplicates", async () => {
  const q = AsyncQueue.from(Array.from({ length: 100 }, (_, i) => i));
  setTimeout(() => q.close(), 5);
  const worker = async () => { const got = []; for await (const v of q) got.push(v); return got; };
  const results = (await Promise.all([worker(), worker(), worker()])).flat().sort((a, b) => a - b);
  assert.deepEqual(results, Array.from({ length: 100 }, (_, i) => i));
});

test("take({ signal }): an already-aborted signal rejects and takes nothing", async () => {
  const q = new AsyncQueue(1);
  const ctrl = new AbortController();
  ctrl.abort();
  await assert.rejects(q.take({ signal: ctrl.signal }), { name: "AbortError" });
  assert.equal(q.size(), 1, "buffered item is untouched");
  assert.equal(await q.take(), 1);
});

test("take({ signal }): aborting while waiting rejects with the signal reason", async () => {
  const q = new AsyncQueue();
  const ctrl = new AbortController();
  const pending = q.take({ signal: ctrl.signal });
  const reason = new Error("shutting down");
  ctrl.abort(reason);
  await assert.rejects(pending, (error) => error === reason);
});

test("a cancelled take never swallows a later item", async () => {
  const q = new AsyncQueue();
  const ctrl = new AbortController();
  const cancelled = q.take({ signal: ctrl.signal });
  ctrl.abort();
  await assert.rejects(cancelled, { name: "AbortError" });
  q.enqueue("kept");
  assert.equal(q.size(), 1, "item is buffered, not handed to the cancelled consumer");
  assert.equal(await q.take(), "kept");
});

test("cancelling a middle waiter keeps the others in arrival order", async () => {
  const q = new AsyncQueue();
  const ctrl = new AbortController();
  const a = q.take();
  const b = q.take({ signal: ctrl.signal });
  const c = q.take();
  ctrl.abort();
  await assert.rejects(b, { name: "AbortError" });
  q.enqueue(1).enqueue(2);
  assert.deepEqual([await a, await c], [1, 2]);
});

test("abort after delivery has no effect and listeners are cleaned up", async () => {
  const q = new AsyncQueue();
  const ctrl = new AbortController();
  const pending = q.take({ signal: ctrl.signal });
  assert.equal(getEventListeners(ctrl.signal, "abort").length, 1);
  q.enqueue("done");
  assert.equal(await pending, "done");
  assert.equal(getEventListeners(ctrl.signal, "abort").length, 0, "listener removed on delivery");
  ctrl.abort(); // must not throw or reject anything
});

test("close removes abort listeners from waiting consumers", async () => {
  const q = new AsyncQueue();
  const ctrl = new AbortController();
  const pending = q.take({ signal: ctrl.signal });
  q.close();
  await assert.rejects(pending, QueueClosedError);
  assert.equal(getEventListeners(ctrl.signal, "abort").length, 0);
});

test("AbortSignal.timeout gives take a timeout without losing items", async () => {
  const q = new AsyncQueue();
  await assert.rejects(q.take({ signal: AbortSignal.timeout(10) }), { name: "TimeoutError" });
  q.enqueue(1);
  assert.equal(await q.take({ signal: AbortSignal.timeout(1000) }), 1);
});

test("many cancelled waits do not accumulate", async () => {
  const q = new AsyncQueue();
  for (let i = 0; i < 1000; i++) {
    const ctrl = new AbortController();
    const pending = q.take({ signal: ctrl.signal });
    ctrl.abort();
    await assert.rejects(pending);
  }
  q.enqueue("only");
  assert.equal(q.size(), 1, "no stale waiter consumed the item");
});
