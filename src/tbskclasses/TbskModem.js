//@ts-check

import { AudioInput } from "../audio/AudioInput.js";
import { AudioPlayer } from "../audio/AudioPlayer.js";
import {TBSK_ASSERT} from "../utils/functions"

import { TbskModulator } from "./TbskModulator.js";
import { SinTone, XPskSinTone,TraitTone} from "./TbskTone.js";

import {TbskDemodulator} from "./TbskDemodulator"
import {RecoverableStopIteration} from "./RecoverableStopIteration"
import {StopIteration} from "./StopIteration"
import {Utf8Decoder,PassDecoder} from "../utils/decoder.js"
import {DoubleInputIterator,Disposable, TbskException} from "../utils/classes.js"




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
     * ワークフローが完了するまで待つpromiseを返します。
     * @returns 
     */
    waitForEnd()
    {
        if(!this._gen){
            return Promise.resolve();
        }
        return this.th_promise;
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
                    for (; ;) {
                        //stopリゾルバが設定されておるぞ。
                        if(_t._kill_request){
                            console.log("Kill accepted!");
                            throw new StopIteration();//強制的に確定
                        }
                        let w = out_buf.next();
                        ra.push(w);
                    }
                } catch (e) {
                    if (e instanceof RecoverableStopIteration) {
                        //                            console.log("RecoverableStopIteration");
                        if (ra.length > 0) {
                            //ここでdataイベント
                            console.log("data:");
                            //                                console.log(ra);
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
                        yield;
                        continue;
                    } else if (e instanceof StopIteration) {
                        if (ra.length > 0) {
                            //console.log("StopIteration");
                            console.log("data:");
                            //console.log(ra);
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
                        console.log("Signal lost!");
                        handler.onEnd();//callOnEnd();
                    }else{
                        console.log(e);
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
                this._currentGenerator.throw(new Error('Brake workflow!'));
            } catch (e) {
            }
        }
        this._demod.dispose();
        this._input_buf.dispose();
    }
    /**
     * 信号の検出を開始します。
     * onStart,onData,onEndの順でコールバック関数を呼び出します。
     * onStartが呼び出された後は、必ずonEndが呼び出されます。
     * @returns {Promise}
     * 受信シーケンスが中断/完了したときに呼び出されます。
     */
    start(onStart,onData,onEnd){
        TBSK_ASSERT(!this._currentGenerator);
        let _t=this;

        let decoder = this._decoder == "utf8" ? new Utf8Decoder() : new PassDecoder();

        this._currentGenerator =new Workflow(this._demod, this._input_buf, decoder,{onStart:onStart,onData:onData,onEnd:onEnd});//新規生成
        return this._currentGenerator.waitForEnd().then(()=>{ 
            _t._currentGenerator=undefined;
        });
    }
    /**
     * 信号の検出を停止します。stopは１度だけしか呼べません。
     * @returns {Promise}
     * 状態がIDLEに戻るまで待機するPromiseです。
     */
    stop()
    {
        let _t=this;
        TBSK_ASSERT(this._currentGenerator);
        //@ts-ignore
        _t._currentGenerator.kill();
        //@ts-ignore
        let r=_t._currentGenerator.waitForEnd();
        _t._currentGenerator=undefined;
        return r;
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
        OPENING:0,
        IDLE:1,
        TX_RUNNING: 2,
        TX_BREAKING:3,
        RX_RUNNING: 4,
        RX_BREAKING:5
    };
    /**
     * インスタンスの状態を返します。
     */
    get status(){return this._status;};


    
    /**
     * @param {*} mod 
     * @param {AudioInput|number|undefined} audio_input|carrier
     * @param {TraitTone|XPskSinTone|SinTone|undefined} tone
     * @param {number|undefined} preamble_cycle 
     */
    constructor(mod,audio_input=undefined,tone=undefined,preamble_cycle=undefined,decoder=undefined)
    {
        super();
        this._current_rx=undefined;
        this._attached_tone=tone?undefined:new XPskSinTone(mod,10,10);
        tone=tone?tone:this._attached_tone;
        this._mod=new TbskModulator(mod,tone,preamble_cycle);
        this._listener=new TbskListener2(
            mod,tone,1.0,preamble_cycle,
            decoder);
        this._current_tx=undefined;

        this._audio_input=((a)=>{
            if(a==undefined){
                return new AudioInput(16000);
            }else if (a instanceof AudioInput){
                return a;
            }else if(a instanceof Number){
                return new AudioInput(a);
            }else{
                throw new TbskException();
            }
        })(audio_input);
        /** @type {?} */
        this._open_promise=this._audio_input.open()
        /** @type {?} */
        this._open_result=undefined;
        this._status=TbskModem.ST.OPENING;
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
            ()=>{
                _t._open_promise=undefined;
                _t._open_result=true;
                _t._audio_input.start((s)=>{
                    _t._listener.push(s);
                });
                _t._status=TbskModem.ST.IDLE;
            },
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
     * {TbskModem#txReady}がtrueである必要があります。
     * @param {array[number]|string} src 
     * @returns {Promise}
     * 送信が完了、またはtxBreakで中断した場合にresolveします。
     * 送信処理を開始できない場合rejectします。
     */
    tx(src)
    {
        if(!this.txReady){
            return Promise.reject();
        }
        TBSK_ASSERT(this._status==TbskModem.ST.IDLE);
        let ainput=this._audio_input;
        let actx=ainput.audioContext;
        let mod=this._mod;
        let f32_array = mod.modulate(src);
        let buf = actx.createBuffer(1, f32_array.length, ainput.sampleRate);
        buf.getChannelData(0).set(f32_array);


        let _t=this;
        class TxSession{
            constructor(player)
            {
                /** @type {AudioPlayer|?} */
                this._player=player;
                let pp=this._player.play();
                this._promise=new Promise((resolve)=>{
                    pp.then(()=>{
                        _t._status=TbskModem.ST.IDLE;
                        resolve(true);//必ず呼ばれる
                    })
                });               
            }
            /**
             * キャンセルが完了する/完了していたら発火するPromise
             * @returns 
             * 完了するとresolve
             */
            cancel()
            {
                this._player.stop();//playは発火する。
                return this._promise;
            }
        }
        let player=new AudioPlayer(actx,buf);
        let current_tx=new TxSession(player);
        this._current_tx=current_tx;
        this._status=TbskModem.ST.TX_RUNNING;
        return this._current_tx._promise;
    }
    /**
     * 進行中のtxを中断します。
     * @returns {Promise<boolean>}
     * 待機状態が完了するとresolveします。
     * 戻り値は、待機が成功した場合true,失敗した場合falsseです。
     */
    txBreak()
    {
        switch(this._status){
        case TbskModem.ST.IDLE:
            return Promise.resolve(true);
        case TbskModem.ST.TX_RUNNING:
            TBSK_ASSERT(this._current_tx);
            this._status=TbskModem.ST.RX_BREAKING;
            //@ts-ignore
            return new Promise((resolve)=>{this._current_tx.cancel().then(()=>{resolve(true)});});
        default:
            return Promise.resolve(false);
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
     * パケットを受信します。
     * @returns {Promise}
     * パケットの受信を完了するとresolveします。
     * 受信が開始できないとrejectします。
     * 
     */
    rx(onStart,onData,onClose)
    {
        if(!this.rxReady){
            return Promise.reject();
        }
        let _t=this;
        class RxSession{
            constructor(listener)
            {
                let promise=new Promise((resolve)=>{
                    let packet_accepted=false;
                    listener.start(
                        ()=>{
                            packet_accepted=true;
                            Promise.resolve().then(
                                onStart
                            );
                        },
                        (d)=>{
                            Promise.resolve().then(()=>{
                                onData(d);
                            })
                        },
                        ()=>{
                            Promise.resolve().then(()=>{
                                onClose();
                            });
                        },
                    ).then(()=>{
                        _t._status=TbskModem.ST.IDLE;
                        resolve(packet_accepted);
                    })
                });
                this._listener=listener;
                this._promise=promise;
            }
            cancel(){
                return this._listener.stop().then(()=>{
                    _t._status=TbskModem.ST.IDLE;}
                );
            }
        }
        _t._current_rx=new RxSession(_t._listener);;
        _t._status=TbskModem.ST.RX_RUNNING;
        return _t._current_rx._promise;
    }
    /**
     * rxを停止して待機状態になるまで待ちます。
     * @returns {Promise<boolean>}
     * 待機状態が完了するとresolveします。
     * 戻り値は、待機が成功した場合true,失敗した場合falseです。
     */
    rxBreak()
    {
        switch(this._status){
        case TbskModem.ST.IDLE:
            return Promise.resolve(true);
        case TbskModem.ST.RX_RUNNING:
            TBSK_ASSERT(this._current_rx);
            this._status=TbskModem.ST.RX_BREAKING;
            //@ts-ignore
            let a=this._current_rx.cancel();
            console.log(a);
            return a;
        default:
            return Promise.resolve(false);
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