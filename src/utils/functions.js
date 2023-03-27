// @ts-check
export function TBSK_ASSERT(e,message){if(!e){console.error("ASSERT");throw new Error("ASSERT!");}}
export function set_default(a, v) { return (a === undefined || a === null) ? v : a; }
/**
 * msだけ遅延してcallbackを呼び出します。
 * @param {*} ms 
 * @param {*|Promise} callback 
 * @returns 
 */
export async function sleep(ms,callback=undefined){
    return new Promise((resolve)=>{
        setTimeout(()=>{
            resolve(true);
            if(callback instanceof Promise){
                async function f(){ await callback;}
                f();
            }
            if(callback){
                callback();
            }
        },ms);
    });
}
