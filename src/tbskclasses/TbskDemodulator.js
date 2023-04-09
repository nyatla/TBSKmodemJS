import {WasmProxy,IntOutputIterator,DoubleInputIterator, BasicOutputIterator} from "../utils/classes.js"
import {PassDecoder,Utf8Decoder} from "../utils/decoder.js"
import { TBSK_ASSERT } from "../utils/functions.js";
import { IPacketConverter } from "../utils/packetconverter.js";
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
     * @param {IPacketConverter|undefined} decoder
     */
    constructor(mod,tone, preamble_th=undefined,preamble_cycle=undefined,decoder=undefined) {
        super(mod,mod._wasm_tbskmodem_TbskDemodulator_A(
            tone._wasm_instance,
            preamble_th!==undefined?preamble_th:TbskDemodulator.DEFAULT_PREAMBLE_TH,
            preamble_cycle!==undefined?preamble_cycle:TbskDemodulator.DEFAULT_PREAMBLE_CYCLE));
        this._decoder=decoder;
    }

    
    /**
     * @param src array[double]
     * パケットデコーダーを指定します。
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
                let decoder=this._decoder;
                if(decoder){
                    decoder.reset();
                    decoder.puts(out.toArray());
                    decoder.put(undefined);
                    return decoder.toArray();
                }else{
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
     * @param src array[double]
     * パケットデコーダーを指定します。
     * @returns {string[]}
     */
    demodulateAsStr(src)
    {
        let encoding = new Utf8Decoder();
        return encoding.put(this.demodulate(src));
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

/**
 * アンパック対応のをつくる。
 */
class IntOutputIterator2 extends BasicOutputIterator
{
    /**
     * 
     * @param {*} mod 
     * @param {*} wasm_instance 
     * @param {IPacketConverter} codec 
     */
    constructor(mod,wasm_instance,codec)
    {
        super(mod,wasm_instance);
        this._codec=codec;
        this._stop=false;
    }
    next()
    {
        let codec=this._codec;
        //ソースの終端に到達してなければソースから取得
        if(!this._stop){
            let iter_status=undefined;
            while(true)
            {
                iter_status = this._mod._wasm_tbskmodem_IntOutputIterator_hasNext(this._wasm_instance);
                if(iter_status==0) {
                    //取れるだけ取る
                    let d=this._mod._wasm_tbskmodem_IntOutputIterator_lastNext(this._wasm_instance);
                    if(codec.put(d)==0){
                        iter_status=2;//コーデックの充足通知
                        break;
                    };
                    continue;
                }else{
                    break;
                }
            }
            switch (iter_status) {
                case 1://RecoveableStopIteration
                    break;
                case 2://StopIteration
                    codec.put(undefined);//終端指示
                    this._stop=true;
                    break;
                default:
                    throw new Error();
            }
        }
        return codec.next();
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
        if(this._codec){
            return new IntOutputIterator2(mod,mod._wasm_tbskmodem_TbskDemodulator_DemodulateResult_GetOutput(this._wasm_instance),this._codec);
        }else{
            return new IntOutputIterator(mod,mod._wasm_tbskmodem_TbskDemodulator_DemodulateResult_GetOutput(this._wasm_instance));
        }
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
        if(this._codec){
            return new IntOutputIterator2(mod,wi,this._codec);
        }else{
            return new IntOutputIterator(mod,wi);
        }

    }
}