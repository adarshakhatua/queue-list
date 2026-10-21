// Compiled (never run) by `npm run test:types` to check the CommonJS typings.
import { Queue, AsyncQueue, QueueClosedError } from "queue-list";

const q = new Queue<string>("a");
const first: string | null = q.dequeue();
const last: string | undefined = q.at(-1);
const jobs = new AsyncQueue<number>();
const next: Promise<number> = jobs.take();
const error: Error = new QueueClosedError();
void [first, last, next, error];
