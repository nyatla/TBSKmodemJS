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
import {TEST,CheckPoint} from "./header"

const jQuery = require("jquery");


/**
 * @param {TBSKmodemJS} tbsk 
 */
export function test4(tbsk)
{
    async function fn(){
        let ttx=new tbsk.TbskTransmitter(new tbsk.XPskSinTone(10,10));
        await ttx.open(new AudioContext());
        
        //
        //  cancelSend
        //
        if(true){
            let cc=new CheckPoint("open後にすぐにcancelする。").info();
            cc.step(0);
            let chat=new tbsk.misc.EasyChat();
            cc.step(1);
            chat.addEventListener("open",           ()=>{cc.step(4);});
            chat.addEventListener("sendstart",      ()=>{cc.step();});
            chat.addEventListener("sendcompleted",   ()=>{cc.step();});
            chat.addEventListener("detected",       ()=>{cc.step();});
            chat.addEventListener("message",        ()=>{cc.step();});
            chat.addEventListener("lost",           ()=>{cc.step();});
            chat.addEventListener("close",          ()=>{cc.step(5);});
            chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
            cc.step(2);
            chat.cancelSend();
            cc.step(3);
            await(300);
            chat.close();
            await chat.waitCloseAS();
            cc.complete(5);
        }            
        if(true){
            let cc=new CheckPoint("openをした後でcancelする。").info();
            cc.step(0);
            let chat=new tbsk.misc.EasyChat();
            cc.step(1);
            chat.addEventListener("open",           ()=>{cc.step(3);});
            chat.addEventListener("sendstart",      ()=>{cc.step();});
            chat.addEventListener("sendcompleted",   ()=>{cc.step();});
            chat.addEventListener("detected",       ()=>{cc.step();});
            chat.addEventListener("message",        ()=>{cc.step();});
            chat.addEventListener("lost",           ()=>{cc.step();});
            chat.addEventListener("close",          ()=>{cc.step(5);});
            chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
            cc.step(2);
            await chat.waitOpenAS();
            chat.cancelSend();
            cc.step(4);
            await sleep(500);
            chat.close();
            await chat.waitCloseAS();
            cc.complete(5);
        }
        if(true){
            let cc=new CheckPoint("openイベントの中でcancelする").info();
            cc.step(0);
            let chat=new tbsk.misc.EasyChat();
            cc.step(1);
            chat.addEventListener("open",           ()=>{cc.step(3);chat.cancelSend();});
            chat.addEventListener("sendstart",      ()=>{cc.step();});
            chat.addEventListener("sendcompleted",   ()=>{cc.step();});
            chat.addEventListener("detected",       ()=>{cc.step();});
            chat.addEventListener("message",        ()=>{cc.step();});
            chat.addEventListener("lost",           ()=>{cc.step();});
            chat.addEventListener("close",          ()=>{cc.step(5);});
            chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
            cc.step(2);
            await chat.waitOpenAS();
            chat.close();
            cc.step(4);
            await sleep(100);
            await chat.waitCloseAS();
            cc.complete(5);
        }
        // if(true){
        //     let cc=new CheckPoint("closeイベントの中でcloseする").info();
        //     cc.step(0);
        //     let chat=new tbsk.misc.EasyChat();
        //     cc.step(1);
        //     chat.addEventListener("open",           ()=>{cc.step(3);});
        //     chat.addEventListener("sendstart",      ()=>{cc.step();});
        //     chat.addEventListener("sendcompleted",   ()=>{cc.step();});
        //     chat.addEventListener("detected",       ()=>{cc.step();});
        //     chat.addEventListener("message",        ()=>{cc.step();});
        //     chat.addEventListener("lost",           ()=>{cc.step();});
        //     chat.addEventListener("close",          ()=>{chat.close();cc.step(5);});
        //     chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
        //     cc.step(2);
        //     await new Promise((resolve)=>{chat.addEventListener("open",()=>{resolve(true);})});//終了待ち
        //     chat.close();
        //     cc.step(4);
        //     await new Promise((resolve)=>{chat.addEventListener("close",()=>{resolve(true);})});//終了待ち
        //     cc.complete(5);
        // }    
        // if(true){
        //     let cc=new CheckPoint("sendstartイベントの中でcloseする").info();
        //     let STEP=(p,m)=>{cc.step(p,m);}
        //     STEP(0);
        //     let chat=new tbsk.misc.EasyChat();
        //     STEP(1);
        //     chat.addEventListener("open",           ()=>{STEP(3);});
        //     chat.addEventListener("sendstart",      ()=>{STEP(5,"IN");chat.close();});
        //     chat.addEventListener("sendcompleted",  ()=>{STEP(6);});
        //     chat.addEventListener("detected",       ()=>{STEP();});
        //     chat.addEventListener("message",        ()=>{STEP();});
        //     chat.addEventListener("lost",           ()=>{STEP();});
        //     chat.addEventListener("close",          ()=>{STEP(8);});
        //     chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
        //     STEP(2);
        //     await new Promise((resolve)=>{chat.addEventListener("open",()=>{resolve(true);})});//終了待ち
        //     STEP(4);
        //     chat.send("HELLO");
        //     await new Promise((resolve)=>{chat.addEventListener("sendcompleted",()=>{resolve(true);})});//終了待ち
        //     STEP(7);
        //     await new Promise((resolve)=>{chat.addEventListener("close",()=>{resolve(true);})});//終了待ち
        //     cc.complete(8);
        // }
        // if(true){
        //     let cc=new CheckPoint("sendcompletedイベントの中でcloseする").info();
        //     cc.step(0);
        //     let chat=new tbsk.misc.EasyChat();
        //     cc.step(1);
        //     chat.addEventListener("open",           ()=>{cc.step(3);});
        //     chat.addEventListener("sendstart",      ()=>{cc.step(5);});
        //     chat.addEventListener("sendcompleted",  ()=>{cc.step(6);chat.close();});
        //     chat.addEventListener("detected",       ()=>{cc.step();});
        //     chat.addEventListener("message",        ()=>{cc.step();});
        //     chat.addEventListener("lost",           ()=>{cc.step();});
        //     chat.addEventListener("close",          ()=>{cc.step(8);});
        //     chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
        //     cc.step(2);
        //     await new Promise((resolve)=>{chat.addEventListener("open",()=>{resolve(true);})});//終了待ち
        //     cc.step(4);
        //     chat.send("HELLO");
        //     await new Promise((resolve)=>{chat.addEventListener("sendcompleted",()=>{resolve(true);})});//終了待ち
        //     cc.step(7);
        //     await new Promise((resolve)=>{chat.addEventListener("close",()=>{resolve(true);})});//終了待ち
        //     cc.complete(8);
        // }            
        // if(true){
        //     let cc=new CheckPoint("detectedイベントの中でcloseする").info();
        //     cc.step(0);
        //     let chat=new tbsk.misc.EasyChat();
        //     chat.addEventListener("open",           ()=>{cc.step(2);});
        //     chat.addEventListener("sendstart",      ()=>{cc.step();});
        //     chat.addEventListener("sendcompleted",  ()=>{cc.step();});
        //     chat.addEventListener("detected",       ()=>{cc.step(4);chat.close();});
        //     chat.addEventListener("message",        ()=>{cc.deadend();});
        //     chat.addEventListener("lost",           ()=>{cc.step(5);});
        //     chat.addEventListener("close",          ()=>{cc.step(6);});
        //     chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
        //     cc.step(1);
        //     await new Promise((resolve)=>{chat.addEventListener("open",()=>{resolve(true);})});//終了待ち
        //     cc.step(3);
        //     await ttx.tx("TESTTEST");
        //     await chat.waitCloseAS();
        //     cc.complete(6);
        // }
        // if(true){
        //     let cc=new CheckPoint("messageイベントの中でcloseする").info();
        //     cc.step(0);
        //     let chat=new tbsk.misc.EasyChat();
        //     chat.addEventListener("open",           ()=>{cc.step(2);});
        //     chat.addEventListener("sendstart",      ()=>{cc.step();});
        //     chat.addEventListener("sendcompleted",  ()=>{cc.step();});
        //     chat.addEventListener("detected",       ()=>{cc.step(4);});
        //     chat.addEventListener("message",        ()=>{cc.step(5);chat.close();});
        //     chat.addEventListener("lost",           ()=>{cc.step(6);});
        //     chat.addEventListener("close",          ()=>{cc.step(7);});
        //     chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
        //     cc.step(1);
        //     await new Promise((resolve)=>{chat.addEventListener("open",()=>{resolve(true);})});//終了待ち
        //     cc.step(3);
        //     await ttx.tx("TESTTEST");
        //     await chat.waitCloseAS();
        //     cc.complete(7);
        // }
        // if(true){
        //     let cc=new CheckPoint("closeイベントの中でcloseする").info();
        //     cc.step(0);
        //     let rcv="";
        //     let chat=new tbsk.misc.EasyChat();
        //     chat.addEventListener("open",           ()=>{cc.step(2);});
        //     chat.addEventListener("sendstart",      ()=>{cc.step();});
        //     chat.addEventListener("sendcompleted",  ()=>{cc.step();});
        //     chat.addEventListener("detected",       ()=>{cc.step(4);});
        //     chat.addEventListener("message",        (v)=>{console.log(v)});
        //     chat.addEventListener("lost",           ()=>{cc.step(5);});
        //     chat.addEventListener("close",          ()=>{cc.step(6);chat.close();});
        //     chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
        //     cc.step(1);
        //     await new Promise((resolve)=>{chat.addEventListener("open",()=>{resolve(true);})});//終了待ち
        //     cc.step(3);
        //     await sleep(500);
        //     await ttx.tx("TESTTEST");
        //     chat.close();
        //     await chat.waitCloseAS();
        //     cc.complete(6);
        }
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

        

    try{
        fn();
    }catch(e){
        console.log(e);
    }


}


