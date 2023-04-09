//@ts-check
import { StopIteration } from "../tbskclasses/StopIteration";
import {BrokenTextStreamDecoder} from "./BrokenTextStreamDecoder"
import { TbskException } from "./classes";
import { TBSK_ASSERT } from "./functions";

export class EPacketConverter extends TbskException{
}

/**
 * バイトストリームを変換します。
 * convert関数は入力に対して逐次、又は一括して変換結果を返します。
 * 変換エラーの場合はその時点で例外を発生させてください。
 * reset,put,next関数を実装してください。
 */
export class IPacketConverter{
    constructor(name){
        this._name=name;
    }
    get name(){return this._name};
    /**
     * インスタンスの状態をリセットします。
     * 継承クラスで実装を追加してください。
     */
    reset(){
        throw new EPacketConverter();
    }
    /** 変換元バイト値を入力します。
     *  @param {number|undefined} value 
     * undefinedを入力すると終端となります。以降の入力は無視され、0が返ります。
     * @returns {number}
     * 読み取った入力のサイズを0か1で返します。0の場合、入力は終端しています。
     * @throws {EPacketConverter}
     * 変換の途中でエラーが発生した場合、例外を返します。
     */
    put(value){
        throw new EPacketConverter();
    }

    /**
     * @returns {number}
     * 変換したバイトストリームです。
     * @throws {RecoveableStopIteration}
     * 出力は確定しておらず、入力待ちであることを示します。
     * 引き続きputで入力が可能です。
     * @throws {StopIteration}
     * 出力は確定しており、変換済バイトストリームの終端に到達したことを示します。
     */
    next(){
        throw new StopIteration();
    }
    /** 変換元データを入力します。
     *  @param {number[]|undefined} data 
     * undefinedを入力すると終端となります。以降の入力は無視され、0が返ります。
     * @returns {number}
     * 読み取った入力のサイズを0か1以上で返します。入力サイズと異なる場合、変換できたサイズが返ります。
     * 入力の終端以降に呼び出された場合は0を返します。
     * @throws {EPacketConverter}
     * 変換の途中でエラーが発生した場合、例外を返します。
     */
    puts(data)
    {
        let r=0;
        if(data===undefined){
            return this.put(undefined);
        }else{
            for(let i=0;i<data.length;i++){
                if(this.put(data[i])==0){
                    break;
                }
                r++;
            }
        }
        return r;
    }

    /**
     * 変換済のバイトストリームを配列にして返します。
     * put(undefined)で終端していない場合、確定済みの部分だけを返します。
     * @returns {number[]}
     * 
     */
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
