// Usage: node bench.js [N]
import Queue from "./index.js";
const N = Number(process.argv[2]) || 1_000_000;
const t = process.hrtime.bigint();
const q = new Queue();
for (let i = 0; i < N; i++) q.enqueue(i);
for (let i = 0; i < N; i++) q.dequeue();
console.log(`${N.toLocaleString()} enqueue + dequeue: ${(Number(process.hrtime.bigint() - t) / 1e6).toFixed(1)} ms`);
