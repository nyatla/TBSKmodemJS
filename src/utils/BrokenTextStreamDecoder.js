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
    * バイト値をUTF8文字、又は整数の配列にして返す。
    * マルチバイト文字で複合が完了しない場合はnullを返す。
    * 変換キューが一ぱいになった場合は先頭のバイト値を整数で返す。
    * @param {number|undefined} d
    * @returns {Array.<string|number> | null}
    */
    update(d = undefined) {
        //console.log("in",d)
        let has_input=(d!==undefined);
        let r=[];
        //確定可能なサイズを計算
        while (true) {
            const len = this.test();
            switch (len) {
            case -1:
                r.push(this._a[0]);//1バイト払い出し
                //console.log("A",r,this._len);
                this._shift(1);
                if(has_input){
                    this._push(d);
                    has_input=false;
                    continue;
                }
                break;
            case 0:
                if(has_input){
                    this._push(d);
                    has_input=false;
                    continue;
                }
                if (this._len>0 && d==undefined) {
                    r.push(this._a[0]);
                    //console.log("B",r,this._len);
                    this._shift(1);
                } else {
                    break;
                }
                continue;
            default:
                r.push(this._decode(len));
                //console.log("C",r,this._len);
                this._shift(len);
                if(has_input){
                    this._push(d);
                    has_input=false;
                }
                continue;
            }
            //console.log("out",r);
            return r.length==0?null:r;
        }
    }
}