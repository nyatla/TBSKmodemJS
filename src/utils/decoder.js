//@ts-check
import {BrokenTextStreamDecoder} from "./BrokenTextStreamDecoder"




export class PassDecoder {
    reset() { }
    /**
     * @param {number[]} data Uint8の数列
     * undefindならから文字列を返します。
     * @returns 
     */
    put(data) { return data===undefined?[]:data; }

}

/**
 * バイト列を逐次変換します変換されなかった文字列は切り捨てます。
 */
export class Utf8Decoder {
    constructor() {
        this._decoder = new BrokenTextStreamDecoder("utf8");
        this._q = [];
        this._tmp = [];
    }
    reset() {
        this._q = [];
        this._tmp = [];
    }
    /**
     * @param {number[]|undefined} data Uint8の数列
     * undefindで未確定部分も吐き出します。
     * @returns
     * 文字列、またはから文字列
     */
    put(data=undefined) {
        let r="";
        if(data!==undefined){
            for (let i = 0; i < data.length; i++) {
                let c=this._decoder.update(data[i]);
                if(c!=null){
                    r=r+((typeof c)=="number"?"?":c);
                }
            }
        }else{
            for(let w=this._decoder.update();w!=null;w=this._decoder.update()){
                if(w==null)continue;
                r=r+((typeof w)=="number"?"?":w);
            }            
        }
        return (r.length>0)?r:"";
    }
}
