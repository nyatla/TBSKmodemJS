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




export function test2(tbsk)
{
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
}

