class DumpProcessor extends AudioWorkletProcessor
{
    constructor(){
        super();
        console.log("DumpProcessor ready!");
        this._q=[];
        this.port.onmessage = (e) => {
            switch(e.data){
            case "start":
                this._q=[];
                break;
            case "stop":
                this._q=undefined;
                break;
            case "clear":
                this._q=this._q?[]:this._q;
                break;
            default:
                console.log("Invalid message:"+e.data); 
            }
            console.log(e.data);
          };
    }
    process(inputs, outputs, parameters){
        let _t=this;
        if(!_t){
            return true;
        }
        for(let i=0;i<inputs.length;i++){
            _t._q.push(inputs[i][0]);//ch1のみ
        }
        if(_t._q.length>1000){
            console.log("Buffer overflow.");
        }
        function f(){
            let proc=new Promise((resolve) => {
                _t.port.postMessage({name:"data",value:_t._q.shift()});
                resolve();
            });            
            proc.then(()=>{if(_t._q.length>0){f();}});
        }
        f();
        return true;
    }
  }
  
  registerProcessor("dump-processor", DumpProcessor);