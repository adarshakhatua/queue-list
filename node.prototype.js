import Node from "./node.js";


Node.prototype.setValue = function(value){
    Object.defineProperty(this,"value",{
        enumerable:true,
        writable:true
    });
    this.value = value;
    Object.defineProperty(this,"value",{
        enumerable:true,
        writable:false
    });
}

Node.prototype.setNext = function(next){
    Object.defineProperty(this,"next",{
        enumerable:true,
        writable:true,
    })  
    this.next = next;
    Object.defineProperty(this,"next",{
        enumerable:true,
        writable:false
    })

}

export default Node;
