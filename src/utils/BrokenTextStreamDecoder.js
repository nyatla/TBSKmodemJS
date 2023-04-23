// @ts-check

/**
 * Checked by ChatGPT
 */
export class BrokenTextStreamDecoder{
    static MAX_CHARACTER_BYTES = 8;
    constructor(encoding = "utf-8") {
        this._decoder = new TextDecoder(encoding,{ fatal: true });
        this._a = new Uint8Array(BrokenTextStreamDecoder.MAX_CHARACTER_BYTES);
        this._len = 0;
    }
    _decode(length) {
        try {
            const bb = this._a.slice(0, length);
            const decoded = this._decoder.decode(bb);
            return decoded.charAt(0);
        } catch (e) {
            return null;
        }
    }
    _push(v) {
        if (this._len >= this._a.length) {
            throw RangeError();
        }
        this._a[this._len] = v;
        this._len++;
    }
    /**
     * キューを左シフトする。
     * @param {*} size 
     */
    _shift(size) {
        const a = this._a;
        for (let i = size; i < a.length; i++) {
            a[i - size] = a[i];
        }
        this._len -= size;
        return;
    }
    get pending(){
        return this._a.slice(0,this._len);

    }
    /**
    * 現在のキャッシュの文字として確定可能なバイト数を返す。
    * @param {Number} d 
    * @returns
    * -1 先頭1文字をアンダーフローする必要がある
    * 0  確定しない
    * 1> N文字が確定した。 
    */
    test() {
        //キューの内容を順番にチェックしてみる
        for (let i = 1; i <= this._len; i++) {
            const r = this._decode(i);
            if (r !== null) {
                return i;
            }
        }
        if (this._len >= this._a.length) {
            return -1;
        }
        return 0;
    }
    /**
    * バイト値を加えて文字が確定したら返す。
    * 復号できない場合はそのバイト値をそのまま返す
    * @param {int} d
    * @returns {string|number|null}
    */
    update(d = undefined) {
        //確定可能なサイズを計算
        for (let i = 0; i < 2; i++) {
            const len = this.test();
            switch (len) {
                case -1:
                    let r1 = this._a[0];
                    this._shift(1);
                    if(i==0 && d!==undefined){
                        this._push(d);
                    }
                    return r1;//number
                case 0:
                    if(i==0 && d !== undefined){
                        this._push(d);
                        continue;
                    }
                    if (this._len>0 && d===undefined) {
                        let r1 = this._a[0];
                        this._shift(1);
                        return r1;//number
                    } else {
                        return null;
                    }
                default:
                    let r2 = this._decode(len);
                    this._shift(len);
                    if(i==0 && d!==undefined){
                        this._push(d);
                    }
                    return r2;//string
            }
        }
    }
}