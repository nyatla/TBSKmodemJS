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




const jQuery = require("jquery");
/**
 * @param {TBSKmodemJS} tbsk 
 */
export function test4_recv(tbsk)
{
    async function fn(){
        let tone=new tbsk.XPskSinTone(10,10);
        let ttx=new tbsk.TbskTransmitter(tone);
        tone.dispose();
        await ttx.open(new AudioContext());
        /*


        if(true){
            let lc=0;
            console.log("[active instances]",tbsk.wasm._wasm_tbskmodem_PointerHolder_Size());
            let cc=new CheckPoint("bin値を送る").info();
            cc.step(0);
            let chat=new tbsk.misc.TbskSocket({encoding:"bin"});
            console.log("[active instances]",tbsk.wasm._wasm_tbskmodem_PointerHolder_Size());

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
            await sleep(500);
            console.log("[active instances]",tbsk.wasm._wasm_tbskmodem_PointerHolder_Size());
        }
        if(true){
            let lc=0;
            console.log("[active instances]",tbsk.wasm._wasm_tbskmodem_PointerHolder_Size());
            let cc=new CheckPoint("文字列受け取り１").info();
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
        }*/
        if(true){
            let lc=0;
            console.log("[active instances]",tbsk.wasm._wasm_tbskmodem_PointerHolder_Size());
            let cc=new CheckPoint("マルチバイト").info();
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
            await ttx.tx([56,58,57,2,56,58,57,255,88,5,8,0xe3, 0x81, 0x82,0xe3, 0x80, 0x80]);
            await sleep(2000);

            chat.close();
            await chat.waitCloseAS();
            cc.complete(4);
        }


        await ttx.close();
        ttx.dispose();
        await sleep(1000);
        console.log("[active instances]",tbsk.wasm._wasm_tbskmodem_PointerHolder_Size());
        TEST("No active instances",tbsk.wasm._wasm_tbskmodem_PointerHolder_Size()==0);
        console.log("END!");

    }
        

    try{
        fn();
    }catch(e){
        console.log(e);
    }


}


