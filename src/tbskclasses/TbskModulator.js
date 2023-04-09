//@ts-check

import {WasmProxy,IntInputIterator,DoubleOutputIterator} from "../utils/classes"
import { TraitTone } from "./TbskTone";

/**
 * 
 */
export class TbskModulator extends WasmProxy
{
    static DEFAULT_PREAMBLE_CYCLE=4;
    /**
     * @param {*} mod
     * @param {TraitTone} tone
     * @param {number|undefined} preamble_cycle
     */
    constructor(mod,tone, preamble_cycle = undefined) {  
        super(
            mod,
            mod._wasm_tbskmodem_TbskModulator_A(
            tone._wasm_instance,
            preamble_cycle!==undefined?preamble_cycle:TbskModulator.DEFAULT_PREAMBLE_CYCLE
            ));
    }
    /**
     * @param {array[number]|string} src
     * @param {boolean} stopsymbol
     * @return {Array[number]}
     */
    modulate(src,stopsymbol=true)
    {
        let mod=this._mod;
        var buf = new IntInputIterator(mod);
        try {
            //srcの型で分岐
            let ssrc;
            if (typeof (src) == "string") {
                let te = new TextEncoder();
                ssrc=te.encode(src);//intに変換
            } else {
                ssrc=src;
            }
            buf.puts(ssrc);
            //int*を渡して、[int,float...]のポインタを返してもらう。
            let wi = mod._wasm_tbskmodem_TbskModulator_Modulate(this._wasm_instance, buf._wasm_instance, stopsymbol);
            if (wi == null) {
                throw new Error();
            }
            // arrayに変換
            let out = new DoubleOutputIterator(mod,wi);
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
     * JS拡張。オーディオコンテキストのバッファを返す。
     * @param {AudioContext} actx
     * @param {array[number]} src
     * @param {number} sampleRate
     * @return {AudioBuffer}
     */
    modulate2AudioBuffer(actx, src, sampleRate) {
        let f32_array = this.modulate(src);
        //console.log(f32_array);
        let buf = actx.createBuffer(1, f32_array.length, sampleRate);
        buf.getChannelData(0).set(f32_array);
        return buf;
    }
    version(){
        return null;
    }
}

