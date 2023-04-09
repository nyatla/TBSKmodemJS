//@ts-check

import { TBSKmodemJS } from "../../../src/libtbskmodem";
import { StopIteration } from "../../../src/tbskclasses/StopIteration";
import { IPacketConverter } from "../../../src/utils/packetconverter";

const jQuery = require("jquery");


export class CountUpConverter extends IPacketConverter
{
    constructor(){
        super("CountUpDecoder");
        this._c=0;
    }
    reset(){}
    put(data){
        this._c++;
        return 1;
    }
    next(){
        if(this._c>0){
            return this._c--;
        }
        throw new StopIteration();

    }
}


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
        }
        console.log("Demodulatorテスト");
        {
            var tone = new tbsk.XPskSinTone(10,10);
            var mod=new tbsk.TbskModulator(tone);
            //        let d=mod.modulate("Hello");
            let d=mod.modulate([56,58,57,2,5,88,5,8,5,66,24,58,56]);
            let ds=mod.modulate("HelloWorld!");
            let demod=new tbsk.TbskDemodulator(tone);
            console.log("A",demod.demodulate(d));
            console.log("B",demod.demodulateAsStr(ds));
            let conv=new CountUpConverter();
            let demod2=new tbsk.TbskDemodulator(tone,1,4,conv);
            console.log("C",demod2.demodulate(d));
//            console.log("D",demod2.demodulateAsStr(ds));




            tone.dispose();
            mod.dispose();
            demod.dispose();
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
                    setTimeout(()=>{listener.stop();},1000);
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

