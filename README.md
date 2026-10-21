# queue-list

[![CI](https://github.com/adarshakhatua/queue-list/actions/workflows/ci.yml/badge.svg)](https://github.com/adarshakhatua/queue-list/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/queue-list)](https://www.npmjs.com/package/queue-list)

**Queues for JavaScript and TypeScript that do more than `enqueue` and `dequeue`:** consumers that wait for work,
producers that slow down when consumers fall behind, batching, and priorities that keep ties in order.
No dependencies, no side effects, ESM and CommonJS, types included.

## Why

- **`array.shift()` is not a queue.** It is fine for a few thousand items, then it collapses: draining 100,000
  items took 771 ms with `shift()` and 0.8 ms with `Queue`; draining 1,000,000 took about 78 seconds against 5 ms
  (Node 26, one run each; see [Performance](#performance)).
- **Small memory footprint.** Items live in one growable circular buffer instead of one object per item:
  1M items took 8.4 MB, against 40 MB for a linked list of node objects, and the buffer shrinks after a drain.
- **The hard parts are built in.** A bare data structure stops at `dequeue()` returning `null`. Real programs also
  need consumers that wait, backpressure so a fast producer cannot exhaust memory, cancellation, and bulk
  processing. [`AsyncQueue`](#asyncqueue) covers those and [`PriorityQueue`](#priorityqueue) covers priorities.

## Install

```sh
npm install queue-list
```

Works with `import` and `require()`, on Node 18+. TypeScript types are included.

```js
import Queue, { AsyncQueue, PriorityQueue } from "queue-list";          // ESM
const { Queue, AsyncQueue, PriorityQueue } = require("queue-list");     // CommonJS (named exports only)
```

If one part of your app uses `import` and another uses `require()`, you get two separate copies of the
classes, so `instanceof` checks across them fail. Pick one style for the same package.

## Which queue do I need?

| You need | Use |
|---|---|
| Items in, items out, in order | [`Queue`](#queue) |
| Consumers that **wait** for items (jobs, messages, events) | [`AsyncQueue`](#asyncqueue) |
| Producers that **slow down** when consumers can't keep up | [`AsyncQueue.bounded(n)`](#backpressure-bounded-queues) |
| Handle items **in bulk** (database inserts, API calls) | [`takeBatch()`](#batching) |
| **Most important first** (deadlines, priorities) | [`PriorityQueue`](#priorityqueue) |

## Example: a worker pool with backpressure

Four workers process jobs from a source that may be much faster than they are. The bounded queue pauses the
producer while 50 jobs are waiting, so memory stays flat no matter how large the source is:

```js
import { AsyncQueue } from "queue-list";

const jobs = AsyncQueue.bounded(50);

const workers = Array.from({ length: 4 }, async () => {
  for await (const job of jobs) await handle(job);   // waits when the queue is empty
});

for (const job of source) await jobs.put(job);       // waits when 50 jobs are already queued
jobs.close();                                        // workers finish what is buffered, then stop
await Promise.all(workers);
```

To stop the workers early, for example on `SIGTERM`, pass an `AbortSignal`:
`jobs.iterate({ signal })` makes each worker's loop throw `signal.reason`, and no job is taken after the abort.

## Queue

A FIFO queue on a growable circular buffer. `enqueue` and `dequeue` are **amortized O(1)**; `peek`, `isEmpty`,
`size` and `clear` are **O(1)**; `toArray` and iteration are O(n).

```js
import { Queue } from "queue-list";

const q = new Queue(1, "two");        // initial items, front first
q.enqueue(3).enqueue({ four: 4 });    // chainable

q.dequeue();   // 1
q.peek();      // "two"
q.size();      // 3  (also q.length)
[...q];        // ["two", 3, { four: 4 }]
for (const item of q) { /* iterates front -> rear without consuming */ }
for (const item of q.drain()) { /* removes each item as it is yielded */ }

Queue.from([1, 2, 3]);                // build from any iterable
```

### API

| Method | Description | Returns | Time |
|---|---|---|---|
| `new Queue(...values)` | Create a queue, optionally with initial items | `Queue` | O(n) |
| `Queue.from(iterable)` | Create a queue from an array, Set, generator, ... | `Queue` | O(n) |
| `enqueue(value)` | Add to the rear | the queue (chainable) | O(1) amortized |
| `enqueueAll(iterable)` | Add every item of an iterable to the rear, in order | the queue (chainable) | O(k) |
| `dequeue()` | Remove and return the front item | item, or `null` if empty | O(1) amortized |
| `dequeueMany(count)` | Remove up to `count` items from the front (for batching) | `Array` (fewer if the queue is smaller) | O(count) |
| `peek()` | Return the front item without removing it | item, or `null` if empty | O(1) |
| `peekLast()` | Return the rear item without removing it | item, or `null` if empty | O(1) |
| `at(index)` | Item at `index` (0 = front, negative counts from the rear, like `Array#at`) | item, or `undefined` if out of range | O(1) |
| `isEmpty()` | Is the queue empty? | `boolean` | O(1) |
| `size()` / `length` | Number of items | `number` | O(1) |
| `clear()` | Remove all items | the queue (chainable) | O(1) |
| `toArray()` | Copy items to an array (front first) | `Array` | O(n) |
| `drain()` | Iterate front -> rear, removing each item (includes items added while draining) | iterator | O(n) |
| `[Symbol.iterator]` | `for...of` / spread support | iterator | O(n) |
| `toString()` | `Front -> \|1\| \|"a"\| <- Rear` (empty: `Front -> [] <- Rear`) | `string` | O(n) |
| `getType()` | Always `"queue"` | `"queue"` | O(1) |

### Empty queue vs stored `null`

`dequeue()` and `peek()` return `null` when the queue is empty. Because `null` is also a valid
item, use `drain()` (or check `isEmpty()` first) if you may store `null`:

```js
for (const item of q.drain()) handle(item);   // empties the queue, null-safe
```

If you `break` out of `drain()`, the items not yet yielded stay in the queue.

### Logging

In Node.js, `console.log(queue)` prints `Front -> |1| |"text"| <- Rear` through the standard
`util.inspect.custom` hook. Nothing is patched globally. In browsers use `queue.toString()`
or `queue.toArray()`.

## PriorityQueue

Dequeues the most important item first. It is a binary heap, so `enqueue` and `dequeue` are O(log n) and
`peek` is O(1).

```js
import { PriorityQueue } from "queue-list";

const jobs = new PriorityQueue((a, b) => a.due - b.due);   // smallest `due` first, like Array#sort
jobs.enqueue({ id: "slow", due: 30 }).enqueue({ id: "now", due: 1 });

jobs.peek();      // { id: "now", due: 1 }
jobs.dequeue();   // { id: "now", due: 1 }
for (const job of jobs.drain()) run(job);   // highest priority first, until empty

new PriorityQueue();                        // no comparator: numbers/strings, smallest first
new PriorityQueue((a, b) => b - a);         // largest first
PriorityQueue.from([5, 1, 4], (a, b) => a - b);   // heapified in O(n)
```

**Items with equal priority come out in the order they were enqueued** (FIFO), which `Array#sort`-based
and many heap implementations do not guarantee.

It has the same method names as `Queue` (`enqueue`, `enqueueAll`, `dequeue`, `dequeueMany`, `peek`, `isEmpty`,
`size()` / `length`, `clear`, `drain`, `toArray`, iteration, `PriorityQueue.from`) with these differences:

| | `Queue` | `PriorityQueue` |
|---|---|---|
| Constructor | `new Queue(...values)` | `new PriorityQueue(compare?)`; add initial items with `PriorityQueue.from(iterable, compare?)` |
| Order | insertion order | `compare(a, b) < 0` means `a` comes out first (default: ascending with `<` / `>`) |
| `toArray()` / iteration | O(n), front to rear | O(n log n), in dequeue order; a snapshot, so the queue is not consumed or affected by later changes |
| `peekLast`, `at(i)` | yes | no (a heap has no meaningful "last" or index) |

Notes:
- `compare` must be consistent and must not throw; a throwing comparator can leave the heap misordered.
- Like `dequeue()` on `Queue`, `dequeue()` and `peek()` return `null` when empty, so use `isEmpty()` or `drain()` if you store `null` (your comparator has to handle it).
- On the author's machine (500k random numbers, Node 26) it is level with `heap-js`, faster than `@datastructures-js/priority-queue`,
  and slower than `fastpriorityqueue`, which does not keep ties in order. Run your own numbers if it matters.

## AsyncQueue

A queue whose consumers **wait** for items instead of getting `null`. Use it between a producer and a
consumer: job runners, message streams, crawlers.

```js
import { AsyncQueue } from "queue-list";

const jobs = new AsyncQueue();

// consumer: waits when the queue is empty, ends when it is closed and drained
(async () => {
  for await (const job of jobs) await handle(job);
  console.log("all jobs done");
})();

// producer
jobs.enqueue({ id: 1 }).enqueue({ id: 2 });
jobs.close();   // no more items; consumers finish what is buffered, then stop
```

Wait for a job, but not forever:

```js
try {
  const job = await jobs.take({ signal: AbortSignal.timeout(5000) });
} catch (error) {
  if (error.name === "TimeoutError") { /* nothing arrived in 5 s; the queue is untouched */ }
}
```

`AbortSignal.timeout()` timers do not keep Node's event loop alive. If nothing else is running (for example a bare script that only awaits `take()`), the process can exit before the timeout fires; use an `AbortController` with `setTimeout` if the wait itself must keep the process running.

| Member | Description |
|---|---|
| `new AsyncQueue(...values)` / `AsyncQueue.from(iterable)` | Create a queue, optionally with initial items |
| `enqueue(value)` | Add an item, or hand it to the longest-waiting consumer. Chainable. Throws `QueueClosedError` if closed, and `QueueFullError` if a bounded queue is full |
| `take({ signal }?)` | `Promise` of the front item; waits if empty. Rejects with `QueueClosedError` once closed and empty. With an `AbortSignal`, aborting rejects with `signal.reason` |
| `close()` | Stop accepting items and reject waiting consumers. Buffered items can still be taken. Idempotent |
| `for await (const x of q)` / `q.iterate({ signal }?)` | Takes items until the queue is closed and empty. With a `signal`, an abort makes the loop throw `signal.reason`; nothing is taken after the abort |
| `AsyncQueue.bounded(capacity, iterable?)` | A queue that holds at most `capacity` buffered items (positive integer); see [Backpressure](#backpressure-bounded-queues) |
| `put(value, { signal }?)` | Like `enqueue`, but waits for space when a bounded queue is full. Rejects with `QueueClosedError` if the queue closes first, or `signal.reason` on abort; the item is then not added |
| `takeBatch({ max, timeout, signal }?)` | `Promise` of an array: waits for the first item, then takes what is already buffered up to `max`; see [Batching](#batching) |
| `capacity`, `full` | Maximum buffered items (`Infinity` if unbounded) and whether a bounded queue is full |
| `closed` | `true` after `close()` |
| `size()` / `length`, `isEmpty()` | Buffered items (waiting consumers are not counted) |

### Backpressure: bounded queues

Without a limit, a producer that is faster than its consumers grows the queue until memory runs out.
`AsyncQueue.bounded(capacity)` makes producers wait instead:

```js
const jobs = AsyncQueue.bounded(100);

// producer: pauses automatically while 100 jobs are waiting
for (const job of source) await jobs.put(job);
jobs.close();

// consumers: every take() lets the longest-waiting producer in
for await (const job of jobs) await handle(job);
```

- `put()` waits (in arrival order) while the queue holds `capacity` items; `enqueue()` never waits and throws `QueueFullError` instead.
- Capacity counts buffered items. If a consumer is already waiting, `put()` hands the item straight over.
- `put(value, { signal })` stops waiting on abort (or `AbortSignal.timeout(ms)`); the item is not added.
- `close()` rejects producers that are still waiting with `QueueClosedError`; their items are dropped, while items already buffered can still be taken.
- An unbounded queue (`new AsyncQueue()`) never makes `put()` wait.

### Batching

`takeBatch()` is for work that is cheaper in bulk, such as database inserts or API calls:

```js
while (true) {
  const rows = await events.takeBatch({ max: 500, timeout: 100 });   // up to 500 rows, or 100 ms
  await db.insertMany(rows);
}
```

- It waits for the first item, then also takes whatever is already buffered, up to `max` (default: no limit).
- Without `timeout` the batch ends right there, so a batch is never delayed.
- With `timeout` (ms) it keeps collecting for that long after the first item, and returns early once `max` items are in hand.
- On a closed queue it returns what is buffered, then rejects with `QueueClosedError`.
- Aborting (`signal`) before the first item rejects with `signal.reason`. Once a batch has items, an abort or `close()` ends the wait and returns the partial batch, so no item is lost.

Notes:
- Stored `null` / `undefined` values are delivered normally; `take()` never confuses them with "empty".
- Several consumers can share one queue; each item goes to exactly one of them, and waiting consumers are served in arrival order.
- If you `break` out of `for await`, the remaining items stay in the queue.
- `take({ signal })` cancels one consumer's wait (timeouts, shutting down a worker) without closing the queue. A cancelled `take()` leaves the line immediately, so it can never swallow an item; an already-aborted signal rejects without taking anything.

## How it compares

| Package | What it is | Versus queue-list |
|---|---|---|
| [`denque`](https://www.npmjs.com/package/denque) | Double-ended queue on an array | Level in the benchmark below. It is a deque (add and remove at both ends); queue-list is FIFO-only but adds the async and priority queues |
| [`yocto-queue`](https://www.npmjs.com/package/yocto-queue) | Tiny queue | About 2-3x slower in the benchmark below; no waiting consumers, backpressure or priorities |
| [`p-queue`](https://www.npmjs.com/package/p-queue) | Runs promise-returning functions with a concurrency limit | A different job. `p-queue` schedules the work for you; `AsyncQueue` is the queue underneath, so you decide what workers do |
| [`fastpriorityqueue`](https://www.npmjs.com/package/fastpriorityqueue), [`heap-js`](https://www.npmjs.com/package/heap-js) | Priority queues | `PriorityQueue` is level with `heap-js` and slower than `fastpriorityqueue`, but keeps equal priorities in enqueue order |

## Performance

**Versus `Array#shift()`.** Draining an array used as a queue gets dramatically slower as it grows. Time to remove all
N items, one at a time, from an array (`shift()`) and from a `Queue` (`dequeue()`), after filling both (Node 26,
Apple silicon, one run each):

| Items | `array.shift()` | `Queue.dequeue()` |
|---|---|---|
| 10,000 | 0.3 ms | 1.2 ms |
| 100,000 | 771 ms | 0.8 ms |
| 300,000 | 6,973 ms | 6.2 ms |
| 1,000,000 | 78,479 ms | 4.9 ms |

For small queues a plain array is fine, and faster. The pattern is similar on Node 18 and 22 (1M items on Node 18 took
about 176 s). This comparison is not part of `npm run bench`, because the 1M case takes over a minute.

**Versus other queue packages.** Median of 5 runs on Node 26 (Apple silicon), each library in its own process, in ms (lower is better):

| Scenario | queue-list | denque | yocto-queue |
|---|---|---|---|
| Bulk: enqueue 1M items, then dequeue all | 12.5 | 13.7 | 39.2 |
| Steady: 5M enqueue + dequeue pairs, ~100 items alive | 31.9 | 30.1 | 65.6 |

queue-list is on par with `denque` and about 2-3x faster than `yocto-queue`. Numbers vary by machine;
run `npm run bench` to reproduce. `denque` is a double-ended queue; queue-list is deliberately FIFO-only.

## Development

```sh
npm run build      # regenerate index.cjs / index.d.cts from index.js / index.d.ts (also checked by the tests)
npm test           # node:test, no dependencies
npm run test:types # compile the ESM and CommonJS typings against real usage
npm run bench      # compares against denque and yocto-queue, one process each
```

## Migrating from 1.x

- `console.log` is no longer patched, and `window.Queue` is no longer set. Node still prints queues nicely.
- The `start`, `last` and `length` internals (and `Node` classes) are now private. Use `size()` / `length`, `peek()` and `toArray()`.
- `toArray()` returns the stored values themselves (objects are not stringified).
- New: iteration, `Queue.from`, named export `{ Queue }`, TypeScript types.

## License

MIT. See [LICENSE](LICENSE).
