//Thank you chatGPT!
export class Rms
{
    constructor(length) {
      if (length >= 1 << 30) {
        throw new Error('length must be less than 2^30');
      }
      this._buf = new Int32Array(length);
      this._ptr = 0;
      this._sum = 0;
      this._fp = 30;
    }
  
    update(d) {
      let v = d > 1 ? 1 : (d < -1 ? -1 : d); // normalize to range [-1, 1]
      let iv = Math.round(v * v * (1 << this._fp)); // 31-bit int
      let buf = this._buf;
      this._sum += iv - buf[this._ptr]; // Σx^2
      buf[this._ptr] = iv;
      this._ptr = (this._ptr + 1) % buf.length;
      return this;
    }
  
    getLastRms() {
      // √(Σx^2/0x7fffffff/n)
      return Math.sqrt(this._sum / (1 << this._fp) / this._buf.length);
    }
}