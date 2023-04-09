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


export class CountUpConverter extends IPacketConverter
{
    constructor(){
        super("CountUpDecoder");
    }
    reset(){}
    convert(data){
        console.log("CALLED");
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

const jQuery = require("jquery");
/**
 * @param {TBSKmodemJS} tbsk 
 */
export function test4_recv(tbsk)
{
    async function fn(){
        let ttx=new tbsk.TbskTransmitter(new tbsk.XPskSinTone(10,10));
        await ttx.open(new AudioContext());
        


        if(true){
            let lc=0;
            let cc=new CheckPoint("bin値を送る").info();
            cc.step(0);
            let chat=new tbsk.misc.TbskSocket({encoding:"bin"});
            cc.step(1);
            chat.addEventListener("open",           ()=>{cc.step(3);});
            chat.addEventListener("sendstart",      ()=>{cc.step();});
            chat.addEventListener("sendcompleted",   ()=>{cc.step();});
            chat.addEventListener("detected",       ()=>{cc.step(4);});
            chat.addEventListener("message",        (e)=>{console.log(e.id,e.data)});
            chat.addEventListener("lost",           ()=>{cc.step(5);});
            chat.addEventListener("close",          ()=>{cc.step(6);});
            chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
            cc.step(2);
            await chat.waitOpenAS();
            await ttx.tx("ABCD");
            chat.close();
            await chat.waitCloseAS();
            cc.complete(6);
        }
        if(true){
            let lc=0;
            let cc=new CheckPoint("bin値を送る").info();
            cc.step(0);
            let chat=new tbsk.misc.TbskSocket({encoding:"utf8"});
            cc.step(1);
            chat.addEventListener("open",           ()=>{cc.step(3);});
            chat.addEventListener("sendstart",      ()=>{cc.step();});
            chat.addEventListener("sendcompleted",   ()=>{cc.step();});
            chat.addEventListener("detected",       ()=>{cc.step();});
            chat.addEventListener("message",        (e)=>{console.log(e.id,e.data)});
            chat.addEventListener("lost",           ()=>{cc.step();});
            chat.addEventListener("close",          ()=>{cc.step(4);});
            chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
            cc.step(2);
            await chat.waitOpenAS();
            await ttx.tx("ABCD");
            await sleep(500);
            await ttx.tx("EFGH");
            await sleep(500);

            chat.close();
            await chat.waitCloseAS();
            cc.complete(4);
        }
        if(true){
            let lc=0;
            let cc=new CheckPoint("codecを設定して送信").info();
            cc.step(0);
            let chat=new tbsk.misc.TbskSocket({encoding:"utf8",packet:{decoder:new CountUpConverter()}});
            chat.addEventListener("open",           ()=>{cc.step();});
            chat.addEventListener("sendstart",      ()=>{cc.step();});
            chat.addEventListener("sendcompleted",   ()=>{cc.step();});
            chat.addEventListener("detected",       ()=>{cc.step();});
            chat.addEventListener("message",        (e)=>{console.log(e.id,e.data)});
            chat.addEventListener("lost",           ()=>{cc.step();});
            chat.addEventListener("close",          ()=>{cc.step();});
            chat.addEventListener("error",()=>{console.log("EVENT:ERROR");});
            await chat.waitOpenAS();
            await ttx.tx("ABCD");
            await sleep(500);
            await ttx.tx("EFGH");
            await sleep(500);

            chat.close();
            await chat.waitCloseAS();
            cc.complete(0);
        }



        console.log("END!");

    }
        

    try{
        fn();
    }catch(e){
        console.log(e);
    }


}


