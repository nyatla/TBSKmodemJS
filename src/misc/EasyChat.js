// @ts-check

import { TbskModem } from "../tbskclasses/TbskModem.js";
import { TbskReceiver } from "../tbskclasses/TbskReceiver.js";
import { TraitTone, XPskSinTone } from "../tbskclasses/TbskTone.js";
import { TbskTransmitter } from "../tbskclasses/TbskTransmitter.js";
import { TbskException } from "../utils/classes";
import { PromiseLock, PromiseTask } from "../utils/promiseutils";
import { TBSK_ASSERT } from "../utils/functions.js";


const ST={
    CLOSED  :0, //閉じている
    OPENNING:1, //OPENが実行中
    RECIVING:3, //受信中
    RECEIVE_SUSPEND_WAIT:4,
    SENDING:6,
    SEND_BREAK:7,
    CLOSING:8


};
/**
 * 簡易的な半二重通信チャットインタフェイスです。
 */
export class EasyChat extends EventTarget
{
    static ST=ST;
    get status(){return this._status;};
    /**
     * @param {any} mod
     * @param {TraitTone|undefined} tone
     * ラップするモデムインスタンス.省略時はデフォルトモデムを生成。
     * @param {Number|undefined} preamble_cycle
     * プリアンブルの数 
     */
    constructor(mod,tone=undefined,preamble_cycle=undefined)
    {
        super();
        let _t=this;
        _t._callOnOpen=()=>
        {
            _t.dispatchEvent(new CustomEvent("open"));
        };
        _t._callOnClose= ()=>{

        };
        _t._callOnPacket=(d)=>
        {
            _t.dispatchEvent(new CustomEvent("message",d));
        };
        _t._callOnSignal=()=>{

        };
        _t._callOnUpdate=(d)=>{

        };
        _t._callOnSignalLost=()=>{

        };        
        _t._status=ST.CLOSED;
        let attached=false;
        if(!tone){
            tone=new XPskSinTone(mod,10,10);
            attached=true;
        }        
        _t._tx=new TbskTransmitter(mod,tone,preamble_cycle);
        _t._rx=new TbskReceiver(mod,tone,preamble_cycle);
        if(attached){
            tone.dispose();
        }
        _t._close_lock=undefined;   //closingのロック
        _t._txbreak_lock=undefined;
        _t._send_current=undefined; //txの送信パラメータ
    }

    /**
     * @async
     * 回線を開きます。 
     * awaitした場合、openの結果を返します。
     * @returns {Promise<void>}
     * Trueの場合、openがコールされます。
     * @throws
     * ステータス以上の場合
     */
    async open(carrier)
    {
        let _t=this;
        if(this._status!=ST.CLOSED){
            return;
        }
        let tx=_t._tx;
        let rx=_t._rx;
        //
        _t._status=ST.OPENNING;
        await rx.open(carrier);
        await tx.open(rx.audioContext,carrier);
        _t._callOnOpen();
        _t._status=ST.RECIVING;
        //RXタスクは非同期で実効。
        class RxRecvTask extends PromiseTask
        {
            static ST={
                NONE:0,
                RECVING:1,
                INTERRUPT:2,
                REQ_SUSPEND:3

            }
            /**
             * @param {TbskReceiver} rx 
             * open済のrx
             */
            constructor(rx){
                super();
                const ST=RxRecvTask.ST;
                this._rx=rx;
                this._running=false;
            }
            async run(onSignal,onUpdate,onSignalLost)
            {
                let _t=this;
                _t._request=undefined;
                const ST=RxRecvTask.ST;
                async function fn(){
                    while(_t._running){
                        await rx.rx(onSignal,onUpdate,onSignalLost);
                        this._request=undefined;
                    }
                }
                this._running=true;
                super.run(fn);
            }
            async join(){
                this._running=false;
                await this._rx.close();
                return super.join();
            }
            /**
             * 受信を一時的に中断する。
             */
            async suspend(){
                //synchronized
                if(!this._running){
                    return false;
                }
                this._suspend_lock=new PromiseLock();
                await rx.rxBreak();
                if(this._running){
                    this._suspend_lock.release();
                    this._suspend_lock=undefined;
                    return false;
                }
                return true;
            }
            /**
             * サスペンドから復帰する
             */
            async resume(){
                //synchronized
                if(!this._running){
                    return false;
                }
                if(!this._suspend_lock){
                    return false;
                }
                this._suspend_lock.release();
                this._suspend_lock=undefined;
            }
            /**
             * 受信中のパケットを中断する
             */
            async interrupt(){
                //synchronized
                if(!this._running){
                    return false;
                }
                return this._rx.rxBreak();
            }
        }
        //let rxtask=new RxTask();
        //rxtask.run();
    };

    /**
     * 回線を閉じます。
     */
    async close()
    {
        let _t=this;
        let tx=this._tx;
        let rx=this._rx;        
        switch(_t._status){
        case ST.CLOSED:
            return;
        case ST.CLOSING:
            await _t._close_lock.wait();
            return;
        case ST.RECEIVE_SUSPEND_WAIT:
        case ST.RECIVING:
            this._status=ST.CLOSING;
            _t._close_lock=new PromiseLock();
            try{
                await rx.rxBreak();
                TBSK_ASSERT(this._status==ST.CLOSING);
                this._status=ST.CLOSED;
            }finally{
                _t._close_lock.release();
                _t._close_lock=undefined;
            }
            return;
        }
    };
    /**
     * @async
     * データを送信します。
     * 受信中のデータがある場合は先に中断してから送信します。
     * 送信中の場合は失敗します。
     * @param {Int8Array|String} v 
     */
    async send(v,stop_symbol=true)
    {
        let _t=this;
        let tx=this._tx;
        let rx=this._rx;

        switch(this._status){
        case ST.SENDING:
        case ST.RECEIVE_SUSPEND_WAIT:
            return false;
        case ST.CLOSING:
            return false;
        case ST.RECIVING:
            break;
        default:
            throw new TbskException();    
        }

        TBSK_ASSERT(this._status==ST.RECIVING);
        this._status=ST.RECEIVE_SUSPEND_WAIT;
        this._rx_lock=new PromiseLock();//受信を再開するときにリリースされるロック
        try{
            await rx.rxBreak();
            let skip_tx=false;
            switch(this._status){
            case ST.CLOSING://クローズ要求である。
                return false;
            case ST.SEND_BREAK:
                skip_tx=true;//スキップフラグをセット
                break;
            case ST.RECEIVE_SUSPEND_WAIT:
                break;//停止完了。次へ
            default:
                throw new TbskException();
            }
            if(!skip_tx){
                this._status=ST.SENDING;
                await tx.tx(v,stop_symbol);
                switch(this._status){
                case ST.CLOSING:
                    //クローズ要求である。
                    return false;
                case ST.SEND_BREAK:
                case ST.SENDING:
                    break;
                default:
                    throw new TbskException();
                }
            }
        }finally{
            this._rx_lock.release();
            this._rx_lock=undefined;
        }
    };
    /**
     * 送信処理を中断します。
     * @returns 
     */
    async sendBreak()
    {
        let _t=this;
        let tx=this._tx;
        switch(this._status){
        case ST.RECIVING:
            return;//なんもせーへん
        case ST.SENDING:
        case ST.RECEIVE_SUSPEND_WAIT:
            this._status=ST.SEND_BREAK;
            this._txbreak_lock=new PromiseLock();
            await tx.txBreak();
            await this._txbreak_lock.wait();
            return;
        case ST.SEND_BREAK:
            await this._txbreak_lock?.wait();
            return;
        }
    }
    /**
     * 音声入力のRMS値を返します。
     */
    get rms(){return this._rx.rms;};

}