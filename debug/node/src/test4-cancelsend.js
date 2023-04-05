//@ts-check

//スタンドアロン版
import { AudioPlayer } from "../../../src/audio/AudioPlayer.js";
import {TBSKmodemJS} from "../../../src/libtbskmodem.js"
import { XPskSinTone } from "../../../src/tbskclasses/TbskTone.js";
import { TbskTransmitter } from "../../../src/tbskclasses/TbskTransmitter";
import { TbskReceiver } from "../../../src/tbskclasses/TbskReceiver";
import { EasyChat } from "../../../src/misc/TbskSocket";

import { TbskException } from "../../../src/utils/classes.js";
import { sleep } from "../../../src/utils/functions.js";
import {TEST,CheckPoint} from "./header"

const jQuery = require("jquery");


/**
 * @param {TBSKmodemJS} tbsk 
 */
export function test4_cancelsend(tbsk)
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
            let chat=new tbsk.misc.TbskSocket();
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
            cc.catchException(()=>{chat.cancelSend();});//例外が発生する
            await chat.waitOpenAS();
            cc.step(4);
            await(300);
            chat.close();
            await chat.waitCloseAS();
            cc.complete(5);
        }            
        if(true){
            let cc=new CheckPoint("openをした後でcancelする。").info();
            cc.step(0);
            let chat=new tbsk.misc.TbskSocket();
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
            await chat.waitOpenAS();
            chat.cancelSend();//何も起こらない！
            cc.step(4);
            await sleep(500);
            chat.close();
            await chat.waitCloseAS();
            cc.complete(5);
        }
        if(true){
            let cc=new CheckPoint("openイベントの中でcancelする").info();
            cc.step(0);
            let chat=new tbsk.misc.TbskSocket();
            cc.step(1);
            chat.addEventListener("open",           ()=>{cc.step(3);chat.cancelSend();});//何も起こらない
            chat.addEventListener("sendstart",      ()=>{cc.step();});
            chat.addEventListener("sendcomplete",   ()=>{cc.step();});
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
        if(true){
            let cc=new CheckPoint("closeイベントの中でcancelする").info();
            cc.step(0);
            let chat=new tbsk.misc.TbskSocket();
            cc.step(1);
            chat.addEventListener("open",           ()=>{cc.step(3);});
            chat.addEventListener("sendstart",      ()=>{cc.step();});
            chat.addEventListener("sendcomplete",   ()=>{cc.step();});
            chat.addEventListener("detected",       ()=>{cc.step();});
            chat.addEventListener("message",        ()=>{cc.step();});
            chat.addEventListener("lost",           ()=>{cc.step();});
            chat.addEventListener("close",          ()=>{
                cc.step(5);
                cc.catchException(()=>{chat.cancelSend();});});
            chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
            cc.step(2);
            await chat.waitOpenAS();
            chat.close();
            cc.step(4);
            await sleep(100);
            await chat.waitCloseAS();
            cc.complete(5);
        }
        if(true){
            let cc=new CheckPoint("送信直後にopenをした後でcancelする。").info();
            cc.step(0);
            let chat=new tbsk.misc.TbskSocket();
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
            await chat.waitOpenAS();
            chat.send("aaaaaaaaaa");
            chat.cancelSend();//何も起こらない！
            cc.step(4);
            await sleep(500);
            chat.close();
            await chat.waitCloseAS();
            cc.complete(5);
        }
        if(true){
            let cc=new CheckPoint("送信直後にopenイベントの中でcancelする").info();
            cc.step(0);
            let chat=new tbsk.misc.TbskSocket();
            cc.step(1);
            chat.addEventListener("open",           ()=>{
                cc.step(3);
                chat.send("aaaaaaaaaa");
                chat.cancelSend();
            });//何も起こらない
            chat.addEventListener("sendstart",      ()=>{cc.dontcalled();});
            chat.addEventListener("sendcompleted",   ()=>{cc.dontcalled();});
            chat.addEventListener("detected",       ()=>{cc.dontcalled();});
            chat.addEventListener("message",        ()=>{cc.dontcalled();});
            chat.addEventListener("lost",           ()=>{cc.dontcalled();});
            chat.addEventListener("close",          ()=>{cc.step(5);});
            chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
            cc.step(2);
            await sleep(100);
            chat.close();
            cc.step(4);
            await sleep(100);
            await chat.waitCloseAS();
            cc.complete(5);
        }        
        if(true){
            let cc=new CheckPoint("送信直後にcloseイベントの中でcancelする").info();
            cc.step(0);
            let chat=new tbsk.misc.TbskSocket();
            cc.step(1);
            chat.addEventListener("open",           ()=>{cc.step(3);});
            chat.addEventListener("sendstart",      ()=>{cc.dontcalled();});
            chat.addEventListener("sendcompleted",   ()=>{cc.dontcalled();});
            chat.addEventListener("detected",       ()=>{cc.step();});
            chat.addEventListener("message",        ()=>{cc.step();});
            chat.addEventListener("lost",           ()=>{cc.step();});
            chat.addEventListener("close",          ()=>{cc.step(5);cc.catchException(()=>{chat.cancelSend();})});
            chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
            cc.step(2);
            await chat.waitOpenAS();
            chat.send("aaaaaaaaaa");
            chat.close();
            cc.step(4);
            await sleep(100);
            await chat.waitCloseAS();
            cc.complete(5);
        }
        if(true){
            let cc=new CheckPoint("送信直後にsendstartイベントの中でcancelする").info();
            cc.step(0);
            let chat=new tbsk.misc.TbskSocket();
            cc.step(1);
            chat.addEventListener("open",           ()=>{cc.step(3);});
            chat.addEventListener("sendstart",      ()=>{cc.step(4);chat.cancelSend();});
            chat.addEventListener("sendcompleted",   ()=>{cc.step(5);});
            chat.addEventListener("detected",       ()=>{cc.step();});
            chat.addEventListener("message",        ()=>{cc.step();});
            chat.addEventListener("lost",           ()=>{cc.step();});
            chat.addEventListener("close",          ()=>{cc.step(7);});
            chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
            cc.step(2);
            await chat.waitOpenAS();
            chat.send("aaaaaaaaddddddddddddddddddaa");
            console.log("AAAAA");
            await chat.waitSendAS();
            console.log("BBBB");
            chat.close();
            cc.step(6);
            await sleep(100);
            await chat.waitCloseAS();
            cc.complete(7);
        }
        if(true){
            let cc=new CheckPoint("送信直後にsendcompletedイベントの中でcancelする").info();
            cc.step(0);
            let chat=new tbsk.misc.TbskSocket();
            cc.step(1);
            chat.addEventListener("open",           ()=>{cc.step(3);});
            chat.addEventListener("sendstart",      ()=>{cc.step(4);});
            chat.addEventListener("sendcompleted",   ()=>{cc.step(5);chat.cancelSend();});
            chat.addEventListener("detected",       ()=>{cc.step();});
            chat.addEventListener("message",        ()=>{cc.step();});
            chat.addEventListener("lost",           ()=>{cc.step();});
            chat.addEventListener("close",          ()=>{cc.step(7);});
            chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
            cc.step(2);
            await chat.waitOpenAS();
            chat.send("aaaaaaaaaa");
            await chat.waitSendAS();
            chat.close();
            cc.step(6);
            await sleep(100);
            await chat.waitCloseAS();
            cc.complete(7);
        }
        if(true){
            let lc=0;
            let cc=new CheckPoint("detectedでcancelする").info();
            cc.step(0);
            let chat=new tbsk.misc.TbskSocket();
            cc.step(1);
            chat.addEventListener("open",           ()=>{cc.step(3);});
            chat.addEventListener("sendstart",      ()=>{cc.step();});
            chat.addEventListener("sendcompleted",   ()=>{cc.step();});
            chat.addEventListener("detected",       ()=>{cc.step(4);chat.cancelSend();});
            chat.addEventListener("message",        ()=>{if(lc++==0){cc.step(5);}});
            chat.addEventListener("lost",           ()=>{cc.step(6);});
            chat.addEventListener("close",          ()=>{cc.step(8);});
            chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
            cc.step(2);
            await chat.waitOpenAS();
            await ttx.tx("t");
            await chat.waitSendAS();
            chat.close();
            cc.step(7);
            await sleep(100);
            await chat.waitCloseAS();
            cc.complete(8);
            await sleep(500);
        }
        if(true){
            let lc=0;
            let cc=new CheckPoint("messageでcancelする").info();
            cc.step(0);
            let chat=new tbsk.misc.TbskSocket();
            cc.step(1);
            chat.addEventListener("open",           ()=>{cc.step(3);});
            chat.addEventListener("sendstart",      ()=>{cc.step();});
            chat.addEventListener("sendcompleted",   ()=>{cc.step();});
            chat.addEventListener("detected",       ()=>{cc.step(4);});
            chat.addEventListener("message",        ()=>{if(lc++==0){cc.step(5);chat.cancelSend();}});
            chat.addEventListener("lost",           ()=>{cc.step(6);});
            chat.addEventListener("close",          ()=>{cc.step(8);});
            chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
            cc.step(2);
            await chat.waitOpenAS();
            await ttx.tx("t");
            await chat.waitSendAS();
            chat.close();
            cc.step(7);
            await sleep(100);
            await chat.waitCloseAS();
            cc.complete(8);
        }
        if(true){
            let cc=new CheckPoint("messageでcancelする").info();
            cc.step(0);
            let chat=new tbsk.misc.TbskSocket();
            cc.step(1);
            chat.addEventListener("open",           ()=>{cc.step(3);});
            chat.addEventListener("sendstart",      ()=>{cc.step();});
            chat.addEventListener("sendcompleted",   ()=>{cc.step();});
            chat.addEventListener("detected",       ()=>{cc.step(4);});
            chat.addEventListener("message",        ()=>{cc.step(5);});
            chat.addEventListener("lost",           ()=>{cc.step(6);chat.cancelSend();});
            chat.addEventListener("close",          ()=>{cc.step(8);});
            chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
            cc.step(2);
            await chat.waitOpenAS();
            await ttx.tx("t");
            await chat.waitSendAS();
            chat.close();
            cc.step(7);
            await sleep(100);
            await chat.waitCloseAS();
            cc.complete(8);
        }



    }
        

    try{
        fn();
    }catch(e){
        console.log(e);
    }


}


