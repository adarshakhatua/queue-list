/**
 * queue-list: a FIFO queue backed by a singly linked list.
 * All core operations are O(1); toArray / iteration are O(n).
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

class Queue {
  #head = null;
  #tail = null;
  #size = 0;

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

  /** Adds an item to the rear. Returns the queue for chaining. */
  enqueue(value) {
    const node = { value, next: null };
    if (this.#tail) this.#tail.next = node;
    else this.#head = node;
    this.#tail = node;
    this.#size++;
    return this;
  }

  /** Removes and returns the front item, or null if the queue is empty. */
  dequeue() {
    const head = this.#head;
    if (head === null) return null;
    this.#head = head.next;
    if (this.#head === null) this.#tail = null;
    this.#size--;
    return head.value;
  }

  /** Returns the front item without removing it, or null if empty. */
  peek() {
    return this.#head === null ? null : this.#head.value;
  }

  isEmpty() {
    return this.#size === 0;
  }

  size() {
    return this.#size;
  }

  /** Removes all items. Returns the queue for chaining. */
  clear() {
    this.#head = null;
    this.#tail = null;
    this.#size = 0;
    return this;
  }

  toArray() {
    return [...this];
  }

  *[Symbol.iterator]() {
    let node = this.#head;
    while (node !== null) {
      yield node.value;
      node = node.next;
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
