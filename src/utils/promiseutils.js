// @ts-check



/**
 * Promiseを使った同期クラスです。
 * wait関数で待機すると、releaseが実行されるまでブロックします。
 */
export class PromiseLock{
    constructor()
    {
        this._resolver=undefined;
        let _t=this;
        this._p=new Promise((resolve)=>{_t._resolver=resolve})
    }
    /**
     * releaseが呼ばれるまで待機する。
     * 複数回呼び出し多場合、全てのプロセスをブロックします。
     */
    async wait()
    {
        await this._p;
    }
    /**
     * 状態を初期化します。
     * wait状態のロックは全てリリースされ、新しいPromiseにロックします。
     */
    reset(){
        this._resolver();
        let _t=this;
        this._p=new Promise((resolve)=>{_t._resolver=resolve;})
    }

    /**
     * waitのasync待機を解除する。
     */
    release(){
        this._resolver();
    }
}


/**
 * 投入した関数を非同期に順番に実行するためのスケジューラです。
 */
export class PromiseSequenceRunner
{
    constructor(){
        this._q=[];
    }
    /**
     * @async
     * 投入した順番で関数を非同期に実行します。
     * @param {Promise|any} func
     * @return
     * funcがPromiseの場合、resolveされた値がかえります。
     * funcが関数の場合、戻り値が返ります。
     */
    async execute(func){
        let resolver;
        let co=new Promise((resolve,reject)=>{
            resolver={resolve:resolve,reject:reject};
        });
        //新しいリゾルバをキューに積む
        this._q.push(resolver);
        if(this._q.length==1){
            this._q[0].resolve();
        }
        let q=this._q;
        //funcが実行されるまで待機
        return await co.then(
            async ()=>{
                q.shift();
                let ret;
                try{
                    if(func instanceof Promise){
                        ret= await func;
                    }else{
                        ret=func();
                    }
                    if(q.length>0){
                        q[0].resolve();
                    }    
                }catch(e){
                    if(q.length>0){
                        q[0].reject();
                    }
                }
                return ret;
            }
        );
    }
}

/**
 * Promiseを使ったスレッドの基本クラスです。
 * runとinterruptを実装し,start関数で開始します。
 * 
 */
export class PromiseThread{
    static ST={
        IDLE:0,
        RUNNING:1,
        TERMINATED:3
    }
    constructor()
    {
        let ST=PromiseThread.ST;
        this._st=ST.IDLE;
        /** @type {Promise<void> | undefined}*/
        this._join_lock=undefined;
    }
    async start()
    {
        let ST=PromiseThread.ST;
        if(this._st!=ST.IDLE){
            throw new Error("Invalid status:"+this._st);
        }
        let resolver;
        this._join_lock=new Promise((resolve)=>{resolver=resolve;});
        this._st=ST.RUNNING;
        try{
            return await this.run();
        }finally{
            this._st=ST.TERMINATED;
            //@ts-ignore
            resolver();
        }

    }
    /**
     * 継承クラスでこの関数をオーバライドします。
     * interruptが実行されたら速やかに終了するように実装します。
     */
    async run(){
        throw new Error("Not Implemented!");
    }
    /**
     * 継承クラスでこの関数をオーバライドします。
     * runに終了を通知してください。
     */
    interrupt()
    {
        throw new Error("Not Implemented!");
    }
    /**
     * スレッドのステータスがTERMINATEDになるまで待機します。
     * 同期を保証した場合はinterruptを先に実行してください。
     */
    async join(){
        let ST=PromiseThread.ST;
        switch(this._st){
        case ST.TERMINATED:
            return;
        case ST.RUNNING:
            await this._join_lock;
            return;
        case ST.IDLE:
        default:
            throw new Error("Invalid status:"+this._st);
        }
    }
}


