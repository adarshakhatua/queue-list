import { test } from "node:test";
import assert from "node:assert/strict";
import { PriorityQueue } from "../index.js";

// deterministic LCG so any failure is reproducible
const makeRand = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;

test("default order is ascending for numbers and strings", () => {
  assert.deepEqual(PriorityQueue.from([5, 1, 4, 2, 3]).toArray(), [1, 2, 3, 4, 5]);
  assert.deepEqual(PriorityQueue.from(["pear", "apple", "fig"]).toArray(), ["apple", "fig", "pear"]);
});

test("custom comparator: max-first and by object field", () => {
  const max = new PriorityQueue((a, b) => b - a);
  max.enqueue(1).enqueue(3).enqueue(2);
  assert.deepEqual([max.dequeue(), max.dequeue(), max.dequeue()], [3, 2, 1]);

  const jobs = PriorityQueue.from([{ n: "slow", due: 30 }, { n: "now", due: 1 }, { n: "mid", due: 10 }], (a, b) => a.due - b.due);
  assert.deepEqual(jobs.toArray().map((j) => j.n), ["now", "mid", "slow"]);
});

test("empty queue, peek and size", () => {
  const pq = new PriorityQueue();
  assert.equal(pq.isEmpty(), true);
  assert.equal(pq.dequeue(), null);
  assert.equal(pq.peek(), null);
  assert.equal(pq.size(), 0);
  pq.enqueue(2).enqueue(1);
  assert.equal(pq.peek(), 1);
  assert.equal(pq.size(), 2);
  assert.equal(pq.length, 2);
  assert.equal(pq.isEmpty(), false);
  assert.equal(pq.peek(), 1, "peek does not remove");
});

test("equal priorities come out in enqueue order (FIFO ties)", () => {
  const pq = new PriorityQueue((a, b) => a.p - b.p);
  for (let i = 0; i < 20; i++) pq.enqueue({ p: i % 3, i });
  const out = pq.toArray();
  const expected = [...Array(20).keys()].map((i) => ({ p: i % 3, i })).sort((a, b) => a.p - b.p || a.i - b.i);
  assert.deepEqual(out, expected);
});

test("matches a stable-sorted array across random enqueue/dequeue/clear (lots of ties)", () => {
  const rand = makeRand(777);
  const pq = new PriorityQueue((a, b) => a.p - b.p);
  const model = [];
  let id = 0;
  for (let step = 0; step < 30_000; step++) {
    const r = rand();
    if (r < 0.55) {
      const item = { p: Math.floor(rand() * 8), id: id++ };
      pq.enqueue(item);
      model.push(item);
      model.sort((a, b) => a.p - b.p || a.id - b.id);
    } else if (r < 0.999) {
      assert.equal(pq.dequeue(), model.length ? model.shift() : null);
    } else {
      pq.clear();
      model.length = 0;
    }
    assert.equal(pq.size(), model.length);
    assert.equal(pq.peek(), model.length ? model[0] : null);
  }
  assert.deepEqual(pq.toArray(), model);
});

test("from() on an iterable heapifies and keeps ties FIFO", () => {
  const items = Array.from({ length: 500 }, (_, i) => ({ p: i % 5, i }));
  const pq = PriorityQueue.from(new Set(items), (a, b) => a.p - b.p);
  const expected = [...items].sort((a, b) => a.p - b.p || a.i - b.i);
  assert.deepEqual(pq.toArray(), expected);
});

test("enqueueAll on a non-empty queue interleaves correctly and is chainable", () => {
  const pq = new PriorityQueue().enqueue(10).enqueue(1);
  assert.equal(pq.enqueueAll([5, 0, 7]), pq);
  pq.enqueueAll(function* () { yield 3; }());
  assert.deepEqual(pq.toArray(), [0, 1, 3, 5, 7, 10]);
});

test("enqueueAll(queue itself) terminates and duplicates the contents", () => {
  const pq = PriorityQueue.from([2, 1]);
  pq.enqueueAll(pq);
  assert.deepEqual(pq.toArray(), [1, 1, 2, 2]);
});

test("iteration and toArray do not consume; the iterator is a snapshot", () => {
  const pq = PriorityQueue.from([3, 1, 2]);
  assert.deepEqual([...pq], [1, 2, 3]);
  assert.deepEqual(pq.toArray(), [1, 2, 3]);
  assert.equal(pq.size(), 3);
  const seen = [];
  for (const v of pq) {
    seen.push(v);
    if (v === 1) pq.enqueue(0); // changes the queue, not the snapshot being iterated
  }
  assert.deepEqual(seen, [1, 2, 3]);
  assert.deepEqual(pq.toArray(), [0, 1, 2, 3]);
});

test("drain removes in priority order, including items added while draining", () => {
  const pq = PriorityQueue.from([3, 1]);
  const seen = [];
  for (const v of pq.drain()) {
    seen.push(v);
    if (v === 1) pq.enqueue(2); // sorts between what's left
  }
  assert.deepEqual(seen, [1, 2, 3]);
  assert.equal(pq.isEmpty(), true);
  assert.deepEqual([...pq.drain()], []);
});

test("breaking out of drain leaves the rest", () => {
  const pq = PriorityQueue.from([4, 3, 2, 1]);
  for (const v of pq.drain()) if (v === 2) break;
  assert.deepEqual(pq.toArray(), [3, 4]);
});

test("dequeueMany takes the best n and validates the count", () => {
  const pq = PriorityQueue.from([5, 4, 3, 2, 1]);
  assert.deepEqual(pq.dequeueMany(2), [1, 2]);
  assert.deepEqual(pq.dequeueMany(0), []);
  assert.deepEqual(pq.dequeueMany(99), [3, 4, 5]);
  assert.deepEqual(pq.dequeueMany(2), []);
  assert.throws(() => pq.dequeueMany(-1), RangeError);
  assert.throws(() => pq.dequeueMany(NaN), RangeError);
  assert.throws(() => pq.dequeueMany(), RangeError);
});

test("clear empties the queue and it can be reused", () => {
  const pq = PriorityQueue.from([2, 1]);
  assert.equal(pq.clear(), pq);
  assert.equal(pq.isEmpty(), true);
  pq.enqueue(9).enqueue(8);
  assert.deepEqual(pq.toArray(), [8, 9]);
});

test("stored null values work when the comparator handles them", () => {
  const pq = new PriorityQueue((a, b) => (a ?? -1) - (b ?? -1));
  pq.enqueue(2).enqueue(null).enqueue(1);
  assert.equal(pq.dequeue(), null);
  assert.equal(pq.isEmpty(), false, "a stored null is not 'empty'");
  assert.deepEqual(pq.toArray(), [1, 2]);
});

test("comparator must be a function", () => {
  assert.throws(() => new PriorityQueue("nope"), TypeError);
  assert.throws(() => PriorityQueue.from([1], 5), TypeError);
  assert.doesNotThrow(() => new PriorityQueue(undefined));
});

test("a queue copy via the iterator keeps the comparator and tie order", () => {
  const a = new PriorityQueue((x, y) => x.p - y.p);
  a.enqueue({ p: 1, n: "first" }).enqueue({ p: 1, n: "second" }).enqueue({ p: 0, n: "zero" });
  const names = [...a].map((x) => x.n);
  assert.deepEqual(names, ["zero", "first", "second"]);
});

test("handles 200k items in sorted order without stack issues", () => {
  const rand = makeRand(42);
  const values = Array.from({ length: 200_000 }, () => Math.floor(rand() * 1e6));
  const pq = PriorityQueue.from(values);
  let prev = -Infinity;
  let count = 0;
  for (const v of pq.drain()) {
    assert.ok(v >= prev);
    prev = v;
    count++;
  }
  assert.equal(count, 200_000);
});

test("toString / inspect formatting", () => {
  assert.equal(new PriorityQueue().toString(), "Top -> [] <- Bottom");
  assert.equal(PriorityQueue.from([2, 1, "x"], (a, b) => String(a).localeCompare(String(b))).toString(), 'Top -> |1| |2| |"x"| <- Bottom');
  const inspect = PriorityQueue.prototype[Symbol.for("nodejs.util.inspect.custom")];
  assert.equal(inspect.call(PriorityQueue.from([1])), "Top -> |1| <- Bottom");
});
