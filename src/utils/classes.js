// @ts-check
import {TBSK_ASSERT} from "./functions"
import {StopIteration} from "../tbskclasses/StopIteration"
import {RecoverableStopIteration} from "../tbskclasses/RecoverableStopIteration"
export class TbskException extends Error {
    constructor(message,tag=undefined){
        super(message);
        console.log("TbskException",message,tag);
        this._tag=tag;
    }
}

export class PromiseTaskQ{
    constructor(){
        this._q=[];
        this._run=false;
    }
    push(f){
        if(!f){
            return;
        }
        let _t=this;
        _t._q.push(f);
        function kick(){
            let p=Promise.resolve();
            _t._run=true;
            p.then(()=>{
                try{
                    let f=_t._q[0];
                    _t._q.shift();
                    f();
                }finally{
                    if(_t._q.length>0){
                        return kick();
                    }else{
                        _t._run=false;
                    }
                }
            });
            return p;
        }
        //1個めならキック
        if(!_t._run){
        		console.log("kick");
            kick();
        }
    }
    isIdle(){
        return !this._run;
    }
}


/**
 * タスク終了時待ち合わせをするためのjoinメソッドを持つタスク管理クラス。
 * 
 */
export class PromiseTask
{            
    constructor()
    {
        this._resolvers=[];
        this._st=0;
    }
    /**
     * 
     * @param {*} promise 
     */
    async run(promise){
        TBSK_ASSERT(this._st==0);
        this._st=1;
        await promise;
        this._st=2;
        for(let i of this._resolvers){
            i();
        }
    }
    async join(){
        let _t=this;
        switch(this._st){
        case 0:
        case 1:
            //待機キューに積む
            await new Promise((resolve)=>{_t._resolvers.push(resolve);});
            break;
        case 2:
        default:
            //何もしません
            break;
        }
    }
}


export class Disposable {
    dispose() { }
}
export class WasmProxy extends Disposable{
    constructor(mod,wasm_instance) {
        super();
        this._mod=mod;
        this._wasm_instance = wasm_instance;
    }
    dispose() {
        this._mod._wasm_tbskmodem_Dispose(this._wasm_instance);
        this._wasm_instance = null;
        super.dispose();
    }
}


export class IntInputIterator extends WasmProxy {
    constructor(mod) {
        super(mod,mod._wasm_tbskmodem_IntInputIterator());
    }
    /**
     * @param {number} v 
     * @returns 
     */
    put(v) {
        this._mod._wasm_tbskmodem_IntInputIterator_put(this._wasm_instance, v);
        return this;
    }
    /**
     * @param {number[]} v 
     * @returns 
     */
    puts(v) {
        for (var i = 0; i < v.length; i++) {
            this.put(v[i] & 0x000000ff);
        }
        return this;
    }
}
export class DoubleInputIterator extends WasmProxy {
    /**
     * 
     * @param {boolean} is_recoverable
     */
    constructor(mod,is_recoverable=false) {
        super(mod,mod._wasm_tbskmodem_DoubleInputIterator(is_recoverable));
    }
    /**
     * 
     * @param {number} v 
     * @returns 
     */
    put(v) {
        this._mod._wasm_tbskmodem_DoubleInputIterator_put(this._wasm_instance, v);
        return this;
    }
    /**
     * 
     * @param {number[]} v 
     * @returns 
     */
    puts(v) {
        for (var i = 0; i < v.length; i++) {
            this.put(v[i]);
        }
        return this;
    }
}


export class BasicOutputIterator extends WasmProxy {
    constructor(mod,wasm_instance) {
        super(mod,wasm_instance);
    }
    next(){throw new StopIteration();}
    toArray() {
        let r = [];
        try {
            for (; ;) {
                r.push(this.next());
            }
        } catch (e) {
            if (e instanceof StopIteration) {
                //nothing to do
            } else {
                console.log(e);
                throw e;
            }
        }
        return r;
    }
}


export class DoubleOutputIterator extends BasicOutputIterator {
    constructor(mod,wasm_instance) {
        super(mod,wasm_instance);
    }
    next() {
        let s = this._mod._wasm_tbskmodem_DoubleOutputIterator_hasNext(this._wasm_instance);
        switch (s) {
            case 0:
                return this._mod._wasm_tbskmodem_DoubleOutputIterator_lastNext(this._wasm_instance);
            case 1:
                throw new RecoverableStopIteration();
            case 2:
                throw new StopIteration();
            default:
                throw new Error();
        }
    }
}
export class IntOutputIterator extends BasicOutputIterator {
    constructor(mod,wasm_instance) {
        super(mod,wasm_instance);
    }
    next() {
        let s = this._mod._wasm_tbskmodem_IntOutputIterator_hasNext(this._wasm_instance);
        switch (s) {
            case 0:
                return this._mod._wasm_tbskmodem_IntOutputIterator_lastNext(this._wasm_instance);
            case 1:
                throw new RecoverableStopIteration();
            case 2:
                throw new StopIteration();
            default:
                throw new Error();
        }
    }
}