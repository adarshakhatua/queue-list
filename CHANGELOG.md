# Changelog

All notable changes to this project. Versions follow [semver](https://semver.org).

## 2.6.1

### Docs
- README restructured to lead with the problem: a "Why" section (with `Array#shift()` and memory numbers), a "Which queue do I need?" table, a worker-pool example with backpressure, and a comparison with other packages. No code changes.

## 2.6.0

### Added
- `AsyncQueue.bounded(capacity, iterable?)`, `AsyncQueue#put(value, { signal })`, `capacity` and `full`: backpressure for producers. `put()` waits while a bounded queue is full; `enqueue()` throws the new `QueueFullError` instead.
- `AsyncQueue#takeBatch({ max, timeout, signal })`: take up to `max` items at once, optionally waiting `timeout` ms for more. An abort or close after the first item returns the partial batch, so nothing is lost.

### Changed
- `close()` also rejects producers still waiting in `put()` with `QueueClosedError` (their items are not added).

## 2.5.0

### Added
- `PriorityQueue`: a binary-heap priority queue with a comparator (`compare(a, b) < 0` comes out first), FIFO order among equal priorities, `PriorityQueue.from` (O(n) heapify), `drain`, `dequeueMany` and non-consuming iteration.

## 2.4.0

### Added
- `Queue#peekLast()`, `Queue#at(index)`, `Queue#enqueueAll(iterable)` and `Queue#dequeueMany(count)`.
- `AsyncQueue#iterate({ signal })`: iterate with cancellation; `for await` on the queue is the same as `iterate()`.
- CommonJS support: `require("queue-list")` now works on every supported Node version (named exports, with `index.d.cts` types).
- Type tests (`npm run test:types`) for both the ESM and CommonJS typings, run in CI.
- Release workflow that publishes to npm with provenance when a GitHub Release is published.

## 2.3.1

### Fixed
- Test-only: the `AbortSignal.timeout` test could fail on CI because those timers do not keep the event loop alive.

### Docs
- Note that `AbortSignal.timeout()` does not keep the process alive.

## 2.3.0

### Added
- `AsyncQueue#take({ signal })`: cancel a wait (timeouts, worker shutdown). A cancelled `take()` never receives, and so never loses, an item.

## 2.2.0

### Added
- `AsyncQueue` and `QueueClosedError`: a queue whose consumers wait for items, with `take()`, `close()` and `for await`.

## 2.1.0

### Added
- `Queue#drain()`: iterate while removing items; safe when `null` is a stored value.

### Changed
- The queue is now a growable circular buffer instead of a linked list: about 5x less memory (1M items: 8.4 MB vs 40 MB) and about 10% faster in steady state. Public API unchanged.
- `engines.node` is now `>=18` (`node --test` needs it).
- `package.json` gained `repository`, `bugs`, `homepage` and `sideEffects: false`.

## 2.0.0

### Changed
- **Breaking:** rewritten as an ES class with no global side effects: `console.log` and `window.Queue` are no longer patched, and internals are private.
- `toArray()` returns the stored values themselves.

### Added
- Iteration, `Queue.from`, the named export `{ Queue }` and TypeScript types.
