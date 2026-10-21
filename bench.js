// Usage: node bench.js [N]
// Each implementation runs in its own process so JIT state can't leak between them.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const impls = {
  "queue-list": async () => {
    const { default: Queue } = await import("./index.js");
    return () => { const q = new Queue(); return [(x) => q.enqueue(x), () => q.dequeue()]; };
  },
  denque: async () => {
    const { default: Denque } = await import("denque");
    return () => { const q = new Denque(); return [(x) => q.push(x), () => q.shift()]; };
  },
  "yocto-queue": async () => {
    const { default: Queue } = await import("yocto-queue");
    return () => { const q = new Queue(); return [(x) => q.enqueue(x), () => q.dequeue()]; };
  },
};

const scenarios = {
  // fill then drain: the whole data set is alive at once
  bulk(enqueue, dequeue, n) {
    for (let i = 0; i < n; i++) enqueue(i);
    for (let i = 0; i < n; i++) dequeue();
  },
  // job-queue pattern: a small live set, items constantly flowing through
  steady(enqueue, dequeue, n) {
    for (let i = 0; i < 100; i++) enqueue(i);
    for (let i = 0; i < n * 5; i++) { enqueue(i); dequeue(); }
  },
};

const [mode, implName, scenarioName, nArg] = process.argv.slice(2);

if (mode === "--child") {
  const make = await impls[implName]();
  const run = scenarios[scenarioName];
  const n = Number(nArg);
  const trial = () => { const [e, d] = make(); const t = process.hrtime.bigint(); run(e, d, n); return Number(process.hrtime.bigint() - t) / 1e6; };
  trial(); // warm-up
  console.log(trial());
} else {
  const n = Number(mode) || 1_000_000;
  const runs = 5;
  const self = fileURLToPath(import.meta.url);
  const median = (xs) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  console.log(`${n.toLocaleString()} items, median of ${runs} runs, ms (lower is better)\n`);
  for (const scenarioName of Object.keys(scenarios)) {
    console.log(scenarioName === "bulk" ? `bulk: enqueue ${n.toLocaleString()}, then dequeue all` : `steady: ${(n * 5).toLocaleString()} enqueue+dequeue pairs, ~100 items alive`);
    for (const implName of Object.keys(impls)) {
      const times = [];
      for (let i = 0; i < runs; i++) {
        const r = spawnSync(process.execPath, [self, "--child", implName, scenarioName, String(n)], { encoding: "utf8" });
        if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
        times.push(Number(r.stdout));
      }
      console.log(`  ${implName.padEnd(12)} ${median(times).toFixed(1)}`);
    }
    console.log();
  }
}
