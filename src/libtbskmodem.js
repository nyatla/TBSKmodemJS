
import tbskmodemjsWASM from "./wasm/tbskmodem_wasm_mod.wasm"
import {TbskException} from "./utils/classes"

import {AudioInput} from "./audio/AudioInput"
import {AudioPlayer} from "./audio/AudioPlayer"
import { Buffer } from 'buffer';
import { TbskTransmitter } from "./tbskclasses/TbskTransmitter";
import { TbskReceiver } from "./tbskclasses/TbskReceiver";
import { TbskModulator } from "./tbskclasses/TbskModulator";
import { TbskDemodulator } from "./tbskclasses/TbskDemodulator";
import { TbskListener } from "./tbskclasses/TbskListener";
import { CustomTone,SinTone,TraitTone,XPskSinTone } from "./tbskclasses/TbskTone";
import { EasyChat as TbskSocket} from "./misc/TbskSocket";


// @ts-check

/**
 * ref::
 * https://zenn.dev/wok/articles/0022_bundle-wasm
 */

/** @type {string}*/
const VERSION="TBSKmodemJS/0.3.0";

/**
 * 
 */
export class TBSKmodemJS
{    
    /** @type {TBSKmodemJS} */
    static _instance=undefined;
    /**
     * 必要なAPIが揃っているかを返す。
     * @returns {boolean}
     */
    static checkEnvironment()
    {
        let apis={
            "mediaDevice":navigator.mediaDevices.getUserMedia?true:false,
            "AudioContext":(window.AudioContext || window.webkitAudioContext)?true:false,
            "WebAssembly":(typeof WebAssembly === 'object')
        };
        let r=true;
        for(let k in apis){
            r=r && apis[k];
        }
        return {success:r,result:{apis:apis}}

    }
    /**
     * @async
     * @returns {Promise<TBSKmodemJS>}
     */
    static async load() 
    {
        let check=TBSKmodemJS.checkEnvironment();
        if(!check.success){
            throw new TbskException("Missing required APIs.");
        }
        if(TBSKmodemJS._instance){
            console.log("TBSKmodemJS is already created.");
            return TBSKmodemJS._instance;
        }
        const mod = require("./wasm/tbskmodem_wasm_mod.js");
        const b = Buffer.from(tbskmodemjsWASM.split(",")[1], "base64");
        let wasm = await mod({ wasmBinary: b });
        TBSKmodemJS._instance=new TBSKmodemJS(wasm);
        return TBSKmodemJS._instance;
    }
    /**
     * コンストラクタは使用せずに、load関数で生成してください。
     * @constructor
     * @param {*} wasm 
     */
    constructor(wasm)
    {
        this.wasm=wasm;
        /** @type {string}*/
        this.version=VERSION+";"+wasm.VERSION;

        this.audio={
            /** @class {@link AudioInput} */
            AudioInput:AudioInput,
            /** @class {@link AudioPlayer} */
            AudioPlayer:AudioPlayer,
        };
        this.misc={
            /** @class {@link TbskSocket} */
            TbskSocket:class extends TbskSocket{
                /**
                 * {@link TbskSocket}のエイリアスです。
                 * @param {Object} options
                 * @param {number=}      options.carrier
                 * 搬送波周波数です。
                 * @param {string=}      options.decoder
                 * ペイロードのエンコーディングを指定します。"utf8","bin"が利用できます。省略時は"bin"です。
                 * @param {TraitTone=}   options.tone
                 * トーン信号を指定します。省略時はXPskSine(10,10)です。
                 * @param {number=}      options.preamble_cycle
                 * プリアンブルの設定値です。省略時は4です。
                 * @param {boolean=}     options.stop_symbol
                 * 送信時にストップシンボルを付加するかのフラグです。省略時はtrueです。
                 */
                constructor(options=undefined){
                    super(...[wasm].concat([options]));
                }
            }
        };
        /** @class {TraitTone} */
        this.CustomTone=class extends CustomTone{
            /**
             * 
             * @param {Number[]} d 
             */
            constructor(d){
                super(wasm,d);
            }
        };
        /** @class {SinTone} */
        this.SinTone=class extends SinTone{
            constructor(points=10,cycle=10){
                super(wasm,points,cycle);
            }
        };
        /** @class {XPskSinTone}*/
        this.XPskSinTone=class extends XPskSinTone{
            constructor(points=10,cycle=10,div=8){
                super(wasm,points,cycle,div);
            }
        };
        /** @class {TbskModulator}*/
        this.TbskModulator=class extends TbskModulator
        {
            constructor(...args) {
                super(...[wasm].concat(args));
            }
        };
        /** @class {TbskDemodulator}*/
        this.TbskDemodulator=class extends TbskDemodulator
        {
            constructor(...args) {
                super(...[wasm].concat(args));
            }
        };
        // /** @class {TbskModem}*/
        // this.TbskModem=class extends TbskModem
        // {
        //     /**
        //      * @param {TraitTone|undefined} tone
        //      * @param {number|undefined} preamble_cycle 
        //      */
        //     constructor(tone=undefined,preamble_cycle=undefined)
        //     {
        //         super(...[wasm].concat([tone,preamble_cycle]));
        //     }
        // };
        /** @class {TbskTransmitter}*/
        this.TbskTransmitter=class extends TbskTransmitter
        {
            /**
             * @param {TraitTone} tone
             * @param {Number|undefined} preamble_cycle 
             */
            constructor(tone,preamble_cycle=undefined)
            {
                super(...[wasm].concat([tone,preamble_cycle]));
            }

        }
        /** @class {TbskReceiver}*/
        this.TbskReceiver=class extends TbskReceiver
        {
            /**
             * @param {TraitTone} tone
             * @param {Number|undefined} preamble_cycle 
             */
            constructor(tone,preamble_cycle=undefined,decoder=undefined)
            {
                super(...[wasm].concat([tone,preamble_cycle,decoder]));
            }

        }

        
        /** @class {@link TbskListener}*/
        this.TbskListener=class extends TbskListener
        {
            /**
             * @param {TraitTone} tone
             * @param {number} preamble_th
             * @param {{onStart,onData,onEnd}} events
             * @param {string|undefined} decoder
             */
            constructor(tone, preamble_th=1.0,preamble_cycle=4, events = {}, decoder = undefined)
            {
                super(...[wasm].concat([tone,preamble_th,preamble_cycle,events,decoder]));
            }
        };
    }    
}



