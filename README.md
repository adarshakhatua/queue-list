# queue-list

`queue-list` is a simple npm package that provides an implementation of a queue data structure in JavaScript. It allows you to easily create and manipulate queues with enqueue, dequeue, peek, isEmpty, size, clear, and toArray operations.

## Installation

To install the package, use npm:

```bash
npm install queue-list
```
# Usage

### Importing the package
```
import Queue from 'queue-list';
```

### Creating a Queue
```
// Creating an empty queue
const myQueue = new Queue();

// Creating a queue with initial values
const initializedQueue = new Queue(1, 2, 3);
```


## Enqueue
Add an element to the end of the queue.

```
myQueue.Enqueue(4);
```

## Dequeue
Remove and return the element from the front of the queue.

```
const dequeuedItem = myQueue.Dequeue();
```

## Peek
Get the element at the front of the queue without removing it.
```
const frontElement = myQueue.Peek();
```

## IsEmpty
Check if the queue is empty.
```
const emptyStatus = myQueue.IsEmpty();
```

## Size
Get the number of elements in the queue.
```
const queueSize = myQueue.Size();
```

## Clear
Remove all elements from the queue.
```
myQueue.Clear();
```

## ToArray
Convert the queue to an array.
```
const queueArray = myQueue.ToArray();
```

Example

```
const myQueue = new Queue(1, 2, 3);

myQueue.Enqueue(4);
myQueue.Enqueue(5);

console.log(myQueue.ToArray()); // [1, 2, 3, 4, 5]

const dequeuedItem = myQueue.Dequeue();
console.log(dequeuedItem); // 1

console.log(myQueue.Size()); // 4
console.log(myQueue.Peek()); // 2

myQueue.Clear();
console.log(myQueue.IsEmpty()); // true
```

# License
This project is licensed under the MIT License - see the LICENSE.md file for details.

# Acknowledgments
This package is inspired by the need for a simple and efficient queue implementation in JavaScript.
Feel free to use and contribute to make this package even better! If you encounter any issues or have suggestions for improvement, please open an issue on the GitHub repository.

