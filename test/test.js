import AX25 from '../src/misc/AX25.js';
import assert from 'assert';

const AddressField=AX25.AddressField;
const AddressSubField=AX25.AddressSubField;
const Encoder=AX25.Encoder;
const Decoder=AX25.Decoder;
const ControlField=AX25.ControlField;



function to16(v){
    let r="";
    for(let i=0;i<v.length;i++){
        r=r+"0x"+v[i].toString(16)+" ";

    }
    return r;

}
describe('Encoder', () => {
    describe('#encode()', () => {
        it('パケットのエンコードとデコード', () => {
            const addrField = AddressField.create([
                AddressSubField.create('1MOU',0,1),
                AddressSubField.create('NYATLA',0,0),
                AddressSubField.create('REP001',0,0),
            ]);
            const encoder = new Encoder();
            encoder.putAddress(addrField);
            const ctrlField=ControlField.createIframe(0,0,1);
            encoder.putControl(ctrlField);
            encoder.putPid(240);
            encoder.putInfo("???S???");
            let encd=encoder.encode();
            const decoder =new Decoder();
            decoder.puts(encd);
            console.log(decoder.progress);
            console.dir(decoder.toDict(), { depth: null });
            assert.equal(addrField.source.addr,"NYATLA");
            assert.equal(addrField.source.ssid,0);
            assert.equal(addrField.source.cbit,0);
            assert.equal(addrField.destination.addr,"1MOU  ");
            assert.equal(addrField.destination.ssid,0);
            assert.equal(addrField.destination.cbit,1);
            assert.equal(addrField[2].addr,"REP001");
            assert.equal(ctrlField.frameType,ControlField.FRAME_TYPE.IFrame);
            assert.equal(ctrlField.nr,0);
            assert.equal(ctrlField.pfBit,0);
            assert.equal(ctrlField.ns,1);
            assert.equal(decoder.finished,true);
            assert.equal(decoder.isCorrectPacket,true);
        });
        it('パケットのデコードを途中で中断', () => {
            const addrField = AddressField.create([
                AddressSubField.create('1MOU',0,1),
                AddressSubField.create('NYATLA',0,0),
            ]);
            const encoder = new Encoder();
            encoder.putAddress(addrField);
            const ctrlField=ControlField.createIframe(0,0,1);
            encoder.putControl(ctrlField);
            encoder.putPid(240);
            encoder.putInfo("???S???");
            let encd=encoder.encode();
            //console.log("encoded bytes",to16(encd));
            for(let i=0;i<=encd.length;i++){
                const decoder =new Decoder();
                for(let j=0;j<i;j++){
                    decoder.put(encd[j]);
                }
                switch(i){
                case 0:
                    assert.equal(decoder.progress,Decoder.PROGRESS.PREFIX);
                    assert.equal(decoder.isCorrectPacket,false);
                    break;
                case 15:
                    assert.equal(addrField.source.addr,"NYATLA");
                    assert.equal(addrField.source.ssid,0);
                    assert.equal(addrField.source.cbit,0);
                    assert.equal(addrField.destination.addr,"1MOU  ");
                    assert.equal(addrField.destination.ssid,0);
                    assert.equal(addrField.destination.cbit,1);        
                    assert.equal(decoder.progress,Decoder.PROGRESS.CONTROL);
                    assert.equal(decoder.finished,false);
                    assert.equal(decoder.isCorrectPacket,false);
                    break;
                case 16:
                    assert.equal(ctrlField.frameType,ControlField.FRAME_TYPE.IFrame);
                    assert.equal(ctrlField.nr,0);
                    assert.equal(ctrlField.pfBit,0);
                    assert.equal(ctrlField.ns,1);        
                    assert.equal(decoder.progress,Decoder.PROGRESS.PID);
                    assert.equal(decoder.finished,false);
                    assert.equal(decoder.isCorrectPacket,false);
                    break;
                case 28:
                    assert.equal(decoder.progress,Decoder.PROGRESS.SUFFIX);
                    assert.equal(decoder.finished,true);
                    assert.equal(decoder.isCorrectPacket,true);
                    break;
                default:
                    if([1,2,3,4,5,6,7,8,9,10,11,12,13,14].includes(i)){
                        assert.equal(decoder.progress,Decoder.PROGRESS.ADDRESSES);
                        assert.equal(decoder.finished,false);
                        assert.equal(decoder.isCorrectPacket,false);
                    }else if([17,18,19,20,21,22,23,24,25,26,27].includes(i)){
                        assert.equal(decoder.pid,240);
                        assert.equal(decoder.progress,Decoder.PROGRESS.INFO);
                        assert.equal(decoder.finished,false);
                        assert.equal(decoder.isCorrectPacket,false);    
                    }
                    break;
                }
                decoder.stop();
                assert.equal(decoder.finished,true);
            }
        });
        it('破壊されたパケットのデコード', () => {
            const addrField = AddressField.create([
                AddressSubField.create('1MOU',0,1),
                AddressSubField.create('NYATLA',0,0),    
            ]);
            const encoder = new Encoder();
            encoder.putAddress(addrField);
            const ctrlField=ControlField.createIframe(0,0,1);
            encoder.putControl(ctrlField);
            encoder.putPid(240);
            encoder.putInfo("???S???");
            let encdB=encoder.encode();
            for(let i=0;i<=encdB.length;i++){
                const decoder =new Decoder();
                let encd=[...encdB];
                encd[i]=0xf0;
                switch(i){
                case 0:
                    decoder.puts(encd);
                    assert.equal(decoder.progress,Decoder.PROGRESS.PREFIX);
                    assert.equal(decoder.isCorrectPacket,false);
                    assert.equal(decoder.finished,true);
                    break;
                case 14:
                    assert.throws(()=>{decoder.puts(encd)});
                    break;
                default:
                    if([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,17,18,19,20,21,22,23,24,25,26,27].includes(i)){
                        decoder.puts(encd);
    //                    assert.equal(decoder.progress,Decoder.PROGRESS.ADDRESSES);
    //                    assert.equal(decoder.finished,false);
                        assert.equal(decoder.isCorrectPacket,false);
                    }else{
                        decoder.puts(encd);
                        console.log(i,decoder.toDict());    
                    }
                    break;
                }
                decoder.stop();
                assert.equal(decoder.finished,true);
            }



            // const decoder =new Decoder();
            // decoder.puts(encd);
            // console.log(decoder.progress);
            // console.dir(decoder.toDict(), { depth: null });

            // assert.equal(addrField.source.addr,"N7LEM6");
            // assert.equal(addrField.source.ssid,0);
            // assert.equal(addrField.source.cbit,0);
            // assert.equal(addrField.destination.addr,"NJ7P  ");
            // assert.equal(addrField.destination.ssid,0);
            // assert.equal(addrField.destination.cbit,1);
            // assert.equal(ctrlField.frameType,ControlField.FRAME_TYPE.IFrame);
            // assert.equal(ctrlField.nr,0);
            // assert.equal(ctrlField.pfBit,0);
            // assert.equal(ctrlField.ns,1);
            // assert.equal(decoder.finished,true);
            // assert.equal(decoder.isCorrectPacket,true);
        });

    });
});