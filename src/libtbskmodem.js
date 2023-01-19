
import tbskmodemjsWASM from "./wasm/tbskmodem_wasm_mod.wasm"
import {AudioCapture2} from "./audiocapture2.js"
import {AudioCapture1} from "./audiocapture1.js"
import { Buffer } from 'buffer';
/**
 * ref::
 * https://zenn.dev/wok/articles/0022_bundle-wasm
 */
const VERSION="TBSKmodemJS/0.1.0";

export const TBSKmodemJS={
    _instance:null,
    load:async ()=>
    {
        if(TBSKmodemJS._instance){
            console.log("TBSKmodemJS is already created.");
            return TBSKmodemJS;
        }
        const mod = require("./wasm/tbskmodem_wasm_mod.js");
        const b = Buffer.from(tbskmodemjsWASM.split(",")[1], "base64");
        let wasm = await mod({ wasmBinary: b });
        wasm._load_apis();
        TBSKmodemJS.wasm=wasm;
        TBSKmodemJS.version=VERSION+";TBSKmodem/"+wasm._wasm_tbskmodem_VERSION(0)+"."+wasm._wasm_tbskmodem_VERSION(1)+"."+wasm._wasm_tbskmodem_VERSION(2);
        TBSKmodemJS.wasm=wasm;
        TBSKmodemJS.audio={
            AudioCapture:AudioCapture2,
            capture1:AudioCapture1,
            capture2:AudioCapture2,            
        };
        for(let i in wasm.tbskmodem){
            TBSKmodemJS[i]=wasm.tbskmodem[i];
        }
        return TBSKmodemJS;
    }};
