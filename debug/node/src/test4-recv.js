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
export function test4_recv(tbsk)
{
    async function fn(){
        let ttx=new tbsk.TbskTransmitter(new tbsk.XPskSinTone(10,10));
        await ttx.open(new AudioContext());
        


        if(true){
            let lc=0;
            let cc=new CheckPoint("bin値を送る").info();
            cc.step(0);
            let chat=new tbsk.misc.EasyChat({decoder:"bin"});
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
            let chat=new tbsk.misc.EasyChat({decoder:"utf8"});
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

    }
        

    try{
        fn();
    }catch(e){
        console.log(e);
    }


}


