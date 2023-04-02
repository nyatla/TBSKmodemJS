// @ts-check

import { TbskReceiver } from "../tbskclasses/TbskReceiver.js";
import { TraitTone, XPskSinTone } from "../tbskclasses/TbskTone.js";
import { TbskTransmitter } from "../tbskclasses/TbskTransmitter.js";
import { TbskException } from "../utils/classes";
import { PromiseLock, PromiseThread } from "../utils/promiseutils";


class IdEvent extends Event{
    constructor(type,id){
        super(type);
        this._id=id;
    }
    get id(){return this._id;};
}

class TxEvent extends IdEvent{
    constructor(type,id){
        super(type,id);
    }
}
class RxEvent extends IdEvent{
    constructor(type,id){
        super(type,id);
    }
}
class RxMessageEvent extends IdEvent{
    constructor(type,id,m){
        super(type,id);
        this._m=m;
    }
    get data(){return this._m;};
}

class RecvThread extends PromiseThread
{
    ST={
        IDLE:0,
        TX_RUNNING:1,
        RX_RUNNING:2,
        CLOSED:3,
    }
    /**
     * 
     * @param {TbskTransmitter} tx 
     * @param {TbskReceiver} rx 
     */
    constructor(eventtarget,rx,tx){
        super();
        const ST=this.ST;
        this._status=ST.IDLE;
        this._interrupted=false;
        this._rx=rx;
        this._tx=tx;
        this._send_q=[];
        this._send_id=1;
        this._current_tx_id=undefined;
        this._rx_break_running=false;
        this._eventtarget=eventtarget;
        this._recv_id=1;
        this._tx_lock=new PromiseLock();
    }
    /**
     * 送信データを登録する。
     * @param {*} v 
     * @param {*} stop_symbol 
     * @param {undefined|((v:number)=>void)} onsend
     * @param {undefined|((v:number)=>void)} oncomplete
     * 送信の実行、または中断が確定したら呼び出されるコールバック関数です。
     * @returns 
     */
    updatetx(v,stop_symbol,onsend,oncomplete)
    {
        const ST=this.ST;
        if(this._interrupted){
            throw new TbskException();
        }
        //id,payload,stop_symbol,callbackを実行キューへ登録
        this._send_q.push([this._send_id,v,stop_symbol,onsend,oncomplete]);
        this._send_id++;

        //二重呼び出ししないようにbreakを呼ぶ
        if(this._status==ST.RX_RUNNING){
            if(!this._rx_break_running){
                let _t=this;
                _t._rx_break_running=true;
                async function task(){
                    await _t._rx.rxBreak();
                    _t._rx_break_running=false;
                }
                task();
            }
        }
        return this._send_id
    }
    /**
     * 送信状態が終わるまで待つ
     */
    async waitForTxRunningEnd(){
        const ST=this.ST;
        if(this._st==ST.TX_RUNNING || this._send_q.length>0){
            await this._tx_lock.wait();
        }
    }
    async run()
    {
        const ST=this.ST;
        let txlock;
        let rxlock;

        while(!this._interrupted){
            this._status=ST.TX_RUNNING;
            while(!this._interrupted)
            {
                if(this._send_q.length==0){
                    break;
                }
                let d=this._send_q[0];
                //開始予定の通知
                if(d[3]){
                    d[3](d[0]);
                }
                //開始する前に開始予定の値が削除されていないか確認
                if(d[0]!=this._send_q[0][0] || this._interrupted){
                    //nothing to do
                }else{
                    //開始に変更がなければ開始
                    this._send_q.shift();
                    this._current_tx_id=d[0];
                    await this._tx.tx(d[1],d[2]);
                    this._current_tx_id=undefined;
                }
                //完了の通知
                if(d[4]){
                    d[4](d[0]);//complete callback
                }
            }
            this._tx_lock.reset();//TXロックを再起動.
            if(this._interrupted){
                break;
            }
            this._status=ST.RX_RUNNING;
            let eventtarget=this._eventtarget;
            let rid=this._recv_id;
            this._recv_id++;
            await this._rx.rx(
                // ()=>{
                //     eventtarget.dispatchEvent(new IdEvent("detected",rid));
                // },
                ()=>{
                    // let event = new CustomEvent(
                    //     "detected",{detail: {id:rid}}
                    // );
                    let event=new RxEvent("detected",rid);
                    eventtarget.dispatchEvent(event);                    
                },
                (d)=>{
                    let event = new RxMessageEvent("message",rid,d);
                    eventtarget.dispatchEvent(event);
                },
                ()=>{
                    let event = new RxEvent("lost",rid);
                    eventtarget.dispatchEvent(event);
                },
            );
        }
        this._tx_lock.release();//TXロックをリリース.
        console.log("TASK CLOSED!");
        this._st=ST.CLOSED;
    }

    /**
     * idに一致する送信データを削除します。
     * 送信中であれば中断し、未送信であればキューから削除します。
     * @param {number|undefined} id 
     * @returns 
     */
    async breakTx(id){
        if(id===undefined){
            await this._tx.txBreak();
            this._send_q=[];
            return true;
        }
        if(id==this._current_tx_id){
            await this._tx.txBreak();
            return true;
        }else{
            let q=this._send_q;
            for(let i=0;i<q.length;i++){
                if(q[i][0]==id){
                    q.splice(i,i);
                    return true;
                }
            }
        }
        return false;
    }
    
    /**
     * スレッドを停止します.
     * @returns 
     */
    interrupt()
    {
        const ST=this.ST;
        if(this._interrupted){
            return;
        }
        this._interrupted=true;
        switch(this._status){
        case ST.TX_RUNNING:
            this._tx.txBreak();
            break;
        case ST.RX_RUNNING:
            this._rx.rxBreak();
            break;
        default:
            console.error("Invalid status");
            break;
        }
        return;
    }
}



/**
 * 簡易的な半二重通信チャットインタフェイスです。
 * 各種操作の応答はイベントで通知します。
 * 
 * @event close
 *  回線が閉じた時
 * @event error
 *  修復不能なエラーが発生したとき
 * @event sendstart
 *  送信を開始しようとするとき。
 * @property {number} sendstart.id - send関数で受け取った送信id
 * @event sendcompleted
 *  送信が完了したとき.このイベントは、sendstartとセットで呼び出されます。
 * @property {number} sendstart.id - send関数で受け取った送信id
 * @event detected
 *  信号を検出した場合
 * @property {number} detected.id - 受信id
 * @event message
 *  信号を取得した時.このイベントは、detectedからlostまでの間で呼び出されます。
 * @property {number} message.id - 受信id
 * @property {string|[number]} message.data - 受信値
 * @event lost
 * パケットを受信し終わった時.このイベントは、detectedとセットで呼び出されます。
 * @property {number} lost.id - 受信id
 * 
 */
export class EasyChat extends EventTarget
{
    /**
     * @event open  回線が利用になったとき
     */


    static ST={
        CLOSED  :0, //閉じている
        OPENNING:1, //OPENが実行中
        WORKING:3, //受信中
    
    
    };;
    get status(){return this._status;};
    /**
     * @param {any} mod
     * @param {Object} options
     * @param {number}      options.carrier
     * @param {string}      options.decoder
     * @param {TraitTone}   options.tone
     * @param {number}      options.preamble_cycle
     * @param {boolean}     options.stop_symbol
     */
    constructor(mod,options)
    {
        super();
        const ST=EasyChat.ST;
        let default_tone=new XPskSinTone(mod,10,10);
        this._status=ST.CLOSED;
        this._colsing_now=false;
        /**@type {RecvThread|undefined} */
        this._rcvth=undefined;
        try{
            let carrier=(options && "carrier" in options)?options["carrier"]:16000;
            let decoder=(options && "decoder" in options)?options["decoder"]:undefined;
            let tone=(options && "tone" in options)?options["tone"]:default_tone;
            let preamble_cycle=(options && "preamble_cycle" in options)?options["preamble_cycle"]:4;
            let stop_symbol=(options && "stop_symbol" in options)?options["stop_symbol"]:true;
            let tx=new TbskTransmitter(mod,tone,preamble_cycle);
            let rx=new TbskReceiver(mod,tone,preamble_cycle);

            async function open(eventtarget){
                let err=undefined;
                try{
                    await rx.open(carrier);
                    try{
                        await tx.open(rx.audioContext,carrier);
                    }catch(e){
                        err=e;                            
                        await rx.close();
                    }
                }catch(e){
                    err=e;
                }
                if(err){
                    eventtarget._status=ST.CLOSED;
                    let event = new CustomEvent(
                        "error",{
                        detail: { error: "e" }
                        }
                    );
                    eventtarget.dispatchEvent(event);
                    return;
                }
                //ここでclosingを検出しているかもしれないけどとりあえずあける
                // if(this._colsing_now){
                //     await tx.close();
                //     await rx.close();
                //     return;
                // }
                eventtarget._status=ST.WORKING;
                let event = new CustomEvent(
                    "open"
                );

                //recvスレッド
                let rcvth=new RecvThread(eventtarget,rx,tx);
                let handle=rcvth.start();
                eventtarget._rcvth=rcvth;
                eventtarget.dispatchEvent(event);
                await handle;

            }
            this._carrier=carrier;
            this._baud=carrier/tone.length;
            this._stop_symbol=stop_symbol;
            this._rx=rx;
            this._tx=tx;
            this._status=ST.OPENNING;
            open(this);//非同期実行

        }finally{
            default_tone.dispose();
        }
    }
    close()
    {
        let _t=this;
        let ST=EasyChat.ST;
        //クロージングのフラグを建てる
        if(this._colsing_now){
            return;
        }
        this._colsing_now=true;
        async function func(){
            switch(_t._status){
            case ST.WORKING:
                //受信ループを停止する
                _t._rcvth?.interrupt();

                _t._tx.close().then(()=>{
                    return _t._rx.close();
                }).then(()=>{
                    _t._status=ST.CLOSED;
                    let event = new CustomEvent("close",{detail: {}});
                    _t.dispatchEvent(event);                    
                });
                await _t._rcvth?.join();
                break;
            case ST.OPENNING:
                //待機してからクローズする。
                let open_handler=()=>{
                    try{
                        _t._tx.close().then(()=>{
                            if(_t._rcvth){
                                _t._rcvth.interrupt();
                            }
                            return _t._rx.close();
                        }).then(()=>{
                            _t._status=ST.CLOSED;
                            let event = new CustomEvent("close",{detail: {}});
                            _t.dispatchEvent(event);
                        });    
                    }finally{
                        _t.removeEventListener("open",open_handler);
                    }
                }
                let err_handler=()=>{
                    _t._status=ST.CLOSED;
                }
                _t.addEventListener("open",open_handler);
                _t.addEventListener("error",err_handler);
                break;
            default:
                throw new TbskException("Invalid status:"+_t._status);
            }
        }
        func();
    }

    /**
     * データを送信します。
     * データは送信キューに投入され、実行中の受信操作を中断してから送信されます。
     * 既に実行中の送信操作があった場合はすべてキャンセルされます。
     * @param {*} v 
     */
    send(v)
    {
        //close実行中は例外。
        if(this._colsing_now){
            throw new TbskException();
        }
        let ST=EasyChat.ST;
        switch(this._status){
        case ST.WORKING:
            break;
        default:
            //送信、又は受信中以外は例外。
            throw new TbskException("Invalid status:"+this._status);
        }
        let _t=this;
        //送信キューに積む
        return this._rcvth?.updatetx(
            v,
            this._stop_symbol,
            (id)=>{
                let event = new TxEvent("sendstart",id);
                _t.dispatchEvent(event);   
            },
            (id)=>{
                let event = new TxEvent("sendcompleted",id);
                _t.dispatchEvent(event);   
            });
    }
    sendBreak(){

    }
    /**
     * @async
     * 既に実行したcloseが完了するまで待ちます。
     * @returns 
     */
    async waitCloseAS(){
        let ST=EasyChat.ST;
        let _t=this;
        if(this._status==ST.CLOSED){
            return;
        }
        let lock=new PromiseLock();
        let handler=()=>{
            lock.release();
            _t.removeEventListener("close",handler);
        };
        this.addEventListener("close",handler);
        await lock.wait();
    }
    /**
     * 送信状態が終わるのを待ちます.
     * @returns 
     */
    async waitSendAS(){
        //close実行中は例外。
        if(this._colsing_now){
            throw new TbskException();
        }
        let ST=EasyChat.ST;
        if(this._status!=ST.WORKING){
            return;
        }
        await this._rcvth?.waitForTxRunningEnd();
    }
    /**
     * openが完了するのを待ちます。
     */
    async waitOpenAS(){
        let ST=EasyChat.ST;
        let _t=this;
        if(this._status!=ST.OPENNING){
            return;
        }
        let lock=new PromiseLock();
        let handler=()=>{
            lock.release();
            _t.removeEventListener("open",handler);
        };
        this.addEventListener("open",handler);
        await lock.wait();
    }


    get baud(){return this._baud;}
    get carrier(){return this._carrier;}
    get state(){return this._status;}

    
    /**
     * 音声入力のRMS値を返します。
     */
    get rms(){return this._rx.rms;};

}