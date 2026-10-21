// Compiled (never run) by `npm run test:types` to check the ESM typings.
import Queue, { AsyncQueue, Queue as Named, QueueClosedError } from "queue-list";

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
