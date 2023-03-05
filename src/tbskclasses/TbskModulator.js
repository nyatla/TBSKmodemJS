
import {WasmProxy,IntInputIterator,DoubleOutputIterator} from "../utils/classes.js"


export class TbskModulator extends WasmProxy
{
    /**
     * 
     * @param {Tone} tone
     * @param {Preamble} preamble
     */
    constructor(mod,tone, preamble_cycle = 4) {  
        super(mod,mod._wasm_tbskmodem_TbskModulator_A(tone._wasm_instance, preamble_cycle));
    }
    /**
     * @param {array[uint8]|string} src
     * @param {boolean} stopsymbol
     * @return {FloatArray}
     */
    modulate(src,stopsymbol=true)
    {
        let mod=this._mod;
        var buf = new IntInputIterator(mod);
        try {
            if (typeof (src) == "string") {
                let te = new TextEncoder();                    
                buf.puts(te.encode(src));
            } else {
                buf.puts(src);
            }
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
     * @param {array[int]} src
     * @param {int} sampleRate
     * @return {BufferSource}
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

