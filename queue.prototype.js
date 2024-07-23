import Queue from "./queue.js";
import Node from "./node.prototype.js";

Queue.prototype.dequeue = function () {
  Object.defineProperty(this, "start", {
    enumerable: true,
    writable: true,
  });
  let { start } = this;
  let value = start.value;
  this.start = this.start.next;
  Object.defineProperty(this, "start", {
    enumerable: true,
    writable: false,
  });
  Object.defineProperty(this, "length", {
    enumerable: false,
    writable: true,
  });
  this.length--;
  Object.defineProperty(this, "length", {
    enumerable: false,
    writable: false,
  });
  return value;
};

Queue.prototype.enqueue = function (value) {
  Object.defineProperty(this, "length", {
    enumerable: false,
    writable: true,
  });
  Object.defineProperty(this, "last", {
    enumerable: false,
    writable: true,
  });
  let node = new Node(value);
  this.last.setNext(node);
  this.length++;
  this.last = node;
  Object.defineProperty(this, "length", {
    enumerable: false,
    writable: false,
  });
  Object.defineProperty(this, "last", {
    enumerable: false,
    writable: false,
  });
  return this;
};

Queue.prototype.peek = function () {
  return this.start.value;
};

Queue.prototype.isEmpty = function () {
  return this.start ? false : true;
};

Queue.prototype.size = function () {
  return this.length;
};

Queue.prototype.clear = function () {
  Object.defineProperty(this, "start", {
    enumerable: true,
    writable: true,
  });
  Object.defineProperty(this, "length", {
    enumerable: true,
    writable: true,
  });
  Object.defineProperty(this, "last", {
    enumerable: true,
    writable: true,
  });
  this.start = null;
  this.length = 0;
  this.last = null;
  Object.defineProperty(this, "start", {
    enumerable: true,
    writable: false,
  });
  Object.defineProperty(this, "length", {
    enumerable: true,
    writable: false,
  });
  Object.defineProperty(this, "last", {
    enumerable: true,
    writable: false,
  });
  return this;
};

Queue.prototype.toArray = function () {
  let arr = [];
  let next = this.start;

  for (let i = 0; i < this.length; i++) {
    let value = next.value;
    arr.push(value);
    next = next.next;
  }

  return arr;
};

Queue.prototype.toString = function () {
  if (this.isEmpty()) {
    return "Front -> [] <- Rear";
  }
  let queueStr = "Front -> ";
  let next = this.start;

  for (let i = 0; i < this.length; i++) {
    let value = next.value;
    queueStr += `[${value}] `;
    next = next.next;
  }
  queueStr += "<- Rear";
  return queueStr;
};

Queue.prototype[Symbol.for("nodejs.util.inspect.custom")] = function () {
  return this.toString();
};

Queue.prototype.getType = function () {
  return "Queue";
};
const originalConsoleLog = console.log;

console.log = function (...args) {
  args = args.map((arg) => {
    if (
      arg &&
      typeof arg.getType === "function" &&
      arg.getType() === "Queue" &&
      typeof arg.toString === "function"
    ) {
      return arg.toString();
    }
    return arg;
  });
  originalConsoleLog.apply(console, args);
};

try {
  window.Queue = Queue;
} catch (error) {}

export default Queue;
