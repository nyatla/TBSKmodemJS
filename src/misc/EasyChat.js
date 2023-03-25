// @ts-check

import { TbskModem } from "../tbskclasses/TbskModem.js";
import { PromiseTask, TbskException } from "../utils/classes";
import { TBSK_ASSERT } from "../utils/functions.js";


const ST={
    CLOSED  :0, //閉じている
    OPENNING:1, //OPENが実行中
    CLOSING :2, //CLOSEを実行中
    IDLE    :3, //何も実行していない
    SENDING :4,                 //TX実行中
    SEND_SUSPEND_RECV:5,    //TX実行中。
    SENDING_RX_STOP:7,  //送信ためにRXの停止要求中
    RECV:6,
};
/**
 * 簡易的な半二重通信チャットインタフェイスです。
 */
export class EasyChat extends EventTarget
{
    static ST=ST;
    /**
     * @param {any} mod
     * @param {TbskModem|undefined} modem
     * ラップするモデムインスタンス.省略時はデフォルトモデムを生成。
     * @param {Number} carrier
     * キャリア周波数 
     */
    constructor(mod,modem=undefined,carrier=16000)
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
        _t._carrier=carrier;
        _t._modem=modem?modem:new TbskModem(mod);
        _t._send_current=undefined;
        _t._rx_resume_resolver=undefined;
    }

    /**
     * 回線を開きます。
     * @returns {boolean}
     * Trueの場合、openがコールされます。
     * @throws
     * ステータス以上の場合
     */
    open()
    {
        let _t=this;
        if(this._status!=ST.CLOSED){
            return false;
        }
        _t._status=ST.OPENNING;
        this._modem.open(this._carrier).then(
            ()=>{
                _t._status=ST.IDLE;
                _t._callOnOpen();
                //受信系のセットアップ
                function ploop(){
                    _t._modem.rx(
                        ()=>{
                            _t._callOnSignal();
                        },
                        (d)=>{
                            _t._callOnUpdate(d);
                        },
                        ()=>{
                            _t._callOnSignalLost();
                        },
                    ).then(()=>{
                        switch(_t._status){
                        case ST.SENDING_RX_STOP:
                            new Promise((resolver)=>{_t._rx_resume_resolver=resolver;}).then(()=>{ploop()});
                        }
                    });
                }
                ploop();//受信ループ
            }
        );
        return true;
    };

    /**
     * 回線を閉じます。
     */
    close()
    {
        let _t=this;
        switch(_t._status){
        case ST.IDLE:
            _t._status=ST.CLOSING;
            //Go Promise
            this._modem.close().then(
                ()=>{
                    _t._status=ST.IDLE;
                    _t._callOnClose();
                }
            );
            return true;
        case ST.OPENNING:
            //OPENNINGなら、openが終わった後にcloseする。
            _t._status=ST.CLOSING;
            this.addEventListener("open",()=>{
                Promise.resolve().then(()=>{_t.close();});
            });
            return;
        case ST.CLOSING:
        case ST.CLOSED:
            return false;
        default:
            throw new TbskException("Invalid status:"+_t._status);    
        }
    };
    /**
     * 音声入力のRMS値を返します。
     */
    get rms(){return this._modem.rms;};
    /**
     * @async
     * データを送信します。
     * 既に送信中のデータがある場合は、中断してから送信します。
     * @param {Int8Array|String} v 
     */
    send(v,stop_symbol=true)
    {
        let _t=this;
        let modem=this._modem;
        switch(this._status){
        case ST.CLOSING:
        case ST.CLOSED:
        case ST.OPENNING:
            return false;
        case ST.IDLE:
            //Go Promise
            function chain(v,stop_symbol){
                modem.tx(v,stop_symbol).then(
                    ()=>{
                        let c=_t._send_current;
                        _t._send_current=undefined;
                        if(c){
                            chain(c[0],c[1]);
                        }else{
                            _t._status=ST.RX_RESUME;
                            //rxのレジーム
                            TBSK_ASSERT(_t._rx_resume_resolver);
                            _t._rx_resume_resolver();//RXの再開
                        }
                    }
                );
            }
            _t._status=ST.SENDING_RX_STOP;
            //rxを停止
            modem.rxBreak().then(
                ()=>{
                    _t._status=ST.SENDING;
                    chain(v,stop_symbol);
                }
            )
            return true;
        case ST.SENDING_RX_STOP:
            return true;
        case ST.SENDING:
            _t._send_current=[v,stop_symbol];//待機を上書き
            modem.txBreak();//多重呼び出し時しでも現在のtxに対してbreakするはず。
            return true;
        default:
            throw new TbskException("Invalid status:"+_t._status);
        }
    };
    /**
     * 送信処理を中断します。
     * @returns 
     */
    sendBreak()
    {
        let modem=this._modem;
        switch(this._status){
        case ST.CLOSING:
        case ST.CLOSED:
        case ST.OPENNING:
            return false;
        case ST.IDLE:
            return true;            
        case ST.SENDING:
            this._send_current=undefined;//送信予約を削除
            modem.txBreak();
            return;
        }
    }
}