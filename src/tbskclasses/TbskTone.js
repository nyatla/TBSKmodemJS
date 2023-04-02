// @ts-check

import {WasmProxy} from "../utils/classes.js"
import {set_default} from "../utils/functions.js"

export class TraitTone extends WasmProxy {
    /**
     * @param {*} mod 
     * @param {*} inst
     */
    constructor(mod,inst,length) {
        super(mod,inst);
        this._length=length;
    }
    get length(){return this._length;}
}



export class CustomTone extends TraitTone {
    /**
     * @param {*} mod 
     * @param {number[]} double_array 
     */
    constructor(mod,double_array) {
        super(mod,mod._wasm_tbskmodem_TraitTone(double_array),double_array.length);
    }
}
export class SinTone extends TraitTone {
    /**
     * 
     * @param {*} mod 
     * @param {number} points AS int 
     * @param {number} cycle  AS int
     */
    constructor(mod,points, cycle) {
        let _cycle = set_default(cycle, 1);
        super(mod,mod._wasm_tbskmodem_SinTone(points, _cycle),points*cycle);
    }
}
export class XPskSinTone extends TraitTone
{
    /**
     * 
     * @param {*} mod 
     * @param {number} points AS int
     * @param {number} cycle  AS int
     * @param {number} div  AS int
     */
    constructor(mod,points, cycle=1, div=8) {
        super(mod,mod._wasm_tbskmodem_XPskSinTone(points, cycle, div),points*cycle);
    }
}


