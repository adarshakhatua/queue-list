function Node(value,next=null){
    this.value = value;
    this.next = next;
    Object.defineProperty(this,"value",{
        enumerable:true,
        writable:false
    });
    Object.defineProperty(this,"next",{
        enumerable:true,
        writable:false
    })
}


export default Node;