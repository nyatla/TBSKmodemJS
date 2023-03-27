//@ts-check

import { AudioInput } from "../audio/AudioInput.js";
import { AudioPlayer } from "../audio/AudioPlayer.js";
import {TBSK_ASSERT} from "../utils/functions"

import { TbskModulator } from "./TbskModulator.js";
import { XPskSinTone,TraitTone} from "./TbskTone.js";

import {TbskDemodulator} from "./TbskDemodulator"
import {RecoverableStopIteration} from "./RecoverableStopIteration"
import {StopIteration} from "./StopIteration"
import {Utf8Decoder,PassDecoder} from "../utils/decoder.js"
import {DoubleInputIterator,Disposable, TbskException} from "../utils/classes.js"
import {PromiseTask} from "../utils/promiseutils"




/**
 * パケット受信１回分のワークフローです。
 */
class Workflow
{
    /**
     * 
     * @param {*} demod 
     * @param {*} input_buf 
     * @param {*} decoder 
     * @param {onStart,onData(d),onEnd} handler 
     */
     
    constructor(demod,input_buf,decoder,handler){
        let _t=this;
        _t._input_buf=input_buf;
        _t._kill_request=false;
        _t._gen=undefined;
        //このワークフローのPromise
        _t.th_promise=new Promise((resolve)=>{
            /**@type {Generator|undefined} */
            _t._gen=this.proc(demod,input_buf,decoder,handler,resolve);
        }).then(()=>{
            _t._gen=undefined;
        });
    }
    /**
     * 処理を進めます。
     * @param {*} src 
     * @returns 
     */
    next(src){
        this._input_buf.puts(src);
        //@ts-ignore
        return this._gen.next();
    }
    /**
     * 二重呼び出しをしないでね。
     */
    kill(){
        TBSK_ASSERT(this._kill_request==false);
        this._kill_request=true;
        this.next([0]);//ダミーさん
    }
    /**
     * @async
     * ワークフローが完了するまで待ちます。
     * @returns 
     */
    async waitForEnd()
    {
        if(!this._gen){
            return true;
        }
        await this.th_promise;
        return true;
    }

    *proc(demod, input_buf,decoder,handler,resolver)
    {
        let _t=this;

        decoder.reset();
        //console.log("workflow called!");
        let out_buf = null;
        let dresult = null;
        dresult = demod._demodulateAsInt_B(input_buf);
        if (dresult == null) {
            //未検出でinputが終端
            console.error("input err");
            resolver();//ジェネレータが完了した通知
            return;//done
        }
        try
        {
            try {
                switch (dresult.getType()) {
                    case 1://1 iter
                        //                            console.log("signal detected");
                        out_buf = dresult.getOutput();
                        break;
                    case 2:// recover
                        for (; ;) {
                            if(_t._kill_request){
                                return;//done
                            }
                            //                                console.log("recover");
                            out_buf = dresult.getRecover();
                            if (out_buf != null) {
                                break;
                            }
                            //リカバリ再要求があったので何もしない。
                            yield;
                        }
                        break
                    default:
                        //継続不能なエラー
                        console.error("unknown type.");
                        throw new Error();
                }
            } finally {
                console.log("debug",dresult);
                dresult.dispose();
                dresult = null;
            }
            //outにイテレータが入っている。
            console.log("Signal detected!");
            handler.onStart();
            //終端に達する迄取り出し
            let ra = [];
            for (; ;) {
                try {
                    //stopリゾルバが設定されておるぞ。
                    if(_t._kill_request){
                        console.log("Kill accepted!");
                        throw new StopIteration();//強制的に確定
                    }
                    let w = out_buf.next();
                    ra.push(w);
                    continue;
                } catch (e) {
                    if(!(e instanceof StopIteration)){
                        //stopIteration以外はおかしい。
                        console.error(e);
                        throw e;
                    }else{
                        if (ra.length > 0) {
                            //ここでdataイベント
                            console.log("data:");
                            if (decoder) {
                                let rd = decoder.put(ra);
                                if (rd) {
                                    handler.onData(rd);//callOnData(rd);
                                }
                            } else {
                                handler.onData(ra);//callOnData(ra);
                            }
                            ra = [];
                        }
                        if (e instanceof RecoverableStopIteration) {
                            yield;
                            continue;
                        }
                        console.log("Signal lost!");
                        handler.onEnd();//callOnEnd();
                    }
                    //ここではStopイテレーションの区別がつかないから、次のシグナル検出で判断する。
                }
                out_buf.dispose();
                out_buf = null;
                return;//done
            }
        } finally {
            if (out_buf) { out_buf.dispose(); }
            if (dresult) { dresult.dispose(); }
            resolver();//ジェネレータが完了した通知
        }
        //関数終了。
        console.log("end of workflow");
    }
}


class TbskListener2 extends Disposable
{
    /**
     * 非同期にコールされるpushは、信号を検出するとonPacketでパケットハンドラを呼び出します。
     * onPacketハンドラは新しいIPacketHandlerを継承したパケット処理クラスを呼び出してください。
     * 
     */
    constructor(mod,tone, preamble_th=1.0,preamble_cycle=4,decoder = undefined) {
        super();
        this._decoder = decoder;
        this._demod = new TbskDemodulator(mod,tone, preamble_th, preamble_cycle);
        this._input_buf = new DoubleInputIterator(mod,true);
        this._currentGenerator=undefined;
    }
    dispose()
    {
        if (this._currentGenerator) {
            try {
                this._currentGenerator._gen.throw(new Error('Brake workflow!'));
            } catch (e) {
            }
        }
        this._demod.dispose();
        this._input_buf.dispose();
    }
    /**
     * @async
     * 信号の検出を開始します。
     * onStart,onData,onEndの順でコールバック関数を呼び出します。
     * onStartが呼び出された後は、必ずonEndが呼び出されます。
     * @returns {Promise<boolean>}
     * 常にtrueです。
     */
    async start(onStart,onData,onEnd){
        TBSK_ASSERT(!this._currentGenerator);
        let _t=this;

        let decoder = this._decoder == "utf8" ? new Utf8Decoder() : new PassDecoder();

        this._currentGenerator =new Workflow(this._demod, this._input_buf, decoder,{onStart:onStart,onData:onData,onEnd:onEnd});//新規生成
        await this._currentGenerator.waitForEnd();//1st
        _t._currentGenerator=undefined;
        return true;
    }
    /**
     * 信号の検出を停止します。stopは１度だけしか呼べません。
     * @returns {Promise}
     * 状態がIDLEに戻るまで待機するPromiseです。
     * startのPromiseが解除された後に解除されます。(startの後に待機するからそのはずなんだがな！)
     */
    async stop()
    {
        let _t=this;
        TBSK_ASSERT(this._currentGenerator);
        //@ts-ignore
        _t._currentGenerator.kill();
        //@ts-ignore
        await _t._currentGenerator.waitForEnd();//2nd
        TBSK_ASSERT(this._currentGenerator===undefined);
//        _t._currentGenerator=undefined;
        return true;
    }    
    
    push(src)
    {
        if (this._currentGenerator == null) {
            return;
        }
        if (this._currentGenerator.next(src).done) {
            this._currentGenerator = null;
        }
    }
}




/**
 * TBSK変調信号の送受信機能を統合したモデムクラスです。
 */
export class TbskModem extends Disposable
{
    static ST={
        CLOSED:0,   //利用不能な状態
        OPENING:1,  //OPENを実行した
        CLOSING:2,
        IDLE:3,
        TX_RUNNING: 4,
        TX_BREAKING:5,
        RX_RUNNING: 6,
        RX_BREAKING:7
    };
    /**
     * インスタンスの状態を返します。
     */
    get status(){return this._status;};


    
    /**
     * @param {*} mod 
     * @param {TraitTone|undefined} tone
     * @param {Number|undefined} preamble_cycle 
     */
    constructor(mod,tone=undefined,preamble_cycle=undefined,decoder=undefined)
    {
        super();
        this._status=TbskModem.ST.CLOSED;
        this._rx_task=undefined;
        this._current_tx=undefined;
        this._tx_break_promise=undefined;
        /** @type {AudioInput} */
        //@ts-ignore
        this._audio_input=undefined;
        let attached_tone;
        let tone2;
        if(!tone){
            attached_tone=new XPskSinTone(mod,10,10);
            tone2=attached_tone;
        }else{
            tone2=tone;
        }
        this._mod=new TbskModulator(mod,tone2,preamble_cycle);
        this._listener=new TbskListener2(
            mod,tone2,1.0,preamble_cycle,
            decoder);
        if(attached_tone){
            attached_tone.dispose();//内部コピーがあるからもういらない。
        }


    }
    /**
     * Audioデバイスの準備ができるまで待ちます。
     * @param {number} carrier
     * @returns {Promise}
     * ステータス異常の場合はrejectします。
     * 
     */
    async open(carrier=16000)
    {
        let _t=this;
        if(_t._status!=TbskModem.ST.CLOSED){
            throw new TbskException();
        }
        let audio_input=new AudioInput(16000);
        /** @type {?} */
        let open_promise=audio_input.open()
        /** @type {?} */
        _t._status=TbskModem.ST.OPENING;
        await open_promise;
        _t._audio_input=audio_input;
        audio_input.start((s)=>{
            _t._listener.push(s);
        });
        _t._status=TbskModem.ST.IDLE;
        return;
    }
    async close()
    {
        let _t=this;
        if(_t._status!=TbskModem.ST.IDLE){
            throw new TbskException();
        }
        _t._status=TbskModem.ST.CLOSING;
        this._audio_input.close();
        _t._status=TbskModem.ST.CLOSED;
        return;
    }
    dispose()
    {
        if(this._status!=TbskModem.ST.CLOSED){
            this.close();
        }
        this._mod.dispose();
        this._listener.dispose();
    }
    /**
     * @async
     * srcをオーディオインタフェイスへ送信します。
     * {TbskModem#txReady}がtrueである必要があります。
     * @param {array[number]|string} src 
     * @returns {Promise}
     * 送信が完了、またはtxBreakで中断した場合にresolveします。
     * 送信処理を開始できない場合rejectします。
     */
    async tx(src,stopsymbol=true)
    {
        if(!this.txReady){
            throw new TbskException();
        }
        //@ts-ignore
        let ainput=this._audio_input;
        let actx=ainput.audioContext;
        let mod=this._mod;
        let f32_array = mod.modulate(src,stopsymbol);
        let buf = actx.createBuffer(1, f32_array.length, ainput.sampleRate);
        buf.getChannelData(0).set(f32_array);

        let _t=this;

        class PlayerTask extends PromiseTask{
            constructor(actx,buf){
                super();
                this._player=new AudioPlayer(actx,buf);
            }
            async run(){
                return super.run(
                    this._player.play().then(
                        ()=>{return new Promise((resolve)=>{setTimeout(resolve,30)})}
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
        let task=new PlayerTask(actx,buf);
        this._status=TbskModem.ST.TX_RUNNING;
        this._current_tx=task;
        await task.run();
        _t._audio_input.clear();
        _t._status=TbskModem.ST.IDLE;
        return;
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
        console.log("IN",_t._status);
        switch(_t._status)
        {
        case TbskModem.ST.IDLE:
            return;
        case TbskModem.ST.TX_RUNNING:
            _t._status=TbskModem.ST.TX_BREAKING;
            console.log("IN1",_t._status);
            await this._current_tx?.join();
            console.log("IN2",_t._status);
            return;
        case TbskModem.ST.TX_BREAKING:
            await this._current_tx?.join();
            return;
        default:
            throw new TbskException();
        }
    }
    /**
     * tx関数が実行可能な状態かを返します。
     * @returns {boolean}
     */    
    get txReady(){
        return this._status==TbskModem.ST.IDLE;
    }
    /**
     * @async
     * パケットを1つ受信します。
     * @returns {Promise}
     * パケット受信を完了するとresolveします。
     */
    async rx(onSignal,onData,onSignalLost)
    {
        if(!this.rxReady){
            throw new TbskException();
        }
        let _t=this;
        _t._status=TbskModem.ST.RX_RUNNING;
  
        let task=new PromiseTask();
        this._rx_task=task;
        await task.run(
            _t._listener.start(
                ()=>{
                    onSignal();
                },
                (d)=>{
                    onData(d);
                },
                ()=>{
                    onSignalLost();
                },
            )
        );
        _t._status=TbskModem.ST.IDLE;
        return true;
    }
    /**
     * @async
     * rxを停止して待機状態になるまで待ちます。
     * @returns {Promise<void>}
     * 待機状態が完了するとresolveします。
     */
    async rxBreak()
    {
        switch(this._status){
        case TbskModem.ST.IDLE:
            return;
        case TbskModem.ST.RX_RUNNING:
            this._status=TbskModem.ST.RX_BREAKING;
            //@ts-ignore
            await this._listener.stop();
            //@ts-ignore
            await this._rx_task.join();
            console.log("RXB",this._status);
            return;
        case TbskModem.ST.RX_BREAKING:
            //@ts-ignore
            await this._rx_task.join();
            return;
        default:
            throw new TbskException();
        }
    }
    /**
     * rx関数が実行可能な状態かを返します。
     * @returns {boolean}
     */
    get rxReady(){
        return this._status==TbskModem.ST.IDLE;
    }
    /**
     * オーディオ入力のRMS値を返します。
     */
    get rms(){
        return this._audio_input.rms;
    }
}