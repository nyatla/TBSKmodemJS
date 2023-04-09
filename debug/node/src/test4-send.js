//@ts-check

//スタンドアロン版
import { AudioPlayer } from "../../../src/audio/AudioPlayer.js";
import {TBSKmodemJS} from "../../../src/libtbskmodem.js"
import { XPskSinTone } from "../../../src/tbskclasses/TbskTone.js";
import { TbskTransmitter } from "../../../src/tbskclasses/TbskTransmitter";
import { TbskReceiver } from "../../../src/tbskclasses/TbskReceiver";
import { TbskSocket } from "../../../src/misc/TbskSocket";

import { TbskException } from "../../../src/utils/classes.js";
import { sleep } from "../../../src/utils/functions.js";
import {TEST,CheckPoint} from "./header"
import { IPacketConverter } from "../../../src/utils/packetconverter.js";

const jQuery = require("jquery");


export class CountUpConverter extends IPacketConverter
{
    constructor(){
        super("CountUpDecoder");
    }
    reset(){}
    convert(data){
        if(!data){
            return [];
        }
        let r=[];
        for(let i=0;i<data.length;i++){
            r.push(45+i);
        }
        return r;
    }
}

/**
 * 
 * @param {TBSKmodemJS} tbsk 
 */
export function test4_send(tbsk)
{
    async function fn(){
        let ttx=new tbsk.TbskTransmitter(new tbsk.XPskSinTone(10,10));
        await ttx.open(new AudioContext());

        //
        //  sendのテスト
        //
        if(true){
            let cc=new CheckPoint("open後にすぐにsendする。").info();
            cc.step(0);
            let chat=new tbsk.misc.TbskSocket();
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
            let chat=new tbsk.misc.TbskSocket();
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
            let chat=new tbsk.misc.TbskSocket();
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
            let chat=new tbsk.misc.TbskSocket();
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
            let chat=new tbsk.misc.TbskSocket();
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
            let chat=new tbsk.misc.TbskSocket();
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
            let chat=new tbsk.misc.TbskSocket();
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
            let chat=new tbsk.misc.TbskSocket();
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
            let chat=new tbsk.misc.TbskSocket();
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
        if(true){
            let cc=new CheckPoint("音量調整テスト").info();
            let chat=new tbsk.misc.TbskSocket();
            await chat.waitOpenAS();
            chat.volume=1;
            cc.step(0);
            chat.send("ABCDEFG");
            cc.step(1);
            await chat.waitSendAS();
            cc.step(2);
            chat.volume=0.3;
            chat.send("ABCDEFG");
            cc.step(3);
            await chat.waitSendAS();
            cc.step(4);
            chat.close();
            cc.step(5);
            await chat.waitCloseAS();
            cc.complete(5);
        }
        if(true){
            let cc=new CheckPoint("コーデックテスト(外部で-./0123を受信すればOK)").info();
            let chat=new tbsk.misc.TbskSocket({packet:{encoder:new CountUpConverter()}});
            await chat.waitOpenAS();
            chat.volume=1;
            cc.step(0);
            chat.send("ABCDEFG");
            await chat.waitSendAS();
            chat.close();
            await chat.waitCloseAS();
            cc.complete(0);
        }







        console.log("END!");

    };

    try{
        fn();
    }catch(e){
        console.log(e);
    }


}


