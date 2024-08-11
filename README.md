# queue-list

## Overview

#### 👉Note: All methods including `enqueue`, `dequeue`, `peek`, `isEmpty`, `size`, and `clear` have constant time complexity 😎 O(1)

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
| enqueue | Adds a new element to the end of the queue. | The queue instance (this) | O(1) | `queue.enqueue(1).enqueue('text').enqueue({ key: 'value' });` |
| dequeue | Removes and returns the element at the front of the queue. | The removed element or null if empty | O(1) | `const value = queue.dequeue(); // 1` |
| peek | Returns the value of the front element without removing it. | The front element or null if empty | O(1) | `const front = queue.peek(); // 'text'` |
| isEmpty | Checks if the queue is empty. | `true` if empty, `false` otherwise | O(1) | `const empty = queue.isEmpty(); // false` |
| size | Returns the number of elements in the queue. | The number of elements | O(1) | `const length = queue.size(); // 2` |
| clear | Removes all elements from the queue and resets it to an empty state. | The queue instance (this) | O(1) | `queue.clear();` |
| toArray | Converts the queue to an array of elements. | An array of elements | O(n) | `const array = queue.toArray(); // [1, 'text', '{"key":"value"}']` |
| getType | Returns the type of data structure. | "queue" | O(1) | `const type = queue.getType(); // "queue"` |

## Custom Console Logging

The `console.log` method has been customized to properly handle and format `Queue` instances. When logging a `Queue` instance, its `toString` representation will be used.

### Custom Console Log Example

```jsx
import Queue from 'queue-list';

const queue = new Queue(10, "text", { key: 'value' });

console.log(queue); // Output: Front -> |10| |"text"| |{"key":"value"}| <- Rear

queue.dequeue();
console.log(queue); // Output: Front -> |"text"| |{"key":"value"}| <- Rear

queue.clear();
console.log(queue); // Output: Front -> || <- Rear
```

## Detailed Example Use Cases

## `enqueue(value)`

**Purpose:** Adds a new element to the end of the queue.

**Typical Use Case:**

```jsx
import Queue from 'queue-list';

const queue = new Queue(1, "string", true, [1, 2], { key: 'value' });
queue.enqueue(null).enqueue(undefined);
console.log(queue); // Output: "Front -> |1| |"string"| |true| |[1,2]| |{"key":"value"}| |null| |undefined| <- Rear"
```

**Edge Cases:**

1. **Enqueue on an empty queue:**

```jsx
const queue = new Queue();
queue.enqueue(10).enqueue("text").enqueue([1, 2, 3]).enqueue({ key: 'value' });
console.log(queue); // Output: "Front -> |10| |"text"| |[1,2,3]| |{"key":"value"}| <- Rear"
```

2. **Enqueue on a non-empty queue:**

```jsx
const queue = new Queue('initial');
queue.enqueue(42).enqueue({ foo: 'bar' }).enqueue([1, 2]);
console.log(queue); // Output: "Front -> |'initial'| |42| |{"foo":"bar"}| |[1,2]| <- Rear"
```

## `dequeue()`

**Purpose:** Removes and returns the element at the front of the queue. Returns `null` if the queue is empty.

**Typical Use Case:**

```jsx
import Queue from 'queue-list';

const queue = new Queue(1, 'text', { key: 'value' });
console.log(queue.dequeue()); // Output: 1
console.log(queue); // Output: "Front -> |'text'| |{"key":"value"}| <- Rear"
```

**Edge Cases:**

1. **Dequeue from an empty queue:**

```jsx
const queue = new Queue();
console.log(queue.dequeue()); // Output: null
```

2. **Dequeue until the queue is empty:**

```jsx
const queue = new Queue('item1', 'item2');
console.log(queue.dequeue()); // Output: 'item1'
console.log(queue.dequeue()); // Output: 'item2'
console.log(queue.dequeue()); // Output: null
```

## `peek()`

**Purpose:** Returns the value of the front element without removing it. Returns `null` if the queue is empty.

**Typical Use Case:**

```jsx
import Queue from 'queue-list';

const queue = new Queue('first', 42, { key: 'value' });
console.log(queue.peek()); // Output: 'first'
```

**Edge Cases:**

1. **Peek on an empty queue:**

```jsx
const queue = new Queue();
console.log(queue.peek()); // Output: null
```

2. **Peek after several enqueues and dequeues:**

```jsx
const queue = new Queue('item1', 'item2', 'item3');
queue.dequeue(); // Removes 'item1'
console.log(queue.peek()); // Output: 'item2'
```

## `isEmpty()`

**Purpose:** Checks if the queue is empty.

**Typical Use Case:**

```jsx
import Queue from 'queue-list';

const queue = new Queue(1, 'text');
console.log(queue.isEmpty()); // Output: false
queue.dequeue();
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
queue.enqueue('data');
console.log(queue.isEmpty()); // Output: false
queue.dequeue();
console.log(queue.isEmpty()); // Output: true
```

## `size()`

**Purpose:** Returns the number of elements in the queue.

**Typical Use Case:**

```jsx
import Queue from 'queue-list';

const queue = new Queue(1, 'text', [1, 2], { key: 'value' });
console.log(queue.size()); // Output: 4
```

**Edge Cases:**

1. **Size of an empty queue:**

```jsx
const queue = new Queue();
console.log(queue.size()); // Output: 0
```

2. **Size after several operations:**

```jsx
const queue = new Queue('start');
queue.enqueue('middle');
queue.dequeue();
console.log(queue.size()); // Output: 1
```

## `clear()`

**Purpose:** Removes all elements from the queue and resets it to an empty state.

**Typical Use Case:**

```jsx
import Queue from 'queue-list';

const queue = new Queue(1, 'text', [1, 2]);
queue.clear();
console.log(queue); // Output: "Front -> || <- Rear"
console.log(queue.isEmpty()); // Output: true
```

**Edge Cases:**

1. **Clear an empty queue:**

```jsx
const queue = new Queue();
queue.clear();
console.log(queue); // Output: "Front -> || <- Rear"
```

2. **Clear a queue with elements:**

```jsx
const queue = new Queue('item1', 'item2');
queue.clear();
console.log(queue.size()); // Output: 0
```

## `toArray()`

**Purpose:** Converts the queue to an array of elements.

**Typical Use Case:**

```jsx
import Queue from 'queue-list';

const queue = new Queue(1, 'text', [1, 2], { key: 'value' });
console.log(queue.toArray()); // Output: [1, 'text', [1,2], {"key":"value"}]
```

**Edge Cases:**

1. **Convert an empty queue to an array:**

```jsx
const queue = new Queue();
console.log(queue.toArray()); // Output: []
```

2. **Convert a queue with various elements:**

```jsx
const queue = new Queue('string', 42, { foo: 'bar' }, [1, 2]);
console.log(queue.toArray()); // Output: [ 'string', 42, { foo: 'bar' }, [ 1, 2 ] ]
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
queue.enqueue('element');
console.log(queue.getType()); // Output: "queue"
```

## License

This project is licensed under the MIT License - see the LICENSE.md file for details.

## Acknowledgments

This package is inspired by the need for a simple and efficient queue implementation in JavaScript. Feel free to use and contribute to make this package even better! If you encounter any issues or have suggestions for improvement, please open an issue on the GitHub repository.

Here is the [GitHub Repo Link](https://github.com/adarshakhatua/queue-list).