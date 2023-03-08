//@ts-check

import { AudioInput } from "../audio/AudioInput.js";
import { AudioPlayer } from "../audio/AudioPlayer.js";
import {Disposable} from "../utils/classes.js"
import { TbskModulator } from "./TbskModulator.js";
import { SinTone, XPskSinTone,TraitTone} from "./TbskTone.js";
export class TbskModem extends Disposable
{
    TX_STATE={IDLE:1,PLAYING:2};

    /**
     * @param {*} mod 
     * @param {*} carrier 
     * @param {TraitTone|XPskSinTone|SinTone|undefined} tone
     * @param {number|undefined} preamble_ticks 
     */
    constructor(mod,carrier=16000,tone=undefined,preamble_ticks=undefined)
    {
        super();
        this._attached_tone=tone?undefined:new XPskSinTone(mod,10,10);
        tone=tone?tone:this._attached_tone;
        this._mod=new TbskModulator(mod,tone,preamble_ticks);
        this._current_player=undefined;

        this._audio_input=new AudioInput(carrier);
        /** @type {?} */
        this._open_promise=this._audio_input.open()
        /** @type {?} */
        this._open_result=undefined;

        this._tx_status=this.TX_STATE.IDLE;
    }
    /**
     * Audioデバイスの準備ができるまで待ちます。
     * @returns {Promise}
     * resolve(boolean) trueで成功,falseで失敗
     */
    waitForOpen(){
        let _t=this;
        //既にopenなら結果を中継
        if(!_t._open_promise){
            return Promise.resolve(_t._open_result);
        }
        return this._open_promise.then(
            ()=>{_t._open_promise=undefined;_t._open_result=true;},
            ()=>{_t._open_promise=undefined;_t._open_result=false;}
        );
    }
    dispose()
    {
        this._audio_input.close();
        if(this._attached_tone){
            this._attached_tone.dispose();
            this._attached_tone=undefined;
        }
    }
    /**
     * srcをオーディオインタフェイスへ送信します。
     * @param {array[number]|string} src 
     * @returns {false|Promise}
     *  成功すると生成終了時に発火するpromiseを返します。失敗するとfalseです。
     */
    tx(src)
    {
        let ainput=this._audio_input;
        let actx=ainput.audioContext;
        console.log(ainput);
        let mod=this._mod;
        let f32_array = mod.modulate(src);
        let buf = actx.createBuffer(1, f32_array.length, ainput.sampleRate);
        buf.getChannelData(0).set(f32_array);

        if(this._current_player){
            if(this._current_player.isFinised){
                this._tx_status=this.TX_STATE.IDLE;
                this._current_player=undefined;
            }else{
                return false;
            }
        }
        this._tx_status=this.TX_STATE.PLAYING;
        let player=new AudioPlayer(actx,buf);
        this._current_player=player;
        return player.play().then(()=>{
            console.log("play end");
            this._tx_status=this.TX_STATE.IDLE;
        });
    }
    txBreak(){
        if(!this._current_player){
            return;
        }
        if(this._tx_status==this.TX_STATE.PLAYING){
            this._current_player.stop();//これやったときイベント発火はどうなるの？
        }
    }
    get txReady(){
        return !this._current_player || this._tx_status==this.TX_STATE.IDLE;
    }
    // rx(){}
    // rxStart(){}
    // rxStop(){}
}