// Compiled (never run) by `npm run test:types` to check the ESM typings.
import Queue, { AsyncQueue, PriorityQueue, Queue as Named, QueueClosedError, QueueFullError } from "queue-list";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const assertType = <_T extends true>() => {};

const q = new Queue<number>(1, 2, 3);
assertType<Equal<typeof Queue, typeof Named>>();
assertType<Equal<ReturnType<typeof q.dequeue>, number | null>>();
assertType<Equal<ReturnType<typeof q.peek>, number | null>>();
assertType<Equal<ReturnType<typeof q.peekLast>, number | null>>();
assertType<Equal<ReturnType<typeof q.at>, number | undefined>>();
assertType<Equal<ReturnType<typeof q.dequeueMany>, number[]>>();
assertType<Equal<ReturnType<typeof q.enqueue>, Queue<number>>>();
assertType<Equal<ReturnType<typeof q.enqueueAll>, Queue<number>>>();
assertType<Equal<ReturnType<typeof q.toArray>, number[]>>();
assertType<Equal<typeof q.length, number>>();
q.enqueueAll(new Set([4, 5])).enqueue(6);
for (const n of q) assertType<Equal<typeof n, number>>();
for (const n of q.drain()) assertType<Equal<typeof n, number>>();
const fromSet = Queue.from(new Set(["a"]));
assertType<Equal<typeof fromSet, Queue<string>>>();

// @ts-expect-error wrong item type
q.enqueue("nope");
// @ts-expect-error dequeueMany needs a count
q.dequeueMany();
// @ts-expect-error at needs an index
q.at();

const jobs = new AsyncQueue<{ id: number }>();
jobs.enqueue({ id: 1 }).close();
assertType<Equal<ReturnType<typeof jobs.take>, Promise<{ id: number }>>>();
assertType<Equal<typeof jobs.closed, boolean>>();
const ctrl = new AbortController();
void jobs.take({ signal: ctrl.signal });
void jobs.take();
async function consume() {
  for await (const job of jobs) assertType<Equal<typeof job, { id: number }>>();
  for await (const job of jobs.iterate({ signal: ctrl.signal })) assertType<Equal<typeof job, { id: number }>>();
}
void consume;
// @ts-expect-error wrong item type
jobs.enqueue("nope");
// @ts-expect-error signal must be an AbortSignal
jobs.take({ signal: "stop" });

assertType<Equal<InstanceType<typeof QueueClosedError>["name"], string>>();

// PriorityQueue
const pq = new PriorityQueue<{ due: number }>((a, b) => a.due - b.due);
pq.enqueue({ due: 1 }).enqueueAll([{ due: 2 }]);
assertType<Equal<ReturnType<typeof pq.dequeue>, { due: number } | null>>();
assertType<Equal<ReturnType<typeof pq.peek>, { due: number } | null>>();
assertType<Equal<ReturnType<typeof pq.dequeueMany>, { due: number }[]>>();
assertType<Equal<ReturnType<typeof pq.enqueue>, PriorityQueue<{ due: number }>>>();
for (const job of pq.drain()) assertType<Equal<typeof job, { due: number }>>();
for (const job of pq) assertType<Equal<typeof job, { due: number }>>();
const fromNumbers = PriorityQueue.from([3, 1, 2]);
assertType<Equal<typeof fromNumbers, PriorityQueue<number>>>();
const maxFirst = PriorityQueue.from(new Set([1, 2]), (a, b) => b - a);
assertType<Equal<typeof maxFirst, PriorityQueue<number>>>();
new PriorityQueue<string>();
// @ts-expect-error wrong item type
pq.enqueue({ due: "soon" });
// @ts-expect-error comparator must return a number
new PriorityQueue<number>((a, b) => a > b);
// @ts-expect-error comparator must be a function
new PriorityQueue<number>(5);

// bounded AsyncQueue, put() and takeBatch()
const bounded = AsyncQueue.bounded<string>(10);
assertType<Equal<typeof bounded, AsyncQueue<string>>>();
const boundedWithItems = AsyncQueue.bounded(3, new Set([1, 2]));
assertType<Equal<typeof boundedWithItems, AsyncQueue<number>>>();
assertType<Equal<typeof bounded.capacity, number>>();
assertType<Equal<typeof bounded.full, boolean>>();
assertType<Equal<ReturnType<typeof bounded.put>, Promise<void>>>();
assertType<Equal<ReturnType<typeof bounded.takeBatch>, Promise<string[]>>>();
void bounded.put("x", { signal: ctrl.signal });
void bounded.takeBatch({ max: 10, timeout: 50, signal: ctrl.signal });
void bounded.takeBatch();
assertType<Equal<InstanceType<typeof QueueFullError>["name"], string>>();
// @ts-expect-error wrong item type
bounded.put(1);
// @ts-expect-error capacity must be a number
AsyncQueue.bounded("10");
// @ts-expect-error max must be a number
bounded.takeBatch({ max: "10" });
// @ts-expect-error timeout must be a number
bounded.takeBatch({ timeout: "50" });
// @ts-expect-error unknown option
bounded.takeBatch({ maxItems: 5 });
