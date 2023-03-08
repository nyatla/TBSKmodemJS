// @ts-check
import {StopIteration} from "../tbskclasses/StopIteration"
import {RecoverableStopIteration} from "../tbskclasses/RecoverableStopIteration"
export class TbskException extends Error {
    constructor(message,tag=undefined){
        super(message);
        console.log("TbskException",message,tag);
        this._tag=tag;
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