
import tbskmodemjsWASM from "./wasm/tbskmodem_wasm_mod.wasm"
import {TbskException} from "./utils/classes"

import {AudioInput} from "./audio/AudioInput"
import {AudioPlayer} from "./audio/AudioPlayer"
import { Buffer } from 'buffer';
import { TbskModem } from "./tbskclasses/TbskModem";
import { TbskModulator } from "./tbskclasses/TbskModulator";
import { TbskDemodulator } from "./tbskclasses/TbskDemodulator";
import { TbskListener } from "./tbskclasses/TbskListener";
import { SinTone,TraitTone,XPskSinTone } from "./tbskclasses/TbskTone";


// @ts-check

/**
 * ref::
 * https://zenn.dev/wok/articles/0022_bundle-wasm
 */

/** @type {string}*/
const VERSION="TBSKmodemJS/0.2.0";

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
        class AudioSub{
            constructor(){
                this.AudioInput=AudioInput;
                this.AudioPlayer=AudioPlayer;
            }
        };
        /** @class {AudioSub}*/
        this.audio=new AudioSub();
        /** @class {TraitTone}*/
        this.CustomTone=class extends TraitTone{
            constructor(d){
                super(wasm,d);
            }
        };
        /** @class {SinTone}*/
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
        /** @class {TbskModem}*/
        this.TbskModem=class extends TbskModem
        {
            constructor(...args) {
                super(...[wasm].concat(args));
            }
        };
        /** @class {TbskListener}*/
        this.TbskListener=class extends TbskListener
        {
            constructor(...args) {
                super(...[wasm].concat(args));
            }
        };
    }    
}



