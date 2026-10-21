# queue-list

A small, dependency-free FIFO queue for JavaScript, implemented as a growable circular buffer.
`enqueue` and `dequeue` are **amortized O(1)**; `peek`, `isEmpty`, `size` and `clear` are **O(1)**; `toArray` and iteration are O(n).
Importing the package has **no side effects** (no global patching).

```sh
npm install queue-list
```

ESM only. TypeScript types are included.

**Using `require()` (CommonJS):** on Node 20.19+ / 22.12+ you can load it with the named export:

```js
const { Queue } = require("queue-list");
```

Older Node versions need `import()` instead: `const { Queue } = await import("queue-list");`

```js
import Queue from "queue-list";

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

## API

| Method | Description | Returns | Time |
|---|---|---|---|
| `new Queue(...values)` | Create a queue, optionally with initial items | `Queue` | O(n) |
| `Queue.from(iterable)` | Create a queue from an array, Set, generator, ... | `Queue` | O(n) |
| `enqueue(value)` | Add to the rear | the queue (chainable) | O(1) amortized |
| `dequeue()` | Remove and return the front item | item, or `null` if empty | O(1) amortized |
| `peek()` | Return the front item without removing it | item, or `null` if empty | O(1) |
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

## Performance

Median of 5 runs on Node 26 (Apple silicon), each library in its own process, in ms (lower is better):

| Scenario | queue-list | denque | yocto-queue |
|---|---|---|---|
| Bulk: enqueue 1M items, then dequeue all | 12.5 | 13.7 | 39.2 |
| Steady: 5M enqueue + dequeue pairs, ~100 items alive | 31.9 | 30.1 | 65.6 |

queue-list is on par with `denque` and about 2-3x faster than `yocto-queue`. Numbers vary by machine;
run `npm run bench` to reproduce. `denque` is a double-ended queue; queue-list is deliberately FIFO-only.

## Development

```sh
npm test      # node:test, no dependencies
npm run bench # compares against denque and yocto-queue, one process each
```

## Migrating from 1.x

- `console.log` is no longer patched, and `window.Queue` is no longer set. Node still prints queues nicely.
- The `start`, `last` and `length` internals (and `Node` classes) are now private. Use `size()` / `length`, `peek()` and `toArray()`.
- `toArray()` returns the stored values themselves (objects are not stringified).
- New: iteration, `Queue.from`, named export `{ Queue }`, TypeScript types.

## License

MIT. See [LICENSE](LICENSE).
