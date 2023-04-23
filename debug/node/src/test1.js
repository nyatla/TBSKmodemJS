//@ts-check

import { TBSKmodemJS } from "../../../src/libtbskmodem";
import { StopIteration } from "../../../src/tbskclasses/StopIteration";


const jQuery = require("jquery");



/**
 * 
 * @param {TBSKmodemJS} tbsk 
 */
export function test1(tbsk)
{
    //生成チェック
    // @ts-ignore
    window.TBSKmodemJS=tbsk;
    console.log(tbsk.version);
    async function fn(){           
        //////////////////////////////////////////
        console.log("生成テスト");
        {
            //@type {SinTone}
            var sintone = new tbsk.SinTone(10,10);
            var customtone = new tbsk.CustomTone([10,10]);
            var xpsktone = new tbsk.XPskSinTone(10,10);
            sintone.dispose();
            customtone.dispose();
            xpsktone.dispose();
            
            var tone = new tbsk.XPskSinTone(10,10);
            var mod=new tbsk.TbskModulator(tone);
            var demod=new tbsk.TbskDemodulator(tone);

            var listener=new tbsk.TbskListener(tone);
            mod.dispose();
            demod.dispose();
            listener.dispose();
            tone.dispose();
            console.log("[active instance]",tbsk.wasm._wasm_tbskmodem_PointerHolder_Size());
        }
        //////////////////////////////////////////
        console.log("Modulatorテスト");
        {
            var tone = new tbsk.XPskSinTone(10,10);
            var mod=new tbsk.TbskModulator(tone);
            let d=mod.modulate("ab");
            console.log("Length of modulated",d.length);
            mod.dispose();
            tone.dispose();    
            console.log("[active instance]",tbsk.wasm._wasm_tbskmodem_PointerHolder_Size());
        }
        console.log("Demodulatorテスト");
        {
            var tone = new tbsk.XPskSinTone(10,10);
            var mod=new tbsk.TbskModulator(tone);
            //        let d=mod.modulate("Hello");
            let d=mod.modulate([56,58,57,2,0x88,88,5,8,0xe3, 0x81, 0x82,80,80]);
            let ds=mod.modulate("HelloWorld!");
            let demod=new tbsk.TbskDemodulator(tone);
            console.log("A(bin)",demod.demodulate(d));
            console.log("A(str)",demod.demodulateAsStr(d));
            console.log("B",demod.demodulateAsStr(ds));
            tone.dispose();
            mod.dispose();
            demod.dispose();
            console.log("[active instance]",tbsk.wasm._wasm_tbskmodem_PointerHolder_Size());
        }
        console.log("Listenerテスト");
        {
            var tone = new tbsk.XPskSinTone(10,10);
            var mod=new tbsk.TbskModulator(tone);
            let d=mod.modulate("Hello");
            console.log("listener");
            let listener = new tbsk.TbskListener(tone,1,4, { onStart:()=>{},onData: (s) => { console.log(s); },onEnd:()=>{}},"utf8");
            listener.push([0,0,0,0,0,0,0]);
            listener.push(d);
            console.log("#3");
            console.log()
            tone.dispose();
            mod.dispose();
            listener.dispose();
            console.log("[active instance]",tbsk.wasm._wasm_tbskmodem_PointerHolder_Size());
        }
        console.log("AudioPlayテスト");
        {
            var tone = new tbsk.XPskSinTone(10,10);
            var mod=new tbsk.TbskModulator(tone);
            let actx=new window.AudioContext({ sampleRate:16000 });
            let abuf=mod.modulate2AudioBuffer(actx,"Hello",8000);
            let player=new tbsk.audio.AudioPlayer(actx,abuf);
            player.play()
            .then(()=>{
                tone.dispose();
                mod.dispose();
            }).then(()=>{
                let listener=new tbsk.audio.AudioInput(8000);
                listener.open().then(()=>{
                    listener.start(()=>{
                        console.log("recv");
                    });
                    setTimeout(()=>{
                        listener.stop();
                        console.log("[active instance]",tbsk.wasm._wasm_tbskmodem_PointerHolder_Size());

                    },1000);
                });
            });
        }
    };
    try{
        fn();
    }catch(e){
        console.log(e);
    }
}

