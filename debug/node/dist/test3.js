//@ts-check

//スタンドアロン版
import { AudioPlayer } from "../../../src/audio/AudioPlayer.js";
import {TBSKmodemJS} from "../../../src/libtbskmodem.js"
import { XPskSinTone } from "../../../src/tbskclasses/TbskTone.js";
import { TbskTransmitter } from "../../../src/tbskclasses/TbskTransmitter";
import { TbskReceiver } from "../../../src/tbskclasses/TbskReceiver";

import { TbskException } from "../../../src/utils/classes.js";
import { sleep } from "../../../src/utils/functions.js";
import {TEST,CheckPoint} from "./header"

const jQuery = require("jquery");



export function test3(tbsk)
{

    async function fn()
    {
        const ST=TbskReceiver.ST;
        {
            let tone=new tbsk.XPskSinTone(10,10);
            let rxi=new tbsk.TbskReceiver(tone);
            TEST("Status check",rxi.status==ST.CLOSED);
            let open_await=rxi.open(16000);
            TEST("Status check",rxi.status==ST.OPENING);
            await open_await;
            TEST("Status check",rxi.status==ST.IDLE);
            let txi=new tbsk.TbskTransmitter(tone);
            await txi.open(rxi.audioContext);
            if(true){
                console.log("受信テスト.");
                console.log("[active instances]",tbsk.wasm._wasm_tbskmodem_PointerHolder_Size());//4
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
            if(true){
                console.log("受信中断テスト.");
                console.log("[active instances]",tbsk.wasm._wasm_tbskmodem_PointerHolder_Size());//4
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
            if(true){
                console.log("受信中断テスト(コールバックないから)");
                console.log("[active instances]",tbsk.wasm._wasm_tbskmodem_PointerHolder_Size());//4
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
            rxi.dispose();
            txi.dispose();
            tone.dispose();
            await sleep(500);
            console.log("[active instances]",tbsk.wasm._wasm_tbskmodem_PointerHolder_Size());
            TEST("No active instances",tbsk.wasm._wasm_tbskmodem_PointerHolder_Size()==0);

        }
        if(true){
            console.log("突然のclose")
            console.log("[active instances]",tbsk.wasm._wasm_tbskmodem_PointerHolder_Size());            
            let tone=new tbsk.XPskSinTone(10,10);
            let rxi=new tbsk.TbskReceiver(tone);
            TEST("Status check",rxi.status==ST.CLOSED);
            let open_await=rxi.open(16000);
            TEST("Status check",rxi.status==ST.OPENING);
            await open_await;
            TEST("Status check",rxi.status==ST.IDLE);
            let txi=new tbsk.TbskTransmitter(tone);
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
            rxi.dispose();
            txi.dispose();
            tone.dispose();
            await sleep(500);
            console.log("[active instances]",tbsk.wasm._wasm_tbskmodem_PointerHolder_Size());
            TEST("No active instances",tbsk.wasm._wasm_tbskmodem_PointerHolder_Size()==0);
        }
        if(true){
            let tone=new tbsk.XPskSinTone(10,10);
            console.log("突然のclose(コールバックから)")
            let rxi=new tbsk.TbskReceiver(tone);
            TEST("Status check",rxi.status==ST.CLOSED);
            let open_await=rxi.open(16000);
            TEST("Status check",rxi.status==ST.OPENING);
            await open_await;
            TEST("Status check",rxi.status==ST.IDLE);
            let txi=new tbsk.TbskTransmitter(tone);
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
            tone.dispose();
            rxi.dispose();
            txi.dispose();
        }
        await sleep(500);        
        console.log("[active instances]",tbsk.wasm._wasm_tbskmodem_PointerHolder_Size());
        TEST("No active instances",tbsk.wasm._wasm_tbskmodem_PointerHolder_Size()==0);
        console.log("終");


    }



    try{
        fn();
    }catch(e){
        console.log(e);
    }
}


