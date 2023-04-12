//	Copied from https://zenn.dev/plhr7/articles/aaefdba049abd6
//  rewrited by ChatGPT
export class CRC16
{
    static X_25 = class extends CRC16
    {
        constructor()
        {
            super(0x1021, 0xffff,  true,  true, 0xffff);
        }
    }
    constructor(poly, init, refin, refout, xorout)
    {
        this.poly = poly;
        this.init = init;
        this.refin = refin;
        this.refout = refout;
        this.xorout = xorout;
        if (this.refin) {
            this.init = this.__reflect(init, 16);
        }
    }
    __reflect(x, bits) {
        let r = 0;
        for (let i = 0; i < bits; i++) {
            r = (r << 1) | ((x >> i) & 1);
        }
        return r;
    }

    /**
     * 
     * @param {number[]|string} src 
     * @returns 
     */
    updates(src)
    {
        if (src instanceof Array) {
            for (const x of src) {
                this.update(x);
            }
        }else if (typeof src === "string") {
            this.updates(new TextEncoder().encode(src));
        } else {
            throw new TypeError("unsupported type");
        }
    }
    /**
     * 
     * @param {number} x - 8bit unsigned
     */
    update(x){
        let init = this.init;
        init ^= (this.refin ? this.__reflect(x, 8) : x) << 8;
        for (let i = 0; i < 8; i++) {
            if (init & 0x8000) {
                init = ((init << 1) ^ this.poly) & 0xffff;
            } else {
                init = (init << 1) & 0xffff;
            }
        }
        this.init = init;
    }
    /**
     * @returns {number}
     */
    digest()
    {
        if (this.refout) {
            return this.__reflect(this.init, 16) ^ this.xorout;
        }
        return this.init ^ this.xorout;
    }
}