//@ts-check
import {BrokenTextStreamDecoder} from "./BrokenTextStreamDecoder"




export class PassDecoder {
    reset() { }
    /**
     * @param {number[]} data Uint8の数列
     * @returns 
     */
    put(data) { return data; }

}

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
     * @param {number[]} data Uint8の数列
     * @returns 
     */
    put(data) {
        let r="";
        for (let i = 0; i < data.length; i++) {
            let c=this._decoder.update(data[i]);
            if(c!=null){
                r=r+c;
            }
        }
        return (r.length>0)?r:undefined;
    }
}
