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
