//@ts-check

import { AudioPlayer } from "../audio/AudioPlayer.js";
import {TBSK_ASSERT} from "../utils/functions"

import { TbskModulator } from "./TbskModulator.js";
import { TraitTone} from "./TbskTone.js";


import {PromiseTask,PromiseLock,Disposable, TbskException} from "../utils/classes.js"




const ST={
    CLOSED: 1,
    CLOSING: 2,
    IDLE: 3,
    SENDING: 4,
    BREAKING:5,
}
/**
 * TBSK変調信号送信クラスです。
 */
export class TbskTransmitter extends Disposable
{
    static ST=ST;
    
    /**
     * インスタンスの状態を返します。
     */
    get status(){return this._status;};
    
    /**
     * @param {*} mod 
     * @param {AudioContext} actx 
     * @param {TraitTone} tone
     * @param {Number|undefined} preamble_cycle 
     */
    constructor(mod,actx,tone,preamble_cycle=undefined)
    {
        super();
        this._sample_rate=undefined;
        this._actx=actx;
        this._status=ST.CLOSED;
        this._current_tx=undefined;
        this._closing_lock=undefined;
     
        this._mod=new TbskModulator(mod,tone,preamble_cycle);
    }
    /**
     * 送信ポートを開きます。
     * @param {number} carrier
     * @returns {Promise}
     * ステータス異常の場合はrejectします。
     * 
     */
    async open(carrier=16000)
    {
        let _t=this;
        if(_t._status!=ST.CLOSED){
            throw new TbskException();
        }
        this._sample_rate=carrier;
        _t._status=ST.IDLE;
        return;
    }
    /**
     * 送信機を閉じます。
     * @returns 
     */
    async close()
    {
        let _t=this;
        switch(_t._status){
        case ST.CLOSED:
            return;
        case ST.IDLE:
            _t._status=ST.CLOSING;
            //nothing to do
            _t._status=ST.CLOSED;
            return;
        case ST.BREAKING:
        case ST.SENDING:
            _t._status=ST.CLOSING;
            _t._closing_lock=new PromiseLock();
            await _t._current_tx?.join();//BREAK待ち
            TBSK_ASSERT(_t._status==ST.CLOSING);//変更しないこと
            _t._status=ST.CLOSED;
            //@ts-ignore
            _t._closing_lock.release();
            _t._closing_lock=undefined;
            return;
        case ST.CLOSING:
            await _t._closing_lock.wait();
            return;
        default:
            break;
        }
        throw new TbskException("Invalid status:"+_t._status);
    }
    get audioContext(){
        return this._actx;
    }
    dispose()
    {
        if(this._status==ST.CLOSED){
            return;
        }
        this.close().then(()=>{
            this._mod.dispose();}
        );
    }

    /**
     * tx関数が実行可能な状態かを返します。
     * @returns {boolean}
     */    
    get txReady()
    {
        switch(this._status){
            case ST.CLOSED:
            case ST.CLOSING:
            case ST.BREAKING:
                return false;
            case ST.IDLE:
                return true;
            case ST.SENDING:
                return false;
            default:
                break;
        }
        throw new TbskException();
    }


    /**
     * @async
     * srcをオーディオインタフェイスへ送信します。
     * {txReady}がtrueである必要があります。
     * @param {array[number]|string} src 
     * @returns {Promise}
     * 送信が完了、またはtxBreakで中断した場合にresolveします。
     * 送信処理を開始できない場合rejectします。
     */
    async tx(src,stopsymbol=true)
    {
        let _t=this;
        if(!_t.txReady){
            throw new TbskException();
        }
        //always IDLE
        class PlayerTask extends PromiseTask{
            constructor(actx,buf){
                super();
                this._player=new AudioPlayer(actx,buf);
            }
            async run(){
                return super.run(
                    this._player.play().then(
                        ()=>{
                            return new Promise((resolve)=>{
                                setTimeout(resolve,30);
                            })
                        }
                    )
                );
            }
            async join(){
                if(this._player.isPlaying){
                    this._player.stop();
                }
                return super.join();
            }
        }
        //@ts-ignore
        let actx=_t._actx;
        let mod=_t._mod;
        let f32_array = mod.modulate(src,stopsymbol);
        let buf = actx.createBuffer(1, f32_array.length,_t._sample_rate);
        buf.getChannelData(0).set(f32_array);

        let task=new PlayerTask(actx,buf);
        _t._status=ST.SENDING;
        _t._current_tx=task;
        await task.run();
        _t._current_tx=undefined;
        switch(_t.status){
        case ST.SENDING://変化なし
        case ST.BREAKING:
            _t._status=ST.IDLE;//joinより前に実行される
            return;
        case ST.CLOSING:
            return;
        }
        throw new TbskException("Invalid status:"+this._status);
    }
    /**
     * @async
     * 進行中のtxを中断します。
     * txが完了してから返ります。
     * @returns {Promise<void>}
     * 待機状態が完了するとresolveします。
     */
    async txBreak()
    {
        let _t=this;
        switch(_t._status){
            case ST.IDLE:
                //nothing to do
                return;
            case ST.SENDING:
                _t._status=ST.BREAKING;
                await _t._current_tx?.join();
                return;
            case ST.BREAKING:
                await _t._current_tx?.join();
                return;    
            case ST.CLOSED:
            case ST.CLOSING:
            default:
                throw new TbskException();
        }
    }    
}