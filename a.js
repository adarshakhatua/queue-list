import Queue from "./index.js";



let queue = new Queue(1,2,3,4,{key:"hi"},[1,2,3,[1,2]]);
// queue.dequeue()
//console.log(queue.dequeue());
queue.enqueue(9)                                                
// queue.enqueue(9)
queue.dequeue()
console.log(queue );