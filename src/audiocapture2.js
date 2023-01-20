/**
 * AudioWorkletNodeを使ったAudioキャプチャ
 */


//dumpprocessssor.jsの中身
const ww_script=new Blob([
`
class DumpProcessor extends AudioWorkletProcessor
{
    constructor(){
        super();
        console.log("DumpProcessor ready!");
        this._q=[];
        this.port.onmessage = (e) => {
            switch(e.data){
            case "start":
                this._q=[];
                break;
            case "stop":
                this._q=undefined;
                break;
            case "clear":
                this._q=this._q?[]:this._q;
                break;
            default:
                console.log("Invalid message:"+e.data); 
            }
            console.log(e.data);
          };
    }
    process(inputs, outputs, parameters){
        let _t=this;
        if(!_t){
            return true;
        }
        for(let i=0;i<inputs.length;i++){
            _t._q.push(inputs[i][0]);//ch1のみ
        }
        if(_t._q.length>1000){
            console.log("Buffer overflow.");
        }
        function f(){
            let proc=new Promise((resolve) => {
                _t.port.postMessage({name:"data",value:_t._q.shift()});
                resolve();
            });            
            proc.then(()=>{if(_t._q.length>0){f();}});
        }
        f();
        return true;
    }
  }
  
  registerProcessor("dump-processor", DumpProcessor);

`], {type: 'text/javascript'});

export class AudioCapture2
{
    constructor(sample_rate) {
        var _t = this;
        //see https://github.com/mdn/dom-examples/blob/main/media/web-dictaphone/scripts/app.js
        if (!navigator.mediaDevices.getUserMedia) {
            throw new Error('getUserMedia not supported on your browser!');
        }
        _t._actx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: sample_rate });
        _t._sample_rate = sample_rate;
        _t._media_devices = navigator.mediaDevices;
        _t._media_stream = null;
        _t._nodes = null;
        _t._onsound = null;
    }
    enumerateDevices() {
        const constraints = {
            audio: true,
            video: false
        };
        navigator.mediaDevices.enumerateDevices()
            .then(function (devices) {
                devices.forEach(function (device) {
                    console.log(device.kind + ": " + device.label +
                        " id = " + device.deviceId);
                });
            })
            .catch(function (err) {
                console.log(err.name + ": " + err.message);
            });
    }

    open() {
        var _t = this;
        let dev = this._media_devices;
        let actx = this._actx;

        const constraints = {
            audio: {
                autoGainControl: { ideal: false },
                echoCancellation: { ideal: false },
                noiseSuppression:{ideal:false},
                sampleRate: { ideal: _t._sample_rate },
                sampleSize: { ideal: 16 },
                channelCount: { ideal: 1 }
            },
            video: false
        };
        return new Promise((resolve, reject) => {
            dev.getUserMedia(constraints).then(
                function (stream) {   //onSuccess
                    _t._media_stream = stream;
                    let media_src_node = actx.createMediaStreamSource(stream);
                    actx.audioWorklet.addModule(URL.createObjectURL(ww_script)).then(() => {
//                    actx.audioWorklet.addModule('dumpprocessor.js').then(() => {
                        let handler_node = new AudioWorkletNode(actx, 'dump-processor');
                        handler_node.port.onmessage = (event) => {
                            if(event.data.name){
                                if (_t._onsound) {
                                    _t._onsound(event.data.value);
                                }
                            }
                        };
                        media_src_node.connect(handler_node);
                        handler_node.connect(actx.destination);

                        _t._nodes = { media_src: media_src_node, handler: handler_node };
                        console.log("connected");
                        resolve();
    
                    });
                },
                function (err) {   //onError
                    console.log('The following error occured: ' + err);
                    reject();
                }
            );
        })
    }
    close() {
        this.stop();
        if (this._nodes) {
            this._nodes.handler.disconnect();
            this._nodes.media_src.disconnect();
        }
        this._nodes = null;
        this._actx.close();
        this._actx = null;
    }
    capability() {
        //see https://note.com/npaka/n/n87acd80a4266
        let tracks = this._media_stream.getTracks();
        for (var i = 0; i < tracks.length; i++) {
            console.log(tracks[i]);
            console.log(tracks[i].getSettings());
        }
    }
    start(onsound) {
        if (!this._actx || this._onsound) { throw new Error(); }
        this._onsound = onsound;
        console.log("recorder started");
    }
    stop() {
        if (!this._actx) { throw new Error(); }
        this._onsound = null;
        console.log("recorder stopped");
    }
}
