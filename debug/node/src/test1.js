//@ts-check

const jQuery = require("jquery");


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
            var modem= new tbsk.TbskModem();
            try{
                console.log(modem.status);
                await modem.open();
                console.log(modem.status);
                await modem.close();
            }catch(e){
                console.log(e);
            }
            var listener=new tbsk.TbskListener(tone);
            mod.dispose();
            demod.dispose();
            modem.dispose();
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
            let demod=new tbsk.TbskDemodulator(tone);
            let dint = demod.demodulate(d);
            let dstr = demod.demodulate(d,"utf8");
            console.log("ret",dint,dstr);
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

