// @ts-check

import { TbskModem } from "../tbskclasses/TbskModem.js";
import { TbskException } from "../utils/classes";

/**
 * 簡易的な半二重通信チャットインタフェイスです。
 */
export class EasyChat
{
    /**
     * @param {any} mod
     * @param {TbskModem|undefined} modem
     * ラップするモデムインスタンス.省略時はデフォルトモデムを生成。
     * @param {Number} carrier
     * キャリア周波数 
     */
    constructor(mod,modem=undefined,carrier=16000)
    {
        this._carrier=carrier;
        this._modem=modem?modem:new TbskModem(mod);
        this._recv_suspend=false;
        this._suspend_resolver=undefined;
        this._recv_count=undefined;

        
    }
    /**
     * @async
     * 回線を開きます。
     * @throws
     * ステータス以上の場合
     */
    async open()
    {
        await this._modem.open(this._carrier);                    
    };

    /**
     * 回線を閉じます。
     */
    async close()
    {
        await this.sendBreak();
        await this.recvBreak();
        await this._modem.close();
    };
    /**
     * 音声入力のRMS値を返します。
     */
    get rms(){return this._modem.rms;};
    /**
     * @async
     * データを送信します。rxを実行中の場合は、現在の受信を一時中断してから送信します。
     * 受信中のパケットがある場合は受信を中断します。
     * @param {Int8Array|String} v 
     */
    async send(v,stop_symbol=true)
    {
        let modem=this._modem;
        
        switch(modem.status){
            case TbskModem.ST.TX_RUNNING:
            case TbskModem.ST.TX_BREAKING:
                await modem.txBreak();
                console.log("tx.done",modem.status);
                break;
            case TbskModem.ST.RX_RUNNING:
                //rx実行中ならサスペンドフラグをセットしてrxの停止を待つ
                this._recv_suspend=true;                            
                await modem.rxBreak();
                console.log("rx.done",modem.status);
                break;
            case TbskModem.ST.RX_BREAKING:
                await modem.rxBreak();
                console.log("rx2.done",modem.status);
                break;
            case TbskModem.ST.IDLE:
                break;
            default:
                throw new TbskException("Invalid modem status:"+modem.status);
        }
        console.log(modem.status);
        await modem.tx(v,stop_symbol);
        //サスペンドリゾルバがセットされてたら解除する。
        if(this._suspend_resolver){
            this._suspend_resolver();
            this._suspend_resolver=undefined;
        }
        return true;
    };
    /**
     * 送信処理を中断します。
     * @returns 
     */
    async sendBreak()
    {
        let modem=this._modem;
        switch(modem.status){
            case TbskModem.ST.TX_RUNNING:
            case TbskModem.ST.TX_BREAKING:
                await modem.txBreak();
//                            console.log("#/c");
                return true;
            default:
                return false;
        }
    }
    /**
     * パケットを受信します。パケットの解析ステージ毎にコールバックイベントが呼び出されます。
     * 関数はrecvBreakを呼び出すか、count個のパケットを受信するまで継続します。
     * @async
     * @param {number|undefined} count
     * 連続して受信するパケットの数です。
     * @param {{onStart:()=>void,onSignal:()=>void,onUpdate:(d:String|Number)=>void|false,onSignalLost:()=>void,onEnd:()=>void}} events
     * イベントハンドラのセットです。
     * onStartとonEndイベントはセットです。onStartが呼び出されると、onEndは必ず呼び出されます。
     * onStartは受信処理の開始を通知します。onEndは処理の終わりを通知します。
     * onSignal,OnUpdate,onSignalLostイベントはセットです。onSignalが呼び出されると、onUpdateが0回以上呼び出された後にonSignalLostイベントが呼び出されます。
     * 
     * @returns 
     */
    async recv(events,count=undefined)
    {
        let _t=this;
        let modem=this._modem;
        //状態の初期化
        if(!modem.rxReady){
            switch(modem.status){
                case TbskModem.ST.RX_RUNNING:
                case TbskModem.ST.RX_BREAKING:
                    await modem.rxBreak();
                    break;
                case TbskModem.ST.TX_RUNNING:
                case TbskModem.ST.TX_BREAKING:
                    await modem.txBreak();
                    break;
                case TbskModem.ST.IDLE:
                    break;
                default:
                    return false;
            }    
        }
        let onStart="onStart" in events?events.onStart:()=>{};
        let onSignal="onSignal" in events?events.onSignal:()=>{};
        let onUpdate="onUpdate" in events?events.onUpdate:()=>{};
        let onSignalLost="onSignalLost" in events?events.onSignalLost:()=>{};
        let onEnd="onEnd" in events?events.onEnd:()=>{};
        this._recv_count=count;
        await Promise.resolve().then(onStart);
            try{
                while(true){
                    await this._modem.rx(
                        ()=>{
                            onSignal();
                        },
                        (d)=>{
                            onUpdate(d)
                        },
                        ()=>{
                            onSignalLost();
                        },
                    );
                    //サスペンド要求が来ているならサスペンド解除のリゾルバをセット
                    if(this._recv_suspend){
                        this._recv_suspend=false;
                        await new Promise((resolve)=>{_t._suspend_resolver=resolve;});
                        //ここで想定される状態は,TbskModem.ST.IDLE
                        console.log("suspend_reboot",modem.status,this._recv_count);
                    }
                    if(this._recv_count===undefined){
                        continue;
                    }else if(this._recv_count>1){
                        this._recv_count--;
                        console.log(this._recv_count);
                        continue;
                    }
                    break;
                }

            }finally{
                await Promise.resolve().then(onEnd);
            }   
        return;
    };
    /**
     * 受信処理を中断します。
     * @returns 
     */
    async recvBreak()
    {
        let modem=this._modem;
        if(this._recv_suspend){
            this._recv_suspend=false;//サスペンド要求があれば無効にする
        }else if(this._suspend_resolver){
//                        console.log("#b1");
            this._suspend_resolver();//リゾルバがあれば解除しておく。
//                        console.log("#b2");
            this._suspend_resolver=undefined;
        }
        this._recv_count=0;
        switch(modem.status){
            case TbskModem.ST.RX_RUNNING:
            case TbskModem.ST.RX_BREAKING:
//                            console.log("#a");
                await modem.rxBreak();
//                            console.log("#/a");
                return true;
            default:
                return false;
        }
    }                
}