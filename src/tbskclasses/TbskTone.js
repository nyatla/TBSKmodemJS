// @ts-check

import {WasmProxy} from "../utils/classes.js"
import {set_default} from "../utils/functions.js"

export class TraitTone extends WasmProxy {
    /**
     * @param {*} mod 
     * @param {number[]} double_array 
     */
    constructor(mod,double_array) {
        super(mod,mod._wasm_tbskmodem_TraitTone(double_array));
    }
}
export class SinTone extends WasmProxy {
    /**
     * 
     * @param {*} mod 
     * @param {number} points AS int 
     * @param {number} cycle  AS int
     */
    constructor(mod,points, cycle) {
        let _cycle = set_default(cycle, 1);
        super(mod,mod._wasm_tbskmodem_SinTone(points, _cycle));
    }
}
export class XPskSinTone extends WasmProxy
{
    /**
     * 
     * @param {*} mod 
     * @param {number} points AS int
     * @param {number} cycle  AS int
     * @param {number} div  AS int
     */
    constructor(mod,points, cycle, div) {
        let _cycle = set_default(cycle, 1);
        let _div = set_default(div, 8);
        super(mod,mod._wasm_tbskmodem_XPskSinTone(points, _cycle, _div));
    }
}


