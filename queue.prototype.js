import Queue from "./queue.js";
import Node from "./node.prototype.js";


Queue.prototype.Dequeue = function(){
    Object.defineProperty(this,"start",{
        enumerable:true,
        writable:true
    })
    let {start} = this;
    let value = start.value;
    this.start = this.start.next;
    Object.defineProperty(this,"start",{
        enumerable:true,
        writable:false
    })
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
}

Queue.prototype.Enqueue = function(value){
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
}

Queue.prototype.Peek = function(){
    return this.start.value;
}

Queue.prototype.IsEmpty = function(){
    return this.start ? false : true
}

Queue.prototype.Size = function(){
    return this.length;
}

Queue.prototype.Clear = function(){
    Object.defineProperty(this,"start",{
        enumerable:true,
        writable:true
    })
    Object.defineProperty(this,"length",{
        enumerable:true,
        writable:true
    })
    Object.defineProperty(this,"last",{
        enumerable:true,
        writable:true
    })
    this.start = null;
    this.length = 0;
    this.last = null;
    Object.defineProperty(this,"start",{
        enumerable:true,
        writable:false
    })
    Object.defineProperty(this,"length",{
        enumerable:true,
        writable:false
    })
    Object.defineProperty(this,"last",{
        enumerable:true,
        writable:false
    })
}

Queue.prototype.ToArray = function(){
    let arr = [];
    let next = this.start;

    for(let i =0;i<this.length;i++){
        let value = next.value;
        arr.push(value);
        next = next.next;
    };

    return arr;
}

export default Queue;
