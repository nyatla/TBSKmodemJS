//@ts-check

import { AudioInput } from "../audio/AudioInput.js";
import {sleep, TBSK_ASSERT} from "../utils/functions"

import { TraitTone} from "./TbskTone.js";

import {TbskDemodulator} from "./TbskDemodulator"
import {RecoverableStopIteration} from "./RecoverableStopIteration"
import {StopIteration} from "./StopIteration"
import {Utf8Decoder,PassDecoder} from "../utils/decoder.js"
import {DoubleInputIterator,Disposable, TbskException} from "../utils/classes.js"
import {PromiseSequenceRunner,PromiseThread, PromiseLock} from "../utils/promiseutils"



/**
 * パケット受信１回分のワークフローです。
 * 外部保持されているインスタンスを操作して、TBSKパケットの受信処理を非同期関数化します。
 * 
 * 必ずdetect->read->closeの順番で呼び出してください。
 */
class PacketProcessor
{
    static ST={
        WAIT_FOR_DETECT:0,
        DETECTING:1,
        READING:2,
        CLOSED:3
    }
    /**
     * 
     * @param {*} demod
     * 初期状態のdemodulationインスタンス
     * @param {*} input_buf 
     * 初期状態の入力バッファ
     */
     
    constructor(demod,input_buf)
    {
        let ST=PacketProcessor.ST;
        this._kill_request=false;
        this._out_buf=undefined;        
        this._st=ST.WAIT_FOR_DETECT;
        this._input_buf=input_buf;
        this._demod=demod;
        this._close_lock=new PromiseLock();
    }
    /**
     * @async
     * パケットを検出します。
     * @returns {Promise<boolean>}
     * パケットを検出するとtrueです。引き続き、#read関数を使用して読出し操作ができます。
     */
    async detect()
    {
        const ST=PacketProcessor.ST;
        let demod=this._demod;
        let input_buf=this._input_buf;
        //console.log("workflow called!");
        let out_buf = null;
        let dresult = null;
        TBSK_ASSERT(this._st==ST.WAIT_FOR_DETECT);
        this._st=ST.DETECTING;
        dresult = demod._demodulateAsInt_B(input_buf);
        if (dresult == null) {
            //未検出でinputが終端
            this._st=ST.CLOSED;
            this._close_lock.release();            
            return false;//終端
        }
        //dresultは必ず解放して
        try{
            switch (dresult.getType()) {
            case 1://1 iter
                out_buf = dresult.getOutput();
                break;
            case 2:// recover
                let _t=this;
                while(true){
                    if(_t._kill_request){
                        out_buf=null;//ERR
                    }
                    out_buf = dresult.getRecover();
                    if (out_buf == null) {
                        await sleep(30);//タスクスイッチ(高負荷だからresolverにしたいな。)
                        continue;
                    }
                    break;
                }
                break
            default:
                //継続不能なエラー
                this._st=ST.CLOSED;
                this._close_lock.release();
                console.error("unknown type.");
                throw new Error();
            }
        }finally{
            console.log("debug",dresult);
            dresult.dispose();
            dresult = null; 
        }
        //CLOSEDかREADINGに遷移
        if(out_buf==null){
            this._st=ST.CLOSED;
            this._close_lock.release();            
            return false;
        }else{
            console.log("Signal detected!");
            this._st=ST.READING;
            this._out_buf=out_buf;
            return true;
        }
    }
    /**
     * 
     * @returns {Promise<number[]|string|undefined>}
     */
    async read(decoder)
    {   
        const ST=PacketProcessor.ST;
        let _t=this;
        let ra = [];
        function loop(out_buf)
        {
            try {
                if(_t._kill_request){
                    console.log("Kill accepted!");
                    throw new StopIteration();//強制的に確定
                }
                while(true){
                    let w = out_buf.next();
                    ra.push(w);
                }
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
                                return rd;
                            }
                        } else {
                            return ra;
                        }
                        ra=[];
                    }
                    if (e instanceof RecoverableStopIteration) {
                        return false;//
                    }
                }
            }
            return null;
        }
        TBSK_ASSERT(this._st==ST.READING);
        let out_buf=this._out_buf;
        let ret;
        while(true){
            ret=loop(out_buf);//awaitLoopなので負荷率高いよ。
            if(ret===false){
                await sleep(30);//タスクスイッチ(高負荷だからresolverにしたいな。)
                continue;
            }
            break;
        }
        if(ret!==null){
            //受信
            return ret;
        }
        //CLOSEDに移行
        out_buf.dispose();
        this._out_buf = undefined;        
        this._st=ST.CLOSED;
        this._close_lock.release();
        return undefined;      
    }
    /**
     * CLOSE状態に遷移するまで待ちます。
     * 受信中の場合、受信が完了するまで待機します。
     * 待機したくない場合は先に#interruptを実行してください。
     * @returns 
     */
    async close(){
        const ST=PacketProcessor.ST;        
        switch(this._st){
        case ST.CLOSED:
            return;
        case ST.READING:
        case ST.WAIT_FOR_DETECT:
        case ST.DETECTING:
            //クローズロックまち
            await this._close_lock.wait();
            TBSK_ASSERT(this._st==ST.CLOSED);
            return;
        }
    }
    update(src){
        this._input_buf.puts(src);
    }
    /**
     * 処理の中断要求を出す。
     * 中断要求した後はreadは必ず失敗します。
     */
    interrupt(){
        this._kill_request=true;
    }
}







/**
 * disposeの実行が必要なEventTarget継承クラスです。
 */
class DisposableEventTarget extends EventTarget{}

/**
 * TBSK変調信号の受信機能を提供します。
 */
export class TbskReceiver extends DisposableEventTarget
{
    static ST={
        OPENING: 1,
        CLOSED: 2,
        CLOSING: 3,
        IDLE: 4,
        RECVING: 5,
        BREAKING:6,    
    };
    /**
     * インスタンスの状態を返します。
     */
    get status(){return this._status;};


    
    /**
     * @param {*} mod 
     * @param {TraitTone} tone
     * @param {Number|undefined} preamble_cycle 
     */
    constructor(mod,tone,preamble_th=1.0,preamble_cycle=4)
    {
        super();
        const ST=TbskReceiver.ST;
        TBSK_ASSERT(mod);
        TBSK_ASSERT(tone);
        this._mod=mod;
        this._status=ST.CLOSED;
        this._rx_task=undefined;
        this._closing_lock=undefined;
        this._demod = new TbskDemodulator(mod,tone, preamble_th, preamble_cycle);
        this._input_buf = new DoubleInputIterator(mod,true);
        this._packet_proc=undefined;
        this._decoder=undefined;


        





        /** @type {AudioInput} */
        //@ts-ignore
        this._audio_input=undefined;
        this._packet_proc=undefined;
    }
    /**
     * Audioデバイスの準備ができるまで待ちます。
     * @param {number} carrier
     * @returns {Promise}
     * ステータス異常の場合はrejectします。
     */
    async open(carrier=16000,decoder=undefined)
    {
        let _t=this;
        const ST=TbskReceiver.ST;
        if(_t._status!=ST.CLOSED){
            throw new TbskException();
        }
        let audio_input=new AudioInput(carrier);
        this._decoder= decoder == "utf8" ? new Utf8Decoder() : new PassDecoder();

        /** @type {?} */
        _t._status=ST.OPENING;
        await audio_input.open();
        this._audio_input=audio_input;
        _t._status=ST.IDLE;
        return;
    }


    /**
     * 受信機を閉じます。
     * @returns 
     */
    async close()
    {
        let _t=this;
        const ST=TbskReceiver.ST;
        switch(_t._status){
        case ST.CLOSED:
            return;
        case ST.IDLE:
            _t._status=ST.CLOSING;
            await this._audio_input.close();
            _t._status=ST.CLOSED;
            return;
        case ST.BREAKING:
        case ST.RECVING:
            _t._status=ST.CLOSING;
            _t._closing_lock=new PromiseLock(); //CLOSINGの多重呼び出し対策
            await this._rx_lock?.wait();//rx待機待ち
            TBSK_ASSERT(_t._status==ST.CLOSING);//変更しないこと
            await this._audio_input.close();
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
        const ST=TbskReceiver.ST;
        if(this._status==ST.CLOSED){
            return;
        }
        //リソースの破棄は非同期で実行する。
        this.close().then(()=>{
            this._demod.dispose();
            this._input_buf.dispose();
        });
    }
    
    /**
     * rx関数が実行可能な状態かを返します。
     * @returns {boolean}
     */
    get rxReady(){
        const ST=TbskReceiver.ST; 
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
        const ST=TbskReceiver.ST; 
        let pp=this._packet_proc=new PacketProcessor(this._demod,this._input_buf);
        //Audioの開始
        _t._decoder?.reset();
        _t._status=ST.RECVING;
        _t._rx_lock=new PromiseLock();
        let ps=new PromiseSequenceRunner();
        this._audio_input.start((s)=>{
            pp?.update(s);
        });
        try{
            if(await pp?.detect()){
                ps.execute(()=>{onSignal()});//非同期実行
                while(true){
                    let v=await pp?.read(_t._decoder);
                    if(!v){
                        break;
                    }
                    ps.execute(()=>{
                        if(_t._status==ST.RECVING){
                            //非同期にRECV以外に遷移してたら送信しない。
                            onData(v);
                        }
                    });//非同期実行
                }
                ps.execute(()=>{onSignalLost()});//非同期実行
            }
        }finally{
            //Audioの停止
            this._audio_input.stop();
            await ps.execute(()=>{});//残りを全部実行
            if(_t._status!=ST.CLOSING){
                _t._status=ST.IDLE;
            }
            _t._rx_lock.release();
            _t._rx_lock=undefined;
        }
    }
    /**
     * @async
     * rxを停止して待機状態になるまで待ちます。
     * 既にbreak中,closing中の場合は、実行中のRXの完了を待機します。
     * コールバック関数内で実行した場合、実行以降に受信したメッセージは破棄します。
     * @returns {Promise<void>}
     * 待機状態が完了するとresolveします。
     */
    async rxBreak()
    {
        const ST=TbskReceiver.ST;
        let pp=this._packet_proc;
        pp?.interrupt();
        switch(this._status){
        case ST.IDLE:
            //console.log("IDLE..pass!");
            return;
        case ST.RECVING:
            this._status=ST.BREAKING;
        case ST.BREAKING:
            //console.log("break_lock",this.status,this._rx_lock);
            await this._rx_lock?.wait();
            //console.log("break_release",this.status);
            return;//Statusの保証はしない。
        default:
            throw new TbskException("rxBreak");
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