/**
 * Transrated by chatGPT
 */
export class BrokenTextStreamDecoder {
    static MAX_CHARACTOR_BYTES = 8;

    constructor(encoding="utf-8") {
        this._decoder = new TextDecoder(encoding);
        this._a = new Uint8Array(BrokenTextStreamDecoder.MAX_CHARACTOR_BYTES);
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

    shift(size) {
        if (size <= 0) {
            return;
        }
        if (this._len === 0) {
            return;
        }
        const a = this._a;
        for (let i = size; i < a.length; i++) {
            a[i - size] = a[i];
        }
        this._len -= size;
    }

    peekFront() {
        if (this._len > 0) {
            return this._a[0];
        }
        return null;
    }
    test(d){
        if(arguments.length==0){
            if (this._len === 0) {
                return 0;
            }
            for (let i = 1; i <= this._len; i++) {
                const r = this._decode(i);
                if (r !== null) {
                    return i;
                }
            }
            return -1;    
        }else{
            const a = this._a;
            if (this._len >= a.length) {
                this.shift(1);
            }
            a[this._len] = d;
            this._len++;
            return this.test();
        }
    }

    update(d) {
        const len = this.test(d);
        switch (len) {
            case -1:
                if(arguments.length==0){
                    this.shift(1);
                    return "?";    
                }else{
                    if (this._len === this._a.length) {
                        return "?";
                    } else {
                        return null;
                    }    
                }
            case 0:
                return null;
            default:
                const r = this._decode(len);
                this.shift(len);
                return r;
        }
    }
    holdLen() {
        return this._len;
    }

    isBufferFull() {
        return this._len === this._a.length;
    }
}