//@ts-check

//スタンドアロン版
import { AudioPlayer } from "../../../src/audio/AudioPlayer.js";
import {TBSKmodemJS} from "../../../src/libtbskmodem.js"
import { XPskSinTone } from "../../../src/tbskclasses/TbskTone.js";
//import { TbskModem } from "../../../src/tbskclasses/TbskModem.js";
import { TbskTransmitter } from "../../../src/tbskclasses/TbskTransmitter";
import { TbskReceiver } from "../../../src/tbskclasses/TbskReceiver";
import { EasyChat } from "../../../src/misc/EasyChat";

import { TbskException } from "../../../src/utils/classes.js";
import { sleep } from "../../../src/utils/functions.js";
const jQuery = require("jquery");

function TEST(message,e){
    if(!e){
        console.error("[FAIL]"+message);
    }else{
        console.log("[PASS]"+message);
    }
}

/**
 * 
 */
TBSKmodemJS.load().then((tbsk)=>{
    let $=jQuery;
    $("#test1").on("click",()=>{
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
    });
    $("#test2").on("click",()=>{
        async function fn()
        {
            const ST=TbskTransmitter.ST;
            let txi=new tbsk.TbskTransmitter(new tbsk.XPskSinTone(10,10));
            console.log(txi.status);
            TEST("Status check",txi.status==ST.CLOSED);
            await txi.open(new AudioContext());
            TEST("Status check",txi.status==ST.IDLE)
            console.log("送信テスト.");
            {
                TEST("Status check",txi.status==ST.IDLE);
                let then=txi.tx("hello");
                TEST("Status check",txi.status==ST.SENDING);
                await then;
                TEST("Status check",txi.status==ST.IDLE);    
            }
            console.log("多重送信失敗テスト.");
            {
                TEST("Status check",txi.status==ST.IDLE);
                let then=txi.tx("hello");
                TEST("Status check",txi.status==ST.SENDING);
                //rejectされること
                let rejected=false;
                try{
                    await txi.tx("hello");
                }catch(e){
                    rejected=true;
                }
                TEST("REJECTED",rejected==true);
                await then;
            }
            console.log("送信中断テスト.");
            {
                TEST("Status check",txi.status==ST.IDLE);
                let then=txi.tx("hello");
                TEST("Status check",txi.status==ST.SENDING);

                await sleep(100);
                TEST("Status check",txi.status==ST.SENDING);
                let b=txi.txBreak();
                TEST("Status check",txi.status==ST.BREAKING);
                await txi.txBreak();
                await b;
                TEST("Status check",txi.status==ST.IDLE);
            }
            console.log("送信中クローズテスト");
            {
                TEST("Status check",txi.status==ST.IDLE);
                let then=txi.tx("hello");
                TEST("Status check",txi.status==ST.SENDING);
                await sleep(100);
                TEST("Status check",txi.status==ST.SENDING);
                let b=txi.close();
                TEST("Status check",txi.status==ST.CLOSING);
                await b;
                TEST("Status check",txi.status==ST.CLOSED);
                await txi.open(new AudioContext());
            }
            await txi.close();
            console.log("終");

        }
        try{
            fn();
        }catch(e){
            console.log(e);
        }
    })
    $("#test3").on("click",()=>{

        async function fn()
        {
            const ST=TbskReceiver.ST;
            {
                let rxi=new tbsk.TbskReceiver(new tbsk.XPskSinTone(10,10));
                TEST("Status check",rxi.status==ST.CLOSED);
                let open_await=rxi.open(16000);
                TEST("Status check",rxi.status==ST.OPENING);
                await open_await;
                TEST("Status check",rxi.status==ST.IDLE);
                let txi=new tbsk.TbskTransmitter(new tbsk.XPskSinTone(10,10));
                await txi.open(rxi.audioContext);
                console.log("受信テスト.");
                if(true){
                    TEST("Status check",rxi.status==ST.IDLE);
                    let rx=rxi.rx(
                        ()=>{console.log("RX: onstart");},
                        (d)=>{console.log("RX: ondata "+d);},
                        ()=>{console.log("RX: onclose")},)
                    TEST("Status check",rxi.status==ST.RECVING);
                    sleep(300,()=>{txi.tx("HELLLLLO");})//遅延して送信
                    await rx;
                    console.log("done");
                    TEST("Status check",rxi.status==ST.IDLE);
                    await txi.txBreak();
                    await sleep(500);
                }
                console.log("受信中断テスト.");
                if(true){
                    TEST("Status check:L1",rxi.status==ST.IDLE);
                    let rx=rxi.rx(
                        ()=>{console.log("RX: onstart");},
                        (d)=>{console.log("RX: ondata "+d);},
                        ()=>{console.log("RX: onclose")},);
                    rx.then(()=>{console.log("rx:done",rxi.status)});                        
                    TEST("Status check:L2",rxi.status==ST.RECVING);
                    sleep(100,()=>{txi.tx("HELLLLLO");})//遅延して送信
                    sleep(200,()=>{
                        async function f(){
                            let rxb=rxi.rxBreak();
                            TEST("Status check:L3",[ST.BREAKING,ST.IDLE].includes(rxi.status));
                            let rxb2=rxi.rxBreak();
                            TEST("Status check:L4",[ST.BREAKING,ST.IDLE].includes(rxi.status));
                            rxb.then(()=>{console.log("rxb:done",rxi.status)});
                            rxb2.then(()=>{console.log("rxb2:done")});        
                            console.log("memo");
                            await rxb;
                            console.log(rxi.status);
                            TEST("Status check:L5",[ST.IDLE].includes(rxi.status));
                            await rx;
                            TEST("Status check",rxi.status==ST.IDLE);
                            await rxb2;
                            TEST("Status check",rxi.status==ST.IDLE);
                        };
                        f();
                    });
                    await rx;
                    await txi.txBreak();
                    await sleep(500);            
                }
                console.log("受信中断テスト(コールバックないから)");
                if(true){
                    TEST("Status check",rxi.status==ST.IDLE);
                    let cr=0;
                    let rx=rxi.rx(
                        ()=>{console.log("RX: onstart");},
                        (d)=>{
                            console.log("RX: ondata "+d);
                            cr=cr+1;
                            if(cr==2){rxi.rxBreak();}
                        },
                        ()=>{console.log("RX: onclose")},
                    )
                    rx.then(()=>{console.log("rx:done",rxi.status)});                        
                    TEST("Status check:L2",rxi.status==ST.RECVING);
                    sleep(100,()=>{txi.tx("HELLLLFFFFFFFFFFFFFFFFFFFFFFFFFFLLLLLLLLLLLLO");})//遅延して送信
                    sleep(200,()=>{
                        async function f(){
                            await rx;
                            TEST("Status check",rxi.status==ST.IDLE);
                        };
                        f();
                    });
                    await rx;
                    await txi.txBreak();

                    TEST("Status check:L5",[ST.IDLE].includes(rxi.status));
                    await sleep(500); 
                }
            }
            if(true){
                console.log("突然のclose")
                let rxi=new tbsk.TbskReceiver(new tbsk.XPskSinTone(10,10));
                TEST("Status check",rxi.status==ST.CLOSED);
                let open_await=rxi.open(16000);
                TEST("Status check",rxi.status==ST.OPENING);
                await open_await;
                TEST("Status check",rxi.status==ST.IDLE);
                let txi=new tbsk.TbskTransmitter(new tbsk.XPskSinTone(10,10));
                await txi.open(rxi.audioContext);
                TEST("Status check:L1",rxi.status==ST.IDLE);
                let rx=rxi.rx(
                    ()=>{console.log("RX: onstart");},
                    (d)=>{console.log("RX: ondata "+d);},
                    ()=>{console.log("RX: onclose")},);
                rx.then(()=>{console.log("rx:done",rxi.status)});                        
                TEST("Status check:L2",rxi.status==ST.RECVING);
                sleep(100,()=>{txi.tx("HELLLLLO");})//遅延して送信
                sleep(200,()=>{
                    async function f(){
                        let rxb=rxi.rxBreak();
                        TEST("Status check:L3",[ST.BREAKING].includes(rxi.status));
                        let rxb2=rxi.close();
                        TEST("Status check:L4",[ST.CLOSING].includes(rxi.status));
                        rxb.then(()=>{console.log("rxb:done",rxi.status)});
                        rxb2.then(()=>{console.log("rxb2:done")});        
                        console.log(rxi.status);
                        await rxb2;
                        // TEST("Status check:L6",[ST.CLOSED].includes(rxi.status));
                    };
                    f();
                });
                await rx;
                await txi.txBreak();                
                await sleep(500);  
            }
            if(true){
                console.log("突然のclose(コールバックから)")
                let rxi=new tbsk.TbskReceiver(new tbsk.XPskSinTone(10,10));
                TEST("Status check",rxi.status==ST.CLOSED);
                let open_await=rxi.open(16000);
                TEST("Status check",rxi.status==ST.OPENING);
                await open_await;
                TEST("Status check",rxi.status==ST.IDLE);
                let txi=new tbsk.TbskTransmitter(new tbsk.XPskSinTone(10,10));
                await txi.open(rxi.audioContext);
                TEST("Status check:L1",rxi.status==ST.IDLE);
                let cr=0;
                let rx=rxi.rx(
                    ()=>{console.log("RX: onstart");},
                    (d)=>{
                        console.log("RX: ondata "+d);
                        cr=cr+1;
                        if(cr==2){
                            rxi.close();
                            TEST("Status check",[ST.CLOSING,ST.CLOSED].includes(rxi.status));

                        }
                    },
                    ()=>{console.log("RX: onclose")},
                )
                rx.then(()=>{console.log("rx:done",rxi.status)});                        
                TEST("Status check:L2",rxi.status==ST.RECVING);
                sleep(100,()=>{txi.tx("HELLLLLO");})//遅延して送信
                sleep(200,()=>{
                    async function f(){
//                        TEST("Status check",[ST.CLOSING,ST.CLOSED].includes(rxi.status));
//                        await rx;
//                        TEST("Status check",[ST.CLOSED].includes(rxi.status));
                    };
                    f();
                });
                await rx;
                console.log(rxi._status);
                TEST("Status check",[ST.CLOSING,ST.CLOSED].includes(rxi.status));
                await rxi.close();
                TEST("Status check",[ST.CLOSED].includes(rxi.status));
                await sleep(500);  
            }
            console.log("終");


        }



        try{
            fn();
        }catch(e){
            console.log(e);
        }
    })/*
    $("#test5").on("click",()=>{

        async function fn()
        {
            let chat=new tbsk.misc.EasyChat(new tbsk.XPskSinTone(10,10));
            TEST("Status check",chat.status==EasyChat.ST.CLOSED);
            let asopen=chat.open();
            TEST("Status check",rxi.status==TbskReceiver.ST.OPENING);
            await open_await;
            TEST("Status check",rxi.status==TbskReceiver.ST.IDLE);
            let txi=new tbsk.TbskTransmitter(new tbsk.XPskSinTone(10,10));
            await txi.open(rxi.audioContext);
            console.log("受信テスト.");
            {
                TEST("Status check",rxi.status==TbskReceiver.ST.IDLE);
                let rx=rxi.rx(
                    ()=>{console.log("RX: onstart");},
                    (d)=>{console.log("RX: ondata "+d);},
                    ()=>{console.log("RX: onclose")},)
                TEST("Status check",rxi.status==TbskReceiver.ST.RECVING);
                await txi.tx("HELLLLLO");
                await rx;
                TEST("Status check",rxi.status==TbskReceiver.ST.IDLE);
            }
            console.log("受信中断テスト.");
            {
                TEST("Status check",rxi.status==TbskReceiver.ST.IDLE);
                let rx=rxi.rx(
                    ()=>{console.log("RX: onstart");},
                    (d)=>{console.log("RX: ondata "+d);},
                    ()=>{console.log("RX: onclose")},)
                TEST("Status check",rxi.status==TbskReceiver.ST.RECVING);
                await txi.tx("HELLLLLO");
                await sleep(10);
                let rxb=rxi.rxBreak();
                TEST("Status check",rxi.status==TbskReceiver.ST.BREAKING);
                let rxb2=rxi.rxBreak();
                TEST("Status check",rxi.status==TbskReceiver.ST.BREAKING);
                rx.then(()=>{console.log("rx:done")});
                rxb.then(()=>{console.log("rxb:done")});
                rxb2.then(()=>{console.log("rxb2:done")});



                await rxb;
                TEST("Status check",rxi.status==TbskReceiver.ST.IDLE);
                await rx;
                TEST("Status check",rxi.status==TbskReceiver.ST.IDLE);
                await rxb2;
                TEST("Status check",rxi.status==TbskReceiver.ST.IDLE);
                
            }
            txi.close();
            let rxc=rxi.close();
            console.log(rxi.status);
            TEST("Status check",rxi.status==TbskReceiver.ST.CLOSING);
            await rxc;
            TEST("Status check",rxi.status==TbskReceiver.ST.CLOSED);
            //setInterval(()=>{console.log(modem.rms)},1000);

        }
        try{
            fn();
        }catch(e){
            console.log(e);
        }
    })*/

    $("#test4").on("click",()=>{
        async function fn(){

/*

            class LogUl{
                constructor(tag){
                    this.tag=tag;
                    this.row=undefined;
                }
                add(){
                    this.row=$("<li/>");
                    this.tag.append(this.row);
                    return this;
                }
                text(t,append=true){
                    this.row.html((append?this.row.html():"")+t);
                    return this;
                }
            }
        
            let chat=new tbsk.misc.EasyChat();
            let log=new LogUl($("#chat_log"));
            await chat.open();

            async function recvTask(){
                console.log("recv!");
                await chat.recv({
                    onStart:()=>{log.add().text("RX: start");},
                    onSignal:()=>{log.add().text("RX signal");log.add();},
                    onUpdate:(d)=>{log.text(d);},
                    onSignalLost:()=>{log.add().text("RX lost");},
                    onEnd:()=>{log.add().text("RX: end");}
                });
                console.log("/recv!");
            }
            Promise.resolve().then(()=>{return recvTask();})
//            await recvTask();
            console.log("next!");
            $("#tx_button").on("click",()=>{chat.send($("#chat_input").val())});
            $("#txb_button").on("click",()=>{chat.sendBreak()});
            $("#rxb_button").on("click",()=>{chat.recvBreak()});

            */
        }
        fn();
    });
    


    
    

});
