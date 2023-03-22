import {WasmProxy,IntOutputIterator,DoubleInputIterator} from "../utils/classes.js"
import {PassDecoder,Utf8Decoder} from "../utils/decoder.js"
import { TraitTone } from "./TbskTone.js";

//@ts-check

export class TbskDemodulator extends WasmProxy
{
    /**
     * 
     * @param {TraitTone} tone
     * @param {Preamble} preamble
     */
    constructor(mod,tone, preamble_th=1.,preamble_cycle=4) {
        super(mod,mod._wasm_tbskmodem_TbskDemodulator_A(tone._wasm_instance, preamble_th, preamble_cycle));
    }
    /**
     * 
     * @param {DoubleInputIterator} src
     */
    _demodulateAsInt(src)
    {
        const mod=this._mod;
        let r = mod._wasm_tbskmodem_TbskDemodulator_DemodulateAsInt(this._wasm_instance, src._wasm_instance);
        if (r == 0) {
            return null;
        }
        return new IntOutputIterator(mod,r);
    }
    /**
     * @param src array[double]
     * @param {string} decoder
     * "utf8" utf8でデコードして返します。
     * undefined byte値配列を返します。
     * @returns {string[]|number[]}
     */
    demodulate(src, decoder = undefined)
    {
        const mod=this._mod;
        if (decoder == "utf8") {
            decoder = new Utf8Decoder();
        } else {
            decoder = new PassDecoder();
        }
        let buf = new DoubleInputIterator(mod);
        try {
            buf.puts(src);
            //double*を渡して、intイテレータをもらう。リカバリしない。
            //                        let wi = MOD._wasm_tbskmodem_TbskDemodulator_DemodulateAsInt(this._wasm_instance, buf._wasm_instance);
            let out=this._demodulateAsInt(buf);
            if (out == null) {
                return [];
            }
            // arrayに変換
            try {
                if (decoder) {
                    return decoder.put(out.toArray());
                } else {
                    return out.toArray();
                }
            } finally {
                out.dispose();
            }
        } finally {
            buf.dispose();
        }
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
        return new DemodulateResult(mod,r);
    }
}

class DemodulateResult extends WasmProxy {
    constructor(mod,wasm_instance) {
        super(mod,wasm_instance);
    }
    getType() {
        return this._mod._wasm_tbskmodem_TbskDemodulator_DemodulateResult_GetType(this._wasm_instance);
    }
    getOutput() {
        return new IntOutputIterator(this._mod,this._mod._wasm_tbskmodem_TbskDemodulator_DemodulateResult_GetOutput(this._wasm_instance));
    }
    getRecover() {
        const mod=this._mod;
        let wi = mod._wasm_tbskmodem_TbskDemodulator_DemodulateResult_Recover(this._wasm_instance);
        if (wi == 0) {
            return null;
        }
        return new IntOutputIterator(mod,wi);
    }
}