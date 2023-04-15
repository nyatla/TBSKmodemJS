//@ts-check

//スタンドアロン版
import { AudioPlayer } from "../../../src/audio/AudioPlayer.js";
import {TBSKmodemJS} from "../../../src/libtbskmodem.js"
import { XPskSinTone } from "../../../src/tbskclasses/TbskTone.js";
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

class CheckPoint{
    constructor(name){
        this._name=name;
        this._step=0;
    }
    info(){
        console.log("[INFO] CheckPoint "+this._name);
        return this;
    }
    step(v,message){
        if(v===undefined){
            return;//ignode
        }
        let m=message===undefined?"":"("+message+")";
        if(v!=this._step){
            throw new Error("[ NG ] Invalid step:"+v+" correct:"+this._step+m);
        }
        console.log("[ OK ] step:"+this._step+m);
        this._step++;
    }
    catchException(f){
        try{
            f();
            console.error("[ NG ] No exception has occurred.");
        }catch(e){
            console.log("[ OK ] Exception has occurred.");
        }
    }
    deadend(){
        console.error("[ NG ] dead end.");
        throw new Error();
    }
    complete(l){
        if(l==this._step-1){
            console.log("[PASS] Complete :"+l);
        }else{
            console.error("[INFO] unreached :"+l+"!="+this._step);
        }
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
    })

    
    $("#test4").on("click",()=>{
        async function fn(){
            let ttx=new tbsk.TbskTransmitter(new tbsk.XPskSinTone(10,10));
            await ttx.open(new AudioContext());
            
            //
            //  closeのテスト
            //
            /*
            if(true){
                let cc=new CheckPoint("open後にすぐにcloseする。").info();
                cc.step(0);
                let chat=new tbsk.misc.EasyChat();
                cc.step(1);
                chat.addEventListener("open",           ()=>{cc.step(4);});
                chat.addEventListener("sendstart",      ()=>{cc.step();});
                chat.addEventListener("sendcomplete",   ()=>{cc.step();});
                chat.addEventListener("detected",       ()=>{cc.step();});
                chat.addEventListener("message",        ()=>{cc.step();});
                chat.addEventListener("lost",           ()=>{cc.step();});
                chat.addEventListener("close",          ()=>{cc.step(5);});
                chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
                cc.step(2);
                chat.close();
                cc.step(3);
                await new Promise((resolve)=>{chat.addEventListener("close",()=>{resolve(true);})});//終了待ち
                cc.complete(5);
            }            
            if(true){
                let cc=new CheckPoint("openをした後でcloseする。").info();
                cc.step(0);
                let chat=new tbsk.misc.EasyChat();
                cc.step(1);
                chat.addEventListener("open",           ()=>{cc.step(3);});
                chat.addEventListener("sendstart",      ()=>{cc.step();});
                chat.addEventListener("sendcomplete",   ()=>{cc.step();});
                chat.addEventListener("detected",       ()=>{cc.step();});
                chat.addEventListener("message",        ()=>{cc.step();});
                chat.addEventListener("lost",           ()=>{cc.step();});
                chat.addEventListener("close",          ()=>{cc.step(5);});
                chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
                cc.step(2);
                await new Promise((resolve)=>{chat.addEventListener("open",()=>{resolve(true);})});//終了待ち
                chat.close();
                cc.step(4);
                await new Promise((resolve)=>{chat.addEventListener("close",()=>{resolve(true);})});//終了待ち
                cc.complete(5);
            }
            if(true){
                let cc=new CheckPoint("openイベントの中でcloseする").info();
                cc.step(0);
                let chat=new tbsk.misc.EasyChat();
                cc.step(1);
                chat.addEventListener("open",           ()=>{cc.step(3);chat.close();});
                chat.addEventListener("sendstart",      ()=>{cc.step();});
                chat.addEventListener("sendcomplete",   ()=>{cc.step();});
                chat.addEventListener("detected",       ()=>{cc.step();});
                chat.addEventListener("message",        ()=>{cc.step();});
                chat.addEventListener("lost",           ()=>{cc.step();});
                chat.addEventListener("close",          ()=>{cc.step(5);});
                chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
                cc.step(2);
                await new Promise((resolve)=>{chat.addEventListener("open",()=>{resolve(true);})});//終了待ち
                chat.close();
                cc.step(4);
                await new Promise((resolve)=>{chat.addEventListener("close",()=>{resolve(true);})});//終了待ち
                cc.complete(5);
            }
            if(true){
                let cc=new CheckPoint("closeイベントの中でcloseする").info();
                cc.step(0);
                let chat=new tbsk.misc.EasyChat();
                cc.step(1);
                chat.addEventListener("open",           ()=>{cc.step(3);});
                chat.addEventListener("sendstart",      ()=>{cc.step();});
                chat.addEventListener("sendcomplete",   ()=>{cc.step();});
                chat.addEventListener("detected",       ()=>{cc.step();});
                chat.addEventListener("message",        ()=>{cc.step();});
                chat.addEventListener("lost",           ()=>{cc.step();});
                chat.addEventListener("close",          ()=>{chat.close();cc.step(5);});
                chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
                cc.step(2);
                await new Promise((resolve)=>{chat.addEventListener("open",()=>{resolve(true);})});//終了待ち
                chat.close();
                cc.step(4);
                await new Promise((resolve)=>{chat.addEventListener("close",()=>{resolve(true);})});//終了待ち
                cc.complete(5);
            }    
            if(true){
                let cc=new CheckPoint("sendstartイベントの中でcloseする").info();
                let STEP=(p,m)=>{cc.step(p,m);}
                STEP(0);
                let chat=new tbsk.misc.EasyChat();
                STEP(1);
                chat.addEventListener("open",           ()=>{STEP(3);});
                chat.addEventListener("sendstart",      ()=>{STEP(5,"IN");chat.close();});
                chat.addEventListener("sendcompleted",  ()=>{STEP(6);});
                chat.addEventListener("detected",       ()=>{STEP();});
                chat.addEventListener("message",        ()=>{STEP();});
                chat.addEventListener("lost",           ()=>{STEP();});
                chat.addEventListener("close",          ()=>{STEP(8);});
                chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
                STEP(2);
                await new Promise((resolve)=>{chat.addEventListener("open",()=>{resolve(true);})});//終了待ち
                STEP(4);
                chat.send("HELLO");
                await new Promise((resolve)=>{chat.addEventListener("sendcompleted",()=>{resolve(true);})});//終了待ち
                STEP(7);
                await new Promise((resolve)=>{chat.addEventListener("close",()=>{resolve(true);})});//終了待ち
                cc.complete(8);
            }
            if(true){
                let cc=new CheckPoint("sendcompletedイベントの中でcloseする").info();
                cc.step(0);
                let chat=new tbsk.misc.EasyChat();
                cc.step(1);
                chat.addEventListener("open",           ()=>{cc.step(3);});
                chat.addEventListener("sendstart",      ()=>{cc.step(5);});
                chat.addEventListener("sendcompleted",  ()=>{cc.step(6);chat.close();});
                chat.addEventListener("detected",       ()=>{cc.step();});
                chat.addEventListener("message",        ()=>{cc.step();});
                chat.addEventListener("lost",           ()=>{cc.step();});
                chat.addEventListener("close",          ()=>{cc.step(8);});
                chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
                cc.step(2);
                await new Promise((resolve)=>{chat.addEventListener("open",()=>{resolve(true);})});//終了待ち
                cc.step(4);
                chat.send("HELLO");
                await new Promise((resolve)=>{chat.addEventListener("sendcompleted",()=>{resolve(true);})});//終了待ち
                cc.step(7);
                await new Promise((resolve)=>{chat.addEventListener("close",()=>{resolve(true);})});//終了待ち
                cc.complete(8);
            }            
            if(true){
                let cc=new CheckPoint("detectedイベントの中でcloseする").info();
                cc.step(0);
                let chat=new tbsk.misc.EasyChat();
                chat.addEventListener("open",           ()=>{cc.step(2);});
                chat.addEventListener("sendstart",      ()=>{cc.step();});
                chat.addEventListener("sendcompleted",  ()=>{cc.step();});
                chat.addEventListener("detected",       ()=>{cc.step(4);chat.close();});
                chat.addEventListener("message",        ()=>{cc.deadend();});
                chat.addEventListener("lost",           ()=>{cc.step(5);});
                chat.addEventListener("close",          ()=>{cc.step(6);});
                chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
                cc.step(1);
                await new Promise((resolve)=>{chat.addEventListener("open",()=>{resolve(true);})});//終了待ち
                cc.step(3);
                await ttx.tx("TESTTEST");
                await chat.waitCloseAS();
                cc.complete(6);
            }
            if(true){
                let cc=new CheckPoint("messageイベントの中でcloseする").info();
                cc.step(0);
                let chat=new tbsk.misc.EasyChat();
                chat.addEventListener("open",           ()=>{cc.step(2);});
                chat.addEventListener("sendstart",      ()=>{cc.step();});
                chat.addEventListener("sendcompleted",  ()=>{cc.step();});
                chat.addEventListener("detected",       ()=>{cc.step(4);});
                chat.addEventListener("message",        ()=>{cc.step(5);chat.close();});
                chat.addEventListener("lost",           ()=>{cc.step(6);});
                chat.addEventListener("close",          ()=>{cc.step(7);});
                chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
                cc.step(1);
                await new Promise((resolve)=>{chat.addEventListener("open",()=>{resolve(true);})});//終了待ち
                cc.step(3);
                await ttx.tx("TESTTEST");
                await chat.waitCloseAS();
                cc.complete(7);
            }
            if(true){
                let cc=new CheckPoint("closeイベントの中でcloseする").info();
                cc.step(0);
                let rcv="";
                let chat=new tbsk.misc.EasyChat();
                chat.addEventListener("open",           ()=>{cc.step(2);});
                chat.addEventListener("sendstart",      ()=>{cc.step();});
                chat.addEventListener("sendcompleted",  ()=>{cc.step();});
                chat.addEventListener("detected",       ()=>{cc.step(4);});
                chat.addEventListener("message",        (v)=>{console.log(v)});
                chat.addEventListener("lost",           ()=>{cc.step(5);});
                chat.addEventListener("close",          ()=>{cc.step(6);chat.close();});
                chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
                cc.step(1);
                await new Promise((resolve)=>{chat.addEventListener("open",()=>{resolve(true);})});//終了待ち
                cc.step(3);
                await sleep(500);
                await ttx.tx("TESTTEST");
                chat.close();
                await chat.waitCloseAS();
                cc.complete(6);
            }
            */
            //
            //  sendのテスト
            //
            /*
            if(true){
                let cc=new CheckPoint("open後にすぐにsendする。").info();
                cc.step(0);
                let chat=new tbsk.misc.EasyChat();
                cc.step(1);
                chat.addEventListener("open",           ()=>{cc.step(3);});
                chat.addEventListener("sendstart",      ()=>{cc.step();});
                chat.addEventListener("sendcompleted",   ()=>{cc.step();});
                chat.addEventListener("detected",       ()=>{cc.step();});
                chat.addEventListener("message",        ()=>{cc.step();});
                chat.addEventListener("lost",           ()=>{cc.step();});
                chat.addEventListener("close",          ()=>{cc.step(4);});
                chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
                cc.catchException(()=>{chat.send("aaa");});
                cc.step(2);
                chat.close();
                await chat.waitCloseAS();
                cc.complete(4);
            }
            if(true){
                let cc=new CheckPoint("openをした後でsendする。").info();
                cc.step(0);
                let chat=new tbsk.misc.EasyChat();
                cc.step(1);
                chat.addEventListener("open",           ()=>{cc.step(3);});
                chat.addEventListener("sendstart",      ()=>{cc.step(4);});
                chat.addEventListener("sendcompleted",   ()=>{cc.step(5);});
                chat.addEventListener("detected",       ()=>{cc.step();});
                chat.addEventListener("message",        ()=>{cc.step();});
                chat.addEventListener("lost",           ()=>{cc.step();});
                chat.addEventListener("close",          ()=>{cc.step(7);});
                chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
                cc.step(2);
                await chat.waitOpenAS();
                chat.send("aaa");
                await chat.waitSendAS();
                cc.step(6);
                chat.close();
                await chat.waitCloseAS();
                cc.step(8);
                cc.complete(8);
            }
            if(true){
                let cc=new CheckPoint("openイベントの中でsendする。").info();
                cc.step(0);
                let chat=new tbsk.misc.EasyChat();
                cc.step(1);
                chat.addEventListener("open",           ()=>{cc.step(3);chat.send("aaaa");});
                chat.addEventListener("sendstart",      ()=>{cc.step(4);});
                chat.addEventListener("sendcompleted",   ()=>{cc.step(5);});
                chat.addEventListener("detected",       ()=>{cc.step();});
                chat.addEventListener("message",        ()=>{cc.step();});
                chat.addEventListener("lost",           ()=>{cc.step();});
                chat.addEventListener("close",          ()=>{cc.step(6);});
                chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
                cc.step(2);
                await chat.waitOpenAS();
                await chat.waitSendAS();

                chat.close();
                await chat.waitCloseAS();
                cc.step(7);
                cc.complete(7);
            }
            if(true){
                let cc=new CheckPoint("sendstartイベントの中でsendする。").info();
                let c1=0;
                let c2=0;
                cc.step(0);
                let chat=new tbsk.misc.EasyChat();
                cc.step(1);
                chat.addEventListener("open",           ()=>{cc.step(3);});
                chat.addEventListener("sendstart",      ()=>{cc.step([4,6][c1++]);if(c1<2){chat.send("aaaa");}});
                chat.addEventListener("sendcompleted",   ()=>{cc.step([5,7][c2++]);});
                chat.addEventListener("detected",       ()=>{cc.step();});
                chat.addEventListener("message",        ()=>{cc.step();});
                chat.addEventListener("lost",           ()=>{cc.step();});
                chat.addEventListener("close",          ()=>{cc.step(8);});
                chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
                cc.step(2);
                await chat.waitOpenAS();
                chat.send("Bffff");
                await chat.waitSendAS();
                chat.close();
                await chat.waitCloseAS();
                cc.step(9);
                cc.complete(9);
            }
            if(true){
                let cc=new CheckPoint("sendcompletedイベントの中でsendする。").info();
                let c1=0;
                let c2=0;
                cc.step(0);
                let chat=new tbsk.misc.EasyChat();
                cc.step(1);
                chat.addEventListener("open",           ()=>{cc.step(3);});
                chat.addEventListener("sendstart",      ()=>{cc.step([4,6][c1++]);});
                chat.addEventListener("sendcompleted",   ()=>{cc.step([5,7][c2++]);if(c2<2){chat.send("aaaa");}});
                chat.addEventListener("detected",       ()=>{cc.step();});
                chat.addEventListener("message",        ()=>{cc.step();});
                chat.addEventListener("lost",           ()=>{cc.step();});
                chat.addEventListener("close",          ()=>{cc.step(8);});
                chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
                cc.step(2);
                await chat.waitOpenAS();
                chat.send("Bffff");
                await chat.waitSendAS();
                chat.close();
                await chat.waitCloseAS();
                cc.step(9);
                cc.complete(9);
            }
            if(true){
                let cc=new CheckPoint("detectedイベントの中でsendする。").info();
                let c1=0;
                let c2=0;
                cc.step(0);
                let chat=new tbsk.misc.EasyChat();
                cc.step(1);
                chat.addEventListener("open",           ()=>{cc.step(3);});
                chat.addEventListener("sendstart",      ()=>{cc.step(6);});
                chat.addEventListener("sendcompleted",   ()=>{cc.step(7);});
                chat.addEventListener("detected",       ()=>{cc.step(4);chat.send("bbbbbbbbb");});
                chat.addEventListener("message",        ()=>{cc.step();});
                chat.addEventListener("lost",           ()=>{cc.step(5);});
                chat.addEventListener("close",          ()=>{cc.step(8);});
                chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
                cc.step(2);
                await chat.waitOpenAS();
                await ttx.tx("TESTTEST");
                await chat.waitSendAS();
                chat.close();
                await chat.waitCloseAS();
                cc.step(9);
                cc.complete(9);
            }
            if(true){
                let cc=new CheckPoint("messageイベントの中でsendする。").info();
                let c1=0;
                let c2=0;
                cc.step(0);
                let chat=new tbsk.misc.EasyChat();
                cc.step(1);
                chat.addEventListener("open",           ()=>{cc.step(3);});
                chat.addEventListener("sendstart",      ()=>{cc.step(6);});
                chat.addEventListener("sendcompleted",   ()=>{cc.step(7);});
                chat.addEventListener("detected",       ()=>{cc.step();});
                chat.addEventListener("message",        ()=>{cc.step(4);chat.send("bbbbbbbbb");});
                chat.addEventListener("lost",           ()=>{cc.step(5);});
                chat.addEventListener("close",          ()=>{cc.step(8);});
                chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
                cc.step(2);
                await chat.waitOpenAS();
                await ttx.tx("TESTTEST");
                await chat.waitSendAS();
                chat.close();
                await chat.waitCloseAS();
                cc.step(9);
                cc.complete(9);
            }
            if(true){
                let cc=new CheckPoint("lostイベントの中でsendする。").info();
                let c1=0;
                let c2=0;
                cc.step(0);
                let chat=new tbsk.misc.EasyChat();
                cc.step(1);
                chat.addEventListener("open",           ()=>{cc.step(3);});
                chat.addEventListener("sendstart",      ()=>{cc.step(6);});
                chat.addEventListener("sendcompleted",   ()=>{cc.step(7);});
                chat.addEventListener("detected",       ()=>{cc.step(4);});
                chat.addEventListener("message",        ()=>{cc.step();});
                chat.addEventListener("lost",           ()=>{cc.step(5);chat.send("bbbbbbbbb");});
                chat.addEventListener("close",          ()=>{cc.step(8);});
                chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
                cc.step(2);
                await chat.waitOpenAS();
                await ttx.tx("TES");
                await sleep(1000);
                chat.close();
                await chat.waitCloseAS();
                cc.step(9);
                cc.complete(9);
            }
            
            if(true){
                let cc=new CheckPoint("closeイベントの中でsendする。").info();
                let c1=0;
                let c2=0;
                cc.step(0);
                let chat=new tbsk.misc.EasyChat();
                cc.step(1);
                chat.addEventListener("open",           ()=>{cc.step(3);});
                chat.addEventListener("sendstart",      ()=>{cc.step();});
                chat.addEventListener("sendcompleted",   ()=>{cc.step();});
                chat.addEventListener("detected",       ()=>{cc.step(4);});
                chat.addEventListener("message",        ()=>{cc.step();});
                chat.addEventListener("lost",           ()=>{cc.step(5);});
                chat.addEventListener("close",          ()=>{cc.step(6);cc.catchException(()=>{chat.send("bbbbbbbbb");})});
                chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
                cc.step(2);
                await chat.waitOpenAS();
                await ttx.tx("TES");
                await sleep(1000);
                chat.close();
                await chat.waitCloseAS();
                cc.step(7);
                cc.complete(7);
            }
            */




            














        };

        try{
            fn();
        }catch(e){
            console.log(e);
        }


    });

    $("#test5").on("click",()=>{
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
