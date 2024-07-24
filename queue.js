import Node from "./node.prototype.js";


function Queue(...values){

    let start;
    let next;


    if(values.length){
        start = new Node(values[0]);
        next = start

        for(let i=1;i<values.length;i++){
            let node = new Node(values[i]);
            next.setNext(node);
            next = next.next;

        }
    }
    else{
        start = null;
        next = null;
    }

    this.start = start;
    this.length = values.length;
    this.last = next;

    Object.defineProperty(this, "length", {
        enumerable: false,
        writable: false,
      });
    Object.defineProperty(this, "last",{
        enumerable:true,
        writable:false
    });
    Object.defineProperty(this,"start",{
        enumerable:true,
        writable:false
    })
}

export default Queue;
