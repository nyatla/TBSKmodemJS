import {WasmProxy,IntOutputIterator,DoubleInputIterator, BasicOutputIterator} from "../utils/classes.js"
import {Utf8Decoder} from "../utils/decoder.js"
import { TraitTone } from "./TbskTone.js";

//@ts-check

export class TbskDemodulator extends WasmProxy
{
    static DEFAULT_PREAMBLE_TH=1.;
    static DEFAULT_PREAMBLE_CYCLE=4;
    
    /**
     * 
     * @param {TraitTone} tone
     * @param {number|undefined} preamble_th
     * @param {number|undefined} preamble_cycle
     */
    constructor(mod,tone, preamble_th=undefined,preamble_cycle=undefined) {
        super(mod,mod._wasm_tbskmodem_TbskDemodulator_A(
            tone._wasm_instance,
            preamble_th!==undefined?preamble_th:TbskDemodulator.DEFAULT_PREAMBLE_TH,
            preamble_cycle!==undefined?preamble_cycle:TbskDemodulator.DEFAULT_PREAMBLE_CYCLE));
    }

    
    /**
     * @param src array[double]
     * @returns {number[]}
     * @throws
     * デコードで例外が発生した場合
     */
    demodulate(src)
    {
        const mod=this._mod;
        let buf = new DoubleInputIterator(mod);
        try {
            buf.puts(src);
            //double*を渡して、intイテレータをもらう。リカバリしない。
            //                        let wi = MOD._wasm_tbskmodem_TbskDemodulator_DemodulateAsInt(this._wasm_instance, buf._wasm_instance);
            let r = mod._wasm_tbskmodem_TbskDemodulator_DemodulateAsInt(this._wasm_instance, buf._wasm_instance);
            if (r == 0) {
                return [];
            }
            let out=new IntOutputIterator(mod,r);
            if (out == null) {
                return [];
            }
            // arrayに変換
            try {
                return out.toArray();
            } finally {
                out.dispose();
            }
        } finally {
            buf.dispose();
        }
    }

    /**
     * @param src array[double]
     * パケットデコーダーを指定します。
     * @returns {string[]}
     */
    demodulateAsStr(src)
    {
        let encoding = new Utf8Decoder();
        let t=encoding.put(this.demodulate(src));
        let s=encoding.put();
        return t+((s!=undefined)?s:"");
    }
    /**
     * 未検出でストリームが中断したらnull
     * @param {any} src
     * @return {DemodulateResult}
     */
    _demodulateAsInt_B(src){
        const mod=this._mod;
        let r = mod._wasm_tbskmodem_TbskDemodulator_DemodulateAsInt_B(this._wasm_instance, src._wasm_instance);
        if (r == 0) {
            return null;
        }
        return new DemodulateResult(mod,r,this._decoder);
    }
}




class DemodulateResult extends WasmProxy {
    constructor(mod,wasm_instance,codec)
    {
        super(mod,wasm_instance);
        this._codec=codec;
    }
    getType() {
        return this._mod._wasm_tbskmodem_TbskDemodulator_DemodulateResult_GetType(this._wasm_instance);
    }
    getOutput() {
        const mod=this._mod;
        return new IntOutputIterator(mod,mod._wasm_tbskmodem_TbskDemodulator_DemodulateResult_GetOutput(this._wasm_instance));
    }
    /**
     * インスタンスがrecoverableならリカバリ結果を返す。
     * @returns 
     */
    getRecover() {
        const mod=this._mod;
        let wi = mod._wasm_tbskmodem_TbskDemodulator_DemodulateResult_Recover(this._wasm_instance);
        if (wi == 0) {
            return null;
        }
        return new IntOutputIterator(mod,wi);
    }
}