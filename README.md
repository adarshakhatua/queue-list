Certainly! I’ll adjust the examples to use an initializer for the `Queue` instance, as you requested. Here’s the revised documentation with updated examples:

---

# queue-list

---

## Overview

`queue-list` is a JavaScript library for managing a queue data structure. It provides a simple and efficient way to handle elements in a queue with various methods for manipulating and querying the queue. The library also customizes `console.log` to format `Queue` instances.

## Installation

To install `queue-list`, use npm:

```bash
npm install queue-list
```

## Importing

```jsx
import Queue from 'queue-list';
```

## Methods

| Method | Purpose | Returns | Time Complexity | Example Use Case |
| --- | --- | --- | --- | --- |
| enqueue | Adds a new element to the end of the queue. | The queue instance (this) | O(1) | `queue.enqueue(1).enqueue(2);` |
| dequeue | Removes and returns the element at the front of the queue. | The removed element or null if empty | O(1) | `const value = queue.dequeue(); // 1` |
| peek | Returns the value of the front element without removing it. | The front element or null if empty | O(1) | `const front = queue.peek(); // 2` |
| isEmpty | Checks if the queue is empty. | `true` if empty, `false` otherwise | O(1) | `const empty = queue.isEmpty(); // false` |
| size | Returns the number of elements in the queue. | The number of elements | O(1) | `const length = queue.size(); // 1` |
| clear | Removes all elements from the queue and resets it to an empty state. | The queue instance (this) | O(1) | `queue.clear();` |
| toArray | Converts the queue to an array of elements. | An array of elements | O(n) | `const array = queue.toArray(); // [2]` |
| getType | Returns the type of data structure. | "queue" | O(1) | `const type = queue.getType(); // "queue"` |

## Custom Console Logging

The `console.log` method has been customized to properly handle and format `Queue` instances. When logging a `Queue` instance, its `toString` representation will be used.

### Custom Console Log Example

```jsx
import Queue from 'queue-list';

const queue = new Queue(10, 20, 30);

console.log(queue); // Output: Front -> |10| |20| |30| <- Rear

queue.dequeue();
console.log(queue); // Output: Front -> |20| |30| <- Rear

queue.clear();
console.log(queue); // Output: Front -> [] <- Rear
```

## Detailed Example Use Cases

## `enqueue(value)`

**Purpose:** Adds a new element to the end of the queue.

**Typical Use Case:**

```jsx
import Queue from 'queue-list';

const queue = new Queue(1, 2, 3);
queue.enqueue(4).enqueue(5);
console.log(queue); // Output: "Front -> |1| |2| |3| |4| |5| <- Rear"
```

**Edge Cases:**

1. **Enqueue on an empty queue:**

```jsx
const queue = new Queue();
queue.enqueue(10);
console.log(queue.toString()); // Output: "Front -> |10| <- Rear"
```

2. **Enqueue on a non-empty queue:**

```jsx
const queue = new Queue(1, 2);
queue.enqueue(3);
console.log(queue.toString()); // Output: "Front -> |1| |2| |3| <- Rear"
```

## `dequeue()`

**Purpose:** Removes and returns the element at the front of the queue. Returns `null` if the queue is empty.

**Typical Use Case:**

```jsx
import Queue from 'queue-list';

const queue = new Queue(1, 2, 3);
console.log(queue.dequeue()); // Output: 1
console.log(queue.toString()); // Output: "Front -> |2| |3| <- Rear"
```

**Edge Cases:**

1. **Dequeue from an empty queue:**

```jsx
const queue = new Queue();
console.log(queue.dequeue()); // Output: null
```

2. **Dequeue until the queue is empty:**

```jsx
const queue = new Queue(1, 2);
console.log(queue.dequeue()); // Output: 1
console.log(queue.dequeue()); // Output: 2
console.log(queue.dequeue()); // Output: null
```

## `peek()`

**Purpose:** Returns the value of the front element without removing it. Returns `null` if the queue is empty.

**Typical Use Case:**

```jsx
import Queue from 'queue-list';

const queue = new Queue(10, 20, 30);
console.log(queue.peek()); // Output: 10
```

**Edge Cases:**

1. **Peek on an empty queue:**

```jsx
const queue = new Queue();
console.log(queue.peek()); // Output: null
```

2. **Peek after several enqueues and dequeues:**

```jsx
const queue = new Queue(1, 2, 3);
queue.dequeue(); // Removes 1
console.log(queue.peek()); // Output: 2
```

## `isEmpty()`

**Purpose:** Checks if the queue is empty.

**Typical Use Case:**

```jsx
import Queue from 'queue-list';

const queue = new Queue(1);
console.log(queue.isEmpty()); // Output: false
queue.dequeue();
console.log(queue.isEmpty()); // Output: true
```

**Edge Cases:**

1. **Check if an empty queue is empty:**

```jsx
const queue = new Queue();
console.log(queue.isEmpty()); // Output: true
```

2. **Check after adding and removing elements:**

```jsx
const queue = new Queue();
queue.enqueue(5);
console.log(queue.isEmpty()); // Output: false
queue.dequeue();
console.log(queue.isEmpty()); // Output: true
```

## `size()`

**Purpose:** Returns the number of elements in the queue.

**Typical Use Case:**

```jsx
import Queue from 'queue-list';

const queue = new Queue(1, 2, 3);
console.log(queue.size()); // Output: 3
```

**Edge Cases:**

1. **Size of an empty queue:**

```jsx
const queue = new Queue();
console.log(queue.size()); // Output: 0
```

2. **Size after several operations:**

```jsx
const queue = new Queue(10, 20);
queue.dequeue();
console.log(queue.size()); // Output: 1
```

## `clear()`

**Purpose:** Removes all elements from the queue and resets it to an empty state.

**Typical Use Case:**

```jsx
import Queue from 'queue-list';

const queue = new Queue(1, 2, 3);
queue.clear();
console.log(queue.toString()); // Output: "Front -> [] <- Rear"
console.log(queue.isEmpty()); // Output: true
```

**Edge Cases:**

1. **Clear an empty queue:**

```jsx
const queue = new Queue();
queue.clear();
console.log(queue.toString()); // Output: "Front -> [] <- Rear"
```

2. **Clear a queue with elements:**

```jsx
const queue = new Queue(5, 6);
queue.clear();
console.log(queue.size()); // Output: 0
```

## `toArray()`

**Purpose:** Converts the queue to an array of elements.

**Typical Use Case:**

```jsx
import Queue from 'queue-list';

const queue = new Queue(1, 2, 3);
console.log(queue.toArray()); // Output: [1, 2, 3]
```

**Edge Cases:**

1. **Convert an empty queue to an array:**

```jsx
const queue = new Queue();
console.log(queue.toArray()); // Output: []
```

2. **Convert a queue with multiple elements:**

```jsx
const queue = new Queue('a', 'b', 'c');
console.log(queue.toArray()); // Output: ['a', 'b', 'c']
```

### `getType()`

**Purpose:** Returns the type of data structure.

**Typical Use Case:**

```jsx
import Queue from 'queue-list';

const queue = new Queue();
console.log(queue.getType()); // Output: "queue"
```

**Edge Cases:**

1. **Type of an empty queue:**

```jsx
const queue = new Queue();
console.log(queue.getType()); // Output: "queue"
```

2. **Type after various operations:**

```jsx
const queue = new Queue();
queue.enqueue(1);
console.log(queue.getType()); // Output: "queue"
```

# License

This project is licensed under the MIT License - see the LICENSE.md file for details.

# Acknowledgments

This package is inspired by the need for a simple and efficient queue implementation in JavaScript. Feel free to use and contribute to make this package even better! If you encounter any issues or have suggestions for improvement, please open an issue on the GitHub repository.

Here is the [GitHub Repo Link](https://github.com/adarshakhatua/queue-list).