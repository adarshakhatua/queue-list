import { test } from "node:test";
import assert from "node:assert/strict";
import Queue, { Queue as Named } from "../index.js";

test("default and named exports are the same class", () => {
  assert.equal(Queue, Named);
});

test("empty queue", () => {
  const q = new Queue();
  assert.equal(q.size(), 0);
  assert.equal(q.length, 0);
  assert.equal(q.isEmpty(), true);
  assert.equal(q.dequeue(), null);
  assert.equal(q.peek(), null);
  assert.deepEqual(q.toArray(), []);
  assert.equal(q.toString(), "Front -> [] <- Rear");
});

test("constructor items keep FIFO order", () => {
  const q = new Queue(1, "a", { k: 1 });
  assert.equal(q.size(), 3);
  assert.equal(q.dequeue(), 1);
  assert.equal(q.dequeue(), "a");
  assert.deepEqual(q.dequeue(), { k: 1 });
  assert.equal(q.dequeue(), null);
});

test("enqueue is chainable and peek does not remove", () => {
  const q = new Queue();
  assert.equal(q.enqueue(1).enqueue(2).enqueue(3), q);
  assert.equal(q.peek(), 1);
  assert.equal(q.size(), 3);
});

test("single element: head and tail reset correctly", () => {
  const q = new Queue(1);
  assert.equal(q.dequeue(), 1);
  assert.equal(q.isEmpty(), true);
  q.enqueue(2).enqueue(3);
  assert.deepEqual(q.toArray(), [2, 3]);
});

test("reuse after draining and after clear()", () => {
  const q = new Queue(1, 2);
  q.dequeue(); q.dequeue();
  q.enqueue(9);
  assert.deepEqual(q.toArray(), [9]);
  assert.equal(q.clear(), q);
  assert.equal(q.isEmpty(), true);
  assert.equal(q.peek(), null);
  q.enqueue(5);
  assert.deepEqual(q.toArray(), [5]);
});

test("interleaved operations", () => {
  const q = new Queue();
  q.enqueue(1).enqueue(2);
  assert.equal(q.dequeue(), 1);
  q.enqueue(3);
  assert.equal(q.dequeue(), 2);
  assert.equal(q.dequeue(), 3);
  assert.equal(q.dequeue(), null);
});

test("stored null/undefined/falsy values survive", () => {
  const q = new Queue(0, "", false, null, undefined);
  assert.equal(q.size(), 5);
  assert.deepEqual(q.toArray(), [0, "", false, null, undefined]);
  assert.equal(q.dequeue(), 0);
  assert.equal(q.peek(), "");
  assert.equal(q.isEmpty(), false);
});

test("iterable: for...of, spread, Queue.from", () => {
  const q = Queue.from([1, 2, 3]);
  assert.deepEqual([...q], [1, 2, 3]);
  const seen = [];
  for (const v of q) seen.push(v);
  assert.deepEqual(seen, [1, 2, 3]);
  assert.equal(q.size(), 3, "iteration does not consume the queue");
  assert.deepEqual(Queue.from(new Set([1, 1, 2])).toArray(), [1, 2]);
});

test("drain consumes items front first, including stored null", () => {
  const q = new Queue(1, null, undefined, 0);
  assert.deepEqual([...q.drain()], [1, null, undefined, 0]);
  assert.equal(q.isEmpty(), true);
  assert.equal(q.peek(), null);
  assert.deepEqual([...q.drain()], [], "draining an empty queue yields nothing");
  q.enqueue("reused");
  assert.deepEqual(q.toArray(), ["reused"], "queue is usable after drain");
});

test("drain yields items enqueued while draining", () => {
  const q = new Queue(1);
  const seen = [];
  for (const v of q.drain()) {
    seen.push(v);
    if (v < 3) q.enqueue(v + 1);
  }
  assert.deepEqual(seen, [1, 2, 3]);
  assert.equal(q.size(), 0);
});

test("breaking out of drain leaves the rest in the queue", () => {
  const q = Queue.from([1, 2, 3, 4]);
  for (const v of q.drain()) {
    if (v === 2) break;
  }
  assert.deepEqual(q.toArray(), [3, 4]);
});

test("matches an array model across growth, wraparound and shrinking", () => {
  const q = new Queue();
  const model = [];
  let next = 0;
  let seed = 12345; // deterministic LCG so failures are reproducible
  const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  for (let step = 0; step < 50_000; step++) {
    // bias flips over time so the queue repeatedly grows large and drains
    const enqueueBias = Math.floor(step / 5000) % 2 === 0 ? 0.7 : 0.3;
    if (rand() < enqueueBias) {
      q.enqueue(next);
      model.push(next++);
    } else {
      assert.equal(q.dequeue(), model.length ? model.shift() : null);
    }
    assert.equal(q.size(), model.length);
    assert.equal(q.peek(), model.length ? model[0] : null);
  }
  assert.deepEqual(q.toArray(), model);
});

test("dequeued items are not retained", () => {
  const q = new Queue({ a: 1 }, { b: 2 });
  q.dequeue();
  q.dequeue();
  assert.deepEqual(q.toArray(), []);
  assert.equal(q.peek(), null);
});

test("iterating while the queue changes never skips or repeats items", () => {
  const q = Queue.from([1, 2, 3]);
  const seen = [];
  for (const v of q) {
    seen.push(v);
    if (v === 1) q.dequeue(); // remove the item being visited
    if (v === 2) q.enqueue(4); // append while iterating
  }
  assert.deepEqual(seen, [1, 2, 3, 4]);

  const big = Queue.from(Array.from({ length: 100 }, (_, i) => i));
  const visited = [];
  for (const v of big) {
    visited.push(v);
    if (v === 10) for (let i = 0; i < 100; i++) big.enqueue(100 + i); // forces growth
  }
  assert.deepEqual(visited, Array.from({ length: 200 }, (_, i) => i));

  const cleared = Queue.from([1, 2, 3]);
  const afterClear = [];
  for (const v of cleared) {
    afterClear.push(v);
    cleared.clear();
  }
  assert.deepEqual(afterClear, [1]);
});

test("peekLast returns the rear item and tracks enqueue/dequeue", () => {
  const q = new Queue();
  assert.equal(q.peekLast(), null);
  q.enqueue(1);
  assert.equal(q.peekLast(), 1);
  q.enqueue(2).enqueue(3);
  assert.equal(q.peekLast(), 3);
  q.dequeue();
  assert.equal(q.peekLast(), 3);
  q.dequeue();
  q.dequeue();
  assert.equal(q.peekLast(), null);
  q.enqueue(null);
  assert.equal(q.peekLast(), null, "a stored null reads back as null");
});

test("at: indexing from the front and rear, out of range is undefined", () => {
  const q = Queue.from(["a", "b", "c"]);
  assert.equal(q.at(0), "a");
  assert.equal(q.at(2), "c");
  assert.equal(q.at(-1), "c");
  assert.equal(q.at(-3), "a");
  assert.equal(q.at(3), undefined);
  assert.equal(q.at(-4), undefined);
  assert.equal(q.at(1.9), "b", "fractions truncate like Array#at");
  assert.equal(q.at(NaN), "a");
  assert.equal(new Queue().at(0), undefined);
  const withNull = Queue.from([null]);
  assert.equal(withNull.at(0), null);
  assert.equal(withNull.at(1), undefined, "undefined tells a miss from a stored null");
});

test("at and peekLast stay correct after the buffer wraps and grows", () => {
  const q = new Queue();
  for (let i = 0; i < 12; i++) q.enqueue(i);
  for (let i = 0; i < 10; i++) q.dequeue(); // head is now deep into the buffer
  for (let i = 12; i < 40; i++) q.enqueue(i); // wraps, then grows
  const expected = Array.from({ length: 30 }, (_, i) => i + 10);
  assert.deepEqual(Array.from({ length: 30 }, (_, i) => q.at(i)), expected);
  assert.equal(q.at(-1), 39);
  assert.equal(q.peekLast(), 39);
});

test("enqueueAll adds an iterable in order and is chainable", () => {
  const q = new Queue(1);
  assert.equal(q.enqueueAll([2, 3]).enqueueAll(new Set([4])), q);
  q.enqueueAll(function* () { yield 5; }());
  q.enqueueAll([]);
  assert.deepEqual(q.toArray(), [1, 2, 3, 4, 5]);
});

test("enqueueAll(queue itself) terminates and duplicates the contents", () => {
  const q = Queue.from([1, 2]);
  q.enqueueAll(q);
  assert.deepEqual(q.toArray(), [1, 2, 1, 2]);
});

test("dequeueMany takes up to n items from the front", () => {
  const q = Queue.from([1, 2, 3, 4, 5]);
  assert.deepEqual(q.dequeueMany(2), [1, 2]);
  assert.deepEqual(q.dequeueMany(0), []);
  assert.deepEqual(q.dequeueMany(10), [3, 4, 5], "fewer when the queue is smaller");
  assert.deepEqual(q.dequeueMany(3), [], "empty queue gives an empty array");
  assert.deepEqual(Queue.from([1, 2]).dequeueMany(Infinity), [1, 2]);
  assert.equal(q.isEmpty(), true);
  q.enqueue("reused");
  assert.equal(q.peek(), "reused");
  assert.deepEqual(Queue.from([null, undefined]).dequeueMany(2), [null, undefined]);
});

test("dequeueMany rejects invalid counts without changing the queue", () => {
  const q = Queue.from([1, 2]);
  assert.throws(() => q.dequeueMany(-1), RangeError);
  assert.throws(() => q.dequeueMany(NaN), RangeError);
  assert.throws(() => q.dequeueMany(), RangeError);
  assert.deepEqual(q.toArray(), [1, 2]);
});

test("toString / inspect formatting", () => {
  const q = new Queue(10, "text", { key: "value" });
  assert.equal(q.toString(), 'Front -> |10| |"text"| |{"key":"value"}| <- Rear');
  assert.equal(q[Symbol.for("nodejs.util.inspect.custom")](), q.toString());
});

test("toString survives circular refs and BigInt", () => {
  const c = {}; c.self = c;
  assert.doesNotThrow(() => new Queue(c, 10n, undefined).toString());
});

test("getType", () => {
  assert.equal(new Queue().getType(), "queue");
});

test("internals are private", () => {
  const q = new Queue(1, 2);
  assert.deepEqual(Object.keys(q), []);
  assert.equal(q.start, undefined);
  assert.equal(q.last, undefined);
  assert.throws(() => { q.length = 99; }, TypeError); // getter only (ESM strict)
  assert.equal(q.size(), 2);
});

test("importing the module has no global side effects", async () => {
  const log = console.log;
  await import("../index.js?fresh=" + Date.now());
  assert.equal(console.log, log);
  assert.equal(globalThis.Queue, undefined);
  assert.equal(globalThis.window, undefined);
});

test("handles 200k items without recursion/stack issues", () => {
  const q = new Queue();
  for (let i = 0; i < 200_000; i++) q.enqueue(i);
  assert.equal(q.size(), 200_000);
  for (let i = 0; i < 200_000; i++) assert.equal(q.dequeue(), i);
  assert.equal(q.isEmpty(), true);
});
