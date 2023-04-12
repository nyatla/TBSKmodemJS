
import { CRC16 } from '../utils/crc16.js';



function toHEX(v){
    return "0x"+v.toString(16);
}

/**
 * Ax25アドレスサブフィールドを格納します。
 */
class AddressSubField
{
    /**
     * 使用できません。#createか#parse関数を使用して下さい。
     * @param {number[]} - フィールドイメージのバイト配列
     */
    constructor(buf)
    {
        //[0..5] フィールドイメージ
        this._buf=buf;
    }
    /**
     * バイト配列の先頭8バイトをAX25アドレスとして解釈する。
     * 長さが満たない場合はエラー.
     * @param {number[]} src
     * 
     */
    static parse(src)
    {
        if(src.length<8){
            throw new Error("Insufficient src length.");
        }
        //先頭7バイト
        let buf=src.slice(0,6);
        if((buf[6]&0b01100000)!=0b01100000){
            throw new Error("Invalid ssid reserved bit.");
        };
        return new AddressSubField(buf);
    }
    /**
     * 
     * @param {string|number[]} addr - コールサイン文字列です。最大で6文字です。 
     * @param {number} ssid - 4bit符号なし整数です。 
     * @param {number} cbit - 1bit符号なし整数です。 
     * @returns 
     */
    static create(addr,ssid=0,cbit=0)
    {
        let baddr;
        if(typeof addr=="string"){
            let te = new TextEncoder();
            baddr=te.encode(addr);//intに変換
        }else{
            baddr=addr;
        }
        //addrの型式確認
        if(baddr.length>6){
            throw new Error("addr string Too long.");
        }
        //buf準備
        let buf=[];
        buf.push(...baddr);
        //6バイト整形
        while(buf.length<6){
            buf.push(32);
        }
        for(let i=0;i<buf.length;i++){
            if((0x80&buf[i])!=0x00){
                throw new Error("addr string containes high bit.");
            }
            buf[i]<<=1;
        }
        if(0>ssid|| ssid>0x0f){
            throw new RangeError("ssid is too large.");
        }
        let ssid_byte=(cbit<<7)|0x60|(ssid<<1);
        buf.push(ssid_byte);
        return new AddressSubField(buf);
    }
    /**
     * @returns {string}
     */
    get addr()
    {
        let d=this._buf.slice(0,6);
        let r="";
        for(let i=0;i<d.length;i++){
            r=r+String.fromCharCode(d[i]>>1);
        }
        return r;
    }
    /**
     * @returns {number}
     */
    get ssid(){
        return (this._buf[6]>>1)&0x0f;
    }
    /**
     * Cビットの値
     * @returns {number}
     */
    get cbit(){
        return (this._buf[6]&0x80)==0?0:1;
    }
    toBytes(){
        return this._buf;
    }
    toDict(){
        return {addr:this.addr,ssid:this.ssid,cbit:this.cbit};
    }
}
/**
 * Ax25アドレスフィールドを格納します。
 */
class AddressField extends Array
{
    /**
     * 使用できません。createかparse関数を使用して下さい。
     * @param {AddressSubField[]} - サブフィールドの配列
     */
    constructor(subfields)
    {
        super();
        this.push(...subfields);
    }
    /**
     * バイト配列を7バイト単位でAddressSubFieldとしてパースする。
     * 長さが満たない場合はエラー.
     * @param {number[]} src
     * 
     */
    static parse(src)
    {
        let s=Math.floor(src.length/7);
        if(s<2){
            throw new Error("Insufficient src length.");
        }
        let d=[];
        //eoaが途中に挟まってないかチェック
        for(let i=0;i<s-1;i++){
            if((src[i*7+7]&0x01)!=0){
                throw new Error("Middle EOF is set.");
            }
            d.push(new AddressSubField(src.slice(i*7,i*7+7)));
        }
        //最後のフィールドにEOFがあるか見る
        if((src[s*7-1]&0x01)==0){
            throw new Error("Last EOF is not set.");
        }else{
            d.push(new AddressSubField(src.slice((s-1)*7,(s-1)*7+7)));

        }
        return new AddressField(d);
    }
    /**
     * 
     * @param {AddressSubField[]} subfields 
     * @returns 
     */
    static create(subfields){
        return new AX25.AddressField(subfields);
    }
    /**
     * @returns {AddressSubField}
     */
    get destination(){
        return this[0];
    }
    /**
     * @returns {AddressSubField}
     */
    get source(){
        return this[1];
    }

    toBytes(){
        let r=[];
        for(let i=0;i<this.length;i++){
            r.push(...this[i].toBytes());
        }
        r[r.length-1]|=0x01;
        return r;
    }
    toDict(){
        let r=[];
        for(let i=0;i<this.length;i++){            
            r.push(this[i].toDict());
        }
        return r;
    }

}
/**
 * AX25コントロールフィールドを格納します。
 * 8bitです。
 */
class ControlField
{
    static FRAME_TYPE={
        IFrame:0,
        SFrame:1,
        UFrame:2,
    }
    /**
     * 使用できません。createかparse関数を使用して下さい。
     * @param {number} byte - 8bitコントロールフィル度の値
     * 
     */
    constructor(byte)
    {
        this._byte=byte;
    }
    static createIframe(nr, p, ns) {
        const FRAME_TYPE = ControlField.FRAME_TYPE;
        if (nr < 0 || nr > 7 || p < 0 || p > 1 || ns < 0 || ns > 7) {
            throw new Error("Argument out of range.");
        }
        let b = ((nr & 0x7) << 5) | ((p & 0x1) << 4) | ((ns & 0x7) << 1);
        return new ControlField(b);
    }
    
    static createSframe(nr, pf, s) {
        const FRAME_TYPE = ControlField.FRAME_TYPE;
        if (nr < 0 || nr > 7 || pf < 0 || pf > 1 || s < 0 || s > 3) {
            throw new Error("Argument out of range.");
        }
        let b = ((nr & 0x7) << 5) | ((pf & 0x1) << 4) | ((s & 0x3) << 2) | 0x3;
        return new ControlField(b);
    }
    
    static createUframe(m, pf) {
        const FRAME_TYPE = ControlField.FRAME_TYPE;
        if (m < 0 || m > 3 || pf < 0 || pf > 1) {
            throw new Error("Argument out of range.");
        }
        let b = ((m & 0x3) << 2) | ((pf & 0x1) << 4) | 0x1;
        return new ControlField(b);
    }
    
    /**
     * バイト配列をAX25コントロールフィールドとして解釈する。
     * @param {number[]} buf 
     */
    static parse(buf)
    {
        if (buf.length<1) {
            throw new TbskException("Insufficient buf length.");
        }
        return new ControlField(buf[0]);
    }
    get frameType()
    {
        const FRAME_TYPE=ControlField.FRAME_TYPE;
        let b=this._byte;
        if((b&0x01)==0){
            return FRAME_TYPE.IFrame;
        }
        if((b&0x02)==0){
            return FRAME_TYPE.SFrame;
        }
        return FRAME_TYPE.UFrame;
    }
    /**
     * receive sequence number
     */
    get nr(){
        if(this.frameType==ControlField.FRAME_TYPE.UFrame){
            throw new Error("Unsupported frame type.");
        }
        return (this._byte>>5)&0x7;
    }
    /**
     * send sequence number
     */
    get ns(){
        if(this.frameType!=ControlField.FRAME_TYPE.IFrame){
            throw new Error("Unsupported frame type.");
        }
        return (this._byte>>1)&0x7;
    }
    get pfBit(){
        return ((this._byte>>4)&0x1)==0?false:true;
    }
    /**
     * modifier bits
     */
    get m(){
        if(this.frameType!=ControlField.FRAME_TYPE.MFrame){
            throw new Error("Unsupported frame type.");
        }
        return ((this._byte>>4)&0x16)|((this._byte>>2)&0x3);
    }
    /**
     * supervisory function bits
     * 2bit幅です。
     */
    get s(){
        if(this.frameType!=ControlField.FRAME_TYPE.SFrame){
            throw new Error("Unsupported frame type.");
        }
        return (this._byte>>2)&0x3;
    }
    toByte(){
        return this._byte;
    }
    toDict(){
        return {type:this.frameType,byte:this.toByte()};
    } 
}

class PidField
{
    static NO_LAYER_3 = 0x00;
    static X25_LAYER_3 = 0x01;
    static COMPRESSED_TCP_IP = 0x06;
    static UNCOMPRESSED_TCP_IP = 0x07;
    static SEGMENTATION_FRAGMENTATION = 0x08;
    static TEXNET_DATAGRAM_PROTOCOL = 0xC3;
    static LAT = 0xC4;
    static SMACK = 0xC5;
    static NOPACKET = 0xC6;
    static EXTENDED_FRAME = 0xC7;
    static UI_PROTOCOL_WITH_FRAMING = 0xCF;
    static AX_25_WITH_FLEXNET = 0xD0;
    static NET_ROM = 0xF0;
    static NO_LAYER_3_OVERLAY = 0xFF;
    static RESERVED_MASK=0x6f;
    /**  reserved at this time for future Layer 3 protocols.*/
    static isReserved(v){
        return (0x6f & v) in [0x3,0x0];
    }
}



class Encoder
{
    constructor() {
        this._st=0;
        this._num_of_addr=0;
        this._frame_type=-1;
        this._result=[];
    }
    /**
     * @param {AddressField} address 
     * アドレスのeoaビットはクリアされます。
     */
    putAddress(address)
    {
        if(this._st!=0){
            throw new Error();
        }
        this._result.push(...address.toBytes());
        this._result[this._result.length-1]&=0xfe;//Adress終端クリア
    }
    /**
     * @param {ControlField} ctrl 
     */
    putControl(ctrl){
        if(this._st!=0){
            throw new Error();
        }
        if(this._result.length<7){
            throw new Error("No Address field.");
        }
        this._result[this._result.length-1]|=0x01;//Adress終端フラグ
        this._result.push(ctrl.toByte());
        if(ctrl.frameType==ControlField.FRAME_TYPE.IFrame){
            this._st=1;//Iframeの場合はputPidを利用可能
        }else{
            this._st=2;
        }
    }
    /**
     * 
     * @param {number} pid - 8bit unsigned
     */
    putPid(pid)
    {
        if(this._st!=1){
            throw new Error();
        }
        if(pid<0||pid>0xff){
            throw new RangeError();
        }
        this._result.push(pid);
        this._st=2;
    }
    /**
     * infoを追記します。
     * @param {number[]|string} src 
     */
    putInfo(src)
    {
        if(typeof src==="string"){
            let te = new TextEncoder("utf8");
            return this.putInfo(te.encode(src));
        }
        if(this._st==1){
            this._st=2;
        }
        if(this._st!=2){
            throw new Error();
        }
        this._result.push(...src);
    }
    /**
     * 現在の内容をAX25型式にエンコードします。
     * 端数bitは1でパディングします。
     * @returns 
     */
    encode()
    {
        let crc=new CRC16.X_25();
        crc.updates(this._result);
        let fcs=crc.digest();
        let src=[...this._result];
        src.push(0xff&(fcs>>8),0xff&fcs);
        //console.log("src",toHEX(src));//OK

        let tmp = [];
        let bitCount = 0;

        for (let i = 0; i < src.length; i++) {
            const byte = src[i];

            for (let j = 7; j >= 0; j--) {
                const bit = (byte >> j) & 1;
                if (bit === 1) {
                    bitCount++;
                    if (bitCount === 6) {
                        tmp.push(0);
                        bitCount = 0;
                    }
                }else{
                    bitCount = 0;
                }
                tmp.push(bit);
            }
        }
        //8bit境界のパディング(バイト境界に合わせてFLAGがくるようにする。)
        //パディングは読み捨てる事を期待する。
        // console.log("8bit境界パディングを内部にするか外部にするかはよくかんがえて。デコードのテストするときは特に。");
        while(tmp.length%8!=0){
            tmp.push(0);
        }

        //suffixの追記
        tmp.push(0,1,1,1,1,1,1,0);
        //prefixを追記してからbyte配列化
        let result=[0x7e];
        let b=0;
        //8ビットごとに纏める.
        for(let i=0;i<tmp.length;i++){
            b=b<<1;
            b|=(tmp[i]&0x01);
            if((i+1)%8==0){
                result.push(b);
                b=0;
            }
        }
//        console.log("enc",to16(result));
        return result;
   }
}


/**
 * AX25のビットスタッフィングを解除します。
 * 入力値をbyte単位で復元します。
 */
class UnBitStuffing
{
    constructor()
    {
        this._bit1_len=0;//hビットの連続回数
        this._byte=0;
        this._bit_len=0;
    }
    /**
     * bitを入力してパーサーを更新します。
     * @param {*} bit 
     * @return {number|boolean}
     * エラー、又は終端の場合falseです。
     * 未確定の場合はtrueです。
     * 確定した場合は数値です。
     */
    putBit(bit)
    {
        if(this._bit1_len<5){
            if(bit==0){
                this._bit1_len=0;
            }else{
                this._bit1_len++;
            }
            this._byte=(this._byte<<1)|bit;
            this._bit_len++;
            if(this._bit_len==8){
                let r=this._byte;
                this._byte=0;
                this._bit_len=0;
                return r;
            }
        }else{
            if(bit==0){
                //ビットスタッフィングのスキップ
                this._bit1_len=0;
            }else{
                //6bit目を検出したら終端とする。
                return false;
            }
        }

        return true;
    }
    /**
     * byteを入力してパーサーを更新します。
     * @param {*} byte 
     * @return {number|boolean}
     * エラー、又は終端の場合falseです。
     * 未確定の場合はtrueです。
     * 確定した場合は数値です。
     */    
    putByte(byte)
    {
        /** @type {boolean|number} */
        let r=true;
        for(let i=7;i>=0;i--){
            let t=this.putBit((byte>>i)&0x01);
            if(t==false){
                return false;
            }else if(t!==true){
                r=t;
            }
        }
        return r;
    }
}





/**
 * 確定したフィールドを逐次読みだせるAX25デコードクラス
 */
class Decoder
{
    static PROGRESS={
        PREFIX:0,
        ADDRESSES:1,
        CONTROL:2,
        PID:3,
        INFO:4,
        FCS:5,
        SUFFIX:6
    }
    constructor(){
        const ST=Decoder.PROGRESS;
        let ubs=new UnBitStuffing();
        this._progress=ST.PREFIX;
        this._finished=false;
        this._src=[];
        this._result={
            /**@type {AddressField|undefined} */
            addresses:undefined,
            /**@type {ControlField|undefined} */
            control:undefined,
            /**@type {number|undefined} */
            pid:undefined,
            /**@type {number[]|undefined} */
            info:undefined,
            /**@type {{correct:number,data:number}|undefined} */
            fcs:undefined,
        }
        this._proc=(function*(inst){
            let crc16=new CRC16.X_25();
            let src=inst._src;//受け渡し用のFIFO
            let result=inst._result;

            while(src.length==0){
                yield true;
            }
            //prefix
            if(src.shift()!="0x7e"){
                return false;
            }
            inst._progress=ST.ADDRESSES;
            //EOAビットに到達するまで受信
            let t=[];
            for(let j=0;;j++){
                if(j>=8){
                    //中継しすぎ
                    return false;
                }
                for(let i=0;i<7;i++){
                    while(src.length==0){
                        yield true;
                    }
                    let r=ubs.putByte(src.shift());  
                    if(r===false){
                        return false;
                    }else if(r===true){
                        yield true;
                        continue;
                    }else{
                        crc16.update(r);
                        t.push(r);
                    }
                }
                if((t[t.length-1]&0x01)==0){
                    continue;
                }
                result.addresses=AddressField.parse(t);
                break;
            }
            inst._progress=ST.CONTROL;
            //1バイト取得してコントロールを生成
            while(true){
                while(src.length==0){
                    yield true;
                }
                let b=src.shift();
                let r=ubs.putByte(b);
                if(r===false){
                    return false;
                }else if(r===true){
                    yield true;
                    continue;
                }
                crc16.update(r);
                result.control=new ControlField(r);
                break;
            }
            //必要に応じてPIDを生成
            if(result.control?.frameType==ControlField.FRAME_TYPE.IFrame){
                inst._progress=ST.PID;
                //1バイト取得してコントロールを生成
                while(true){
                    while(src.length==0){
                        yield true;
                    }
                    let r=ubs.putByte(src.shift());
                    if(r===false){
                        return false;
                    }else if(r===true){
                        yield true;
                        continue;
                    }
                    crc16.update(r);
                    //@ts-ignore
                    result.pid=r;
                    break;
                }
            }
            //Infoフィールド.終端するまで取得
            inst._progress=ST.INFO;
            result.info=[];
            /**@type {number[]} */
            let tmp=[];//最大3バイトのfifo
            for(let j=0;result.info.length<256;j++){
                while(src.length==0){
                    yield true;
                }
                let r=ubs.putByte(src.shift());

                if(r===false){
                    break;//終端
                }else if(r===true){
                    yield true;
                    continue;
                }
                tmp.push(r);
                if(tmp.length==3){
                    let w=tmp.shift();
                    //@ts-ignore
                    result.info.push(w);
                    //@ts-ignore
                    crc16.update(w);
                }
            }
            inst._progress=ST.FCS;
            //終端2バイトをFCSとして評価
            if(tmp.length!=2){
                return false;
            }
//            console.log(tmp);
//            console.log("c",toHEX(tmp[0]),toHEX(tmp[1]));
//            console.log("d",toHEX(crc16.digest()));
            result.fcs={
                correct:((tmp[0]<<8)|tmp[1]),
                data:crc16.digest()
            };
            inst._progress=ST.SUFFIX;
            return false;
        })(this);        
    }
    stop(){
        if(this._finished){
            return false;
        }else{
            this._proc.return();
            this._finished=true;
        }
    }
    put(byte)
    {
        if(this._finished){
            return false;
        }else{
            this._src.push(byte);
            let r=this._proc.next().value;
            if(!r){
                //確定
                this._finished=true;
            }    
        }
        return !this._finished;
    }
    puts(bytes){
        for(let i=0;i<bytes.length;i++){
            if(!this.put(bytes[i])){
                return false;
            }
        }
        return true;
    }
    /**
     * パケットのデコードが完了したかを返します。
     */
    get finished(){
        return this._finished;
    }
    get progress(){
        return this._progress;
    }
    /**
     * アドレスフィールドの結果を返します。
     * 未確定の場合、undefinedです。
     */
    get addresses(){
        return this._result.addresses;
    }
    /**
     * コントロールフィールドの値を返します。
     * 未確定の場合、undefinedです。
     */
    get control(){
        return this._result.control;
    }
    /**
     * PIDフィールドの値を返します。
     * 未確定の場合、undefinedです。
     */
    get pid(){
        if(this._result.control?.frameType!=ControlField.FRAME_TYPE.IFrame){
            throw new Error("pid field is not exist.");
        }
        return this._result.pid;
    }
    /**
     * Infoフィールドの値を返します。受信に至らなかった場合はundefinedです。
     * この値は速報値であり、確定するまでは更新されます。
     */
    get info(){
        return this._result.info;
    }
    /**
     * fcsの受信地と計算値を返します。
     */
    get fcs(){
        return this._result.fcs;
    }
    /**
     * パケットが正常に確定したかを返します。
     * 未確定の場合は常にfalseです。
     */
    get isCorrectPacket(){
        let fcs=this._result.fcs;
        return fcs?fcs.correct==fcs.data:false;
    }
    toDict()
    {
        return {
            finished:this._finished,
            isCorrectPacket:this.isCorrectPacket,
            result:{
                addresses:this._result.addresses?this._result.addresses.toDict():undefined,
                control:this._result.control?this._result.control.toDict():undefined,
                pid:this._result.pid,
                info:this._result.info,
                fct:this._result.fcs
            }
        }
    }
}
const AX25={
    Encoder:Encoder,
    Decoder:Decoder,
    AddressField:AddressField,
    AddressSubField:AddressSubField,
    ControlField:ControlField,
    PidField:PidField
};
export default AX25;
