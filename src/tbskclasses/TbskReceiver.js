//@ts-check

import { AudioInput } from "../audio/AudioInput.js";
import {TBSK_ASSERT} from "../utils/functions"

import { TraitTone} from "./TbskTone.js";

import {TbskDemodulator} from "./TbskDemodulator"
import {RecoverableStopIteration} from "./RecoverableStopIteration"
import {StopIteration} from "./StopIteration"
import {Utf8Decoder,PassDecoder} from "../utils/decoder.js"
import {PromiseTask,DoubleInputIterator,Disposable, TbskException, PromiseLock} from "../utils/classes.js"




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


const ST={
    OPENING: 1,
    CLOSED: 2,
    CLOSING: 3,
    IDLE: 4,
    RECVING: 5,
    BREAKING:6,
}

/**
 * TBSK変調信号の送受信機能を統合したモデムクラスです。
 */
export class TbskReceiver extends Disposable
{
    static ST=ST;
    /**
     * インスタンスの状態を返します。
     */
    get status(){return this._status;};


    
    /**
     * @param {*} mod 
     * @param {TraitTone} tone
     * @param {Number|undefined} preamble_cycle 
     */
    constructor(mod,tone,preamble_cycle=undefined,decoder=undefined)
    {
        super();
        TBSK_ASSERT(mod);
        TBSK_ASSERT(tone);
        this._status=ST.CLOSED;
        this._rx_task=undefined;
        this._closing_lock=undefined;
        /** @type {AudioInput} */
        //@ts-ignore
        this._audio_input=undefined;
        this._listener=new TbskListener2(
            mod,tone,1.0,preamble_cycle,
            decoder);
    }
    /**
     * Audioデバイスの準備ができるまで待ちます。
     * @param {number} carrier
     * @returns {Promise}
     * ステータス異常の場合はrejectします。
     */
    async open(carrier=16000)
    {
        let _t=this;
        if(_t._status!=ST.CLOSED){
            throw new TbskException();
        }
        let audio_input=new AudioInput(carrier);
        /** @type {?} */
        _t._status=ST.OPENING;
        await audio_input.open();
        _t._audio_input=audio_input;
        audio_input.start((s)=>{
            _t._listener.push(s);
        });
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
            this._audio_input.close();
            await Promise.resolve();
            _t._status=ST.CLOSED;
            return;
        case ST.BREAKING:
        case ST.RECVING:
            _t._status=ST.CLOSING;
            _t._closing_lock=new PromiseLock();
            await _t._rx_task?.join();            
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
    dispose()
    {
        if(this._status==ST.CLOSED){
            return;
        }
        this.close().then(()=>{
            this._listener.dispose();}
        );
    }









    

    
    /**
     * rx関数が実行可能な状態かを返します。
     * @returns {boolean}
     */
    get rxReady(){
        switch(this._status){
            case ST.OPENING:
            case ST.CLOSED:
            case ST.CLOSING:
            case ST.BREAKING:
                return false;
            case ST.IDLE:
                return true;
            case ST.RECVING:
                return false;
            default:
                break;
        }
        throw new TbskException();
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
        class ListenerTask extends PromiseTask{
            constructor(listener){
                super();
                this._listener=listener;
            }
            async run(){
                return super.run(
                    this._listener.start(
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
            }
            async join(){
                if(this._listener){
                    this._listener.stop();//no-waitでメッセージだけ流す.                    
                    this._listener=undefined;
                }
                return super.join();
            }
        }
        let task=new ListenerTask(_t._listener);
        this._rx_task=task;
        this._status=ST.RECVING;
        await task.run();
        this._rx_task=undefined;
        //終わった時点で確認
        switch(this._status){
        case ST.BREAKING:
        case ST.RECVING:
            _t._status=ST.IDLE;
            return;
        case ST.CLOSING:
            return;
        default:
            throw new TbskException();
        }
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
        case ST.CLOSED:
        case ST.CLOSING:
            throw new TbskException();        
        case ST.IDLE:
            return;
        case ST.RECVING:
            this._status=ST.BREAKING;
        case ST.BREAKING:
            //@ts-ignore
            await this._rx_task.join();
            return;//Statusの保証はしない。

        default:
            throw new TbskException();
        }
    }
    get audioContext(){
        return this._audio_input.audioContext;
    }
    /**
     * オーディオ入力のRMS値を返します。
     */
    get rms(){
        return this._audio_input.rms;
    }
}