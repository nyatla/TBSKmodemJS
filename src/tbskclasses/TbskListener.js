import {TbskDemodulator} from "./TbskDemodulator.js"
import {Utf8Decoder,PassDecoder} from "../utils/decoder.js"
import {DoubleInputIterator,Disposable} from "../utils/classes.js"
import {StopIteration} from "./StopIteration"
import {RecoverableStopIteration} from "./RecoverableStopIteration"

export class TbskListener extends Disposable{
    /**
     * onStart,onData,onEndはpush関数をトリガーに非同期に呼び出します。
     * 
     * デコードオブジェクトは、T put(data),reset()の関数を持つオブジェクトで、与えられたdataからTが生成できたときにTを返します。生成できない場合はundefinedです。resetで状態を初期化します。
     * 
     * 
     * @param {Tone} tone
     * @param {Preamble} preamble
     * @param {onStart,onData,onEnd} events
     * @param {string|undefined} decoder
     */
    constructor(mod,tone, preamble_th=1.0,preamble_cycle=4, events = {}, decoder = undefined) {
        super();
        if (!("onStart" in events)) { events.onStart = null; }
        if (!("onData" in events)) { events.onData = null; }
        if (!("onEnd" in events)) { events.onEnd = null; }
        let _t = this;
        this._decoder = decoder == "utf8" ? new Utf8Decoder() : new PassDecoder();
        this._demod = new TbskDemodulator(mod,tone, preamble_th, preamble_cycle);
        this._input_buf = new DoubleInputIterator(mod,true);
        this._callOnStart = () => {
            new Promise((resolve) => {
                resolve();
            }).then(() => { if (events.onStart) { events.onStart() } });
        };
        this._callOnData = (data) => {
            new Promise((resolve) => {
                resolve();
            }).then(() => { if (events.onData) { events.onData(data) } });
        };
        this._callOnEnd = () => {
            new Promise((resolve) => {
                resolve();
            }).then(() => { if (events.onEnd) { events.onEnd() } });
        };
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
    push(src)
    {
        /**
         * 1回目のyieldで関数を返す。
         * @param {any} demod
         * @param {any} input_buf
         */
        function* workflow(demod, input_buf,callOnStart,callOnData,callOnEnd,decoder)
        {
            decoder.reset();
//                console.log("workflow called!");
            let out_buf = null;
            let dresult = null;
            dresult = demod._demodulateAsInt_B(input_buf);
            if (dresult == null) {
                //未検出でinputが終端
                console.error("input err");
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
                            return;//done
                    }
                } finally {
                    dresult.dispose();
                    dresult = null;
                }
                //outにイテレータが入っている。
                console.log("Signal detected!");
                callOnStart();
                //終端に達する迄取り出し
                let ra = [];
                for (; ;) {
                    try {
                        for (; ;) {
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
                                        callOnData(rd);
                                    }
                                } else {
                                    callOnData(ra);
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
                                        callOnData(rd);
                                    }
                                } else {
                                    callOnData(ra);
                                }
                                ra = [];
                            }
                            console.log("Signal lost!");
                            callOnEnd();
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
            }
            //関数終了。
            console.log("end of workflow");
        }
//            console.log("push callead!");
        this._input_buf.puts(src);
//            console.log("input_buf_len:" + src.length);
        if (this._currentGenerator == null) {
            this._currentGenerator = workflow(this._demod, this._input_buf, this._callOnStart, this._callOnData, this._callOnEnd, this._decoder);//新規生成
        }
        if (this._currentGenerator.next().done) {
            this._currentGenerator = null;
        }
    }
}