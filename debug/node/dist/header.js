//@ts-check

const jQuery = require("jquery");

export function TEST(message,e){
    if(!e){
        console.error("[FAIL]"+message);
    }else{
        console.log("[PASS]"+message);
    }
}

export class CheckPoint
{
    constructor(name){
        this._name=name;
        this._step=0;
    }
    info(){
        console.log("[INFO] CheckPoint "+this._name);
        return this;
    }
    step(v,message){
        if(v===undefined){
            return;//ignode
        }
        let m=message===undefined?"":"("+message+")";
        if(v!=this._step){
            throw new Error("[ NG ] Invalid step:"+v+" correct:"+this._step+m);
        }
        console.log("[ OK ] step:"+this._step+m);
        this._step++;
    }
    catchException(f){
        try{
            f();
            console.error("[ NG ] No exception has occurred.");
        }catch(e){
            console.log("[ OK ] Exception has occurred.");
        }
    }
    dontcalled(){
        console.error("[ NG ] cont call pass.");
        throw new Error();
    }

    deadend(){
        console.error("[ NG ] dead end.");
        throw new Error();
    }
    complete(l){
        if(l==this._step-1){
            console.log("[PASS] Complete :"+l);
        }else{
            console.error("[INFO] unreached :"+l+"!="+this._step);
        }
    }
}

