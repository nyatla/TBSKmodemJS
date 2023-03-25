// @ts-check
export function TBSK_ASSERT(e,message){if(!e){console.error("ASSERT");throw new Error("ASSERT!");}}
export function set_default(a, v) { return (a === undefined || a === null) ? v : a; }
export async function sleep(m){
    return new Promise((resolve)=>{setTimeout(()=>{resolve(true);},m);});
}