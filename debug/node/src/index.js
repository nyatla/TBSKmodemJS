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
import { test1 } from "./test1";
import { test2 } from "./test2";
import { test3 } from "./test3";
import { test4_close } from "./test4-close";
import { test4_send } from "./test4-send";
import { test4_cancelsend } from "./test4-cancelsend";




/**
 * 
 */
TBSKmodemJS.load().then((tbsk)=>{
    let $=jQuery;
    $("#test1").on("click",()=>{test1(tbsk)});
    $("#test2").on("click",()=>{test2(tbsk)});
    $("#test3").on("click",()=>{test3(tbsk)});
    $("#test4_close").on("click",()=>{test4_close(tbsk)});
    $("#test4_send").on("click",()=>{test4_send(tbsk)});
    $("#test4_cancelSend").on("click",()=>{test4_cancelsend(tbsk)});
//    $("#test4_cancelRecv").on("click",()=>{test4_cancelrecv(tbsk)});

    
    
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
