/**
 * queue-list: a FIFO queue backed by a growable circular buffer.
 * All core operations are O(1) (amortized for enqueue/dequeue); toArray / iteration are O(n).
 * Importing this module has no side effects.
 */

function format(value) {
  try {
    const out = JSON.stringify(value);
    return out === undefined ? String(value) : out;
  } catch {
    // circular structures, BigInt, etc.
    return String(value);
  }
}

const MIN_CAPACITY = 16;

class Queue {
  // Circular buffer; capacity is always a power of two so wrapping is a bit mask.
  #buf = new Array(MIN_CAPACITY);
  #mask = MIN_CAPACITY - 1;
  #head = 0;
  #size = 0;
  // Total items ever removed; lets iterators keep their place across dequeue().
  #removed = 0;

  /** @param {...T} values initial items, front first */
  constructor(...values) {
    for (const value of values) this.enqueue(value);
  }

  /** Build a queue from any iterable (array, Set, generator, ...). */
  static from(iterable) {
    const queue = new Queue();
    for (const value of iterable) queue.enqueue(value);
    return queue;
  }

  /** Number of items (same as size()). */
  get length() {
    return this.#size;
  }

  #resize(capacity) {
    const buf = new Array(capacity);
    for (let i = 0; i < this.#size; i++) {
      buf[i] = this.#buf[(this.#head + i) & this.#mask];
    }
    this.#buf = buf;
    this.#mask = capacity - 1;
    this.#head = 0;
  }

  /** Adds an item to the rear. Returns the queue for chaining. */
  enqueue(value) {
    if (this.#size === this.#buf.length) this.#resize(this.#size * 2);
    this.#buf[(this.#head + this.#size) & this.#mask] = value;
    this.#size++;
    return this;
  }

  /** Removes and returns the front item, or null if the queue is empty. */
  dequeue() {
    if (this.#size === 0) return null;
    const value = this.#buf[this.#head];
    this.#buf[this.#head] = undefined; // don't keep dequeued items alive
    this.#head = (this.#head + 1) & this.#mask;
    this.#size--;
    this.#removed++;
    const capacity = this.#buf.length;
    if (capacity > MIN_CAPACITY && this.#size <= capacity >>> 2) {
      this.#resize(capacity >>> 1);
    }
    return value;
  }

  /** Returns the front item without removing it, or null if empty. */
  peek() {
    return this.#size === 0 ? null : this.#buf[this.#head];
  }

  isEmpty() {
    return this.#size === 0;
  }

  size() {
    return this.#size;
  }

  /** Removes all items. Returns the queue for chaining. */
  clear() {
    this.#removed += this.#size;
    this.#buf = new Array(MIN_CAPACITY);
    this.#mask = MIN_CAPACITY - 1;
    this.#head = 0;
    this.#size = 0;
    return this;
  }

  toArray() {
    return [...this];
  }

  /**
   * Yields and removes items front first until the queue is empty.
   * Items enqueued while draining are yielded too; breaking out early
   * leaves the remaining items in the queue.
   */
  *drain() {
    while (this.#size > 0) yield this.dequeue();
  }

  *[Symbol.iterator]() {
    // Position is absolute (items removed so far + offset) so that dequeue()
    // or enqueue() during iteration never skips or repeats an item.
    let position = this.#removed;
    while (true) {
      if (position < this.#removed) position = this.#removed;
      const offset = position - this.#removed;
      if (offset >= this.#size) return;
      yield this.#buf[(this.#head + offset) & this.#mask];
      position++;
    }
  }

  toString() {
    if (this.#size === 0) return "Front -> [] <- Rear";
    let out = "Front -> ";
    for (const value of this) out += `|${format(value)}| `;
    return out + "<- Rear";
  }

  getType() {
    return "queue";
  }

  // Makes console.log(queue) readable in Node without patching console.
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return this.toString();
  }
}

export default Queue;
export { Queue };
