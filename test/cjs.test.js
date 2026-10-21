import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import * as esm from "../index.js";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("..", import.meta.url));

test("generated CommonJS files are up to date with index.js / index.d.ts", () => {
  const r = spawnSync(process.execPath, ["scripts/build-cjs.js", "--check"], { cwd: root, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
});

test("require('./index.cjs') exposes the named exports and works", () => {
  const { Queue, AsyncQueue, PriorityQueue, QueueClosedError } = require("../index.cjs");
  const q = new Queue(1, 2);
  assert.deepEqual([...q.enqueue(3)], [1, 2, 3]);
  assert.equal(typeof AsyncQueue, "function");
  assert.deepEqual(PriorityQueue.from([3, 1, 2]).toArray(), [1, 2, 3]);
  assert.equal(new QueueClosedError().name, "QueueClosedError");
  assert.equal(require("../index.cjs").default, undefined, "no default export in CommonJS");
});

test("package exports map resolves require() to the CJS build and import to ESM", () => {
  // self-reference by package name goes through package.json "exports"
  const viaRequire = require("queue-list");
  assert.equal(viaRequire.Queue, require("../index.cjs").Queue);
  assert.notEqual(viaRequire.Queue, esm.Queue, "separate class per module system (documented)");
});

test("a CommonJS script can require the package and use AsyncQueue", () => {
  const code = `
    const { AsyncQueue } = require("queue-list");
    (async () => {
      const q = AsyncQueue.from([1, 2]); q.close();
      const seen = []; for await (const v of q) seen.push(v);
      console.log(JSON.stringify(seen));
    })();`;
  const r = spawnSync(process.execPath, ["-e", code], { cwd: root, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), "[1,2]");
});
