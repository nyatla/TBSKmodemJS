/**
 * AudioWorkletNodeを使ったAudioキャプチャ
 */
//@ts-check

//dumpprocessssor.jsの中身
const ww_script=new Blob([
`
class DumpProcessor extends AudioWorkletProcessor
{
    constructor(){
        super();
        console.log("DumpProcessor ready!");
        this.port.onmessage = (e) => {
            switch(e.data["name"]){
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
                console.log("Invalid message:"+e); 
            }
            console.log(e.data);
          };
    }
    process(inputs, outputs, parameters){
        let _t=this;
        if(!_t._q){
            return true;
        }
        /*
        let b=[];
        for(let i=0;i<inputs.length;i++){
        	let s=inputs[i][0];
        	for(let j=0;j<s.length;j++){
        		b.push(s[j]);
        	}
        }
        _t.port.postMessage({name:"data",value:b});
		*/

        if(_t._q.length<100){
            for(let i=0;i<inputs.length;i++){
                _t._q.push(inputs[i][0]);//ch1のみ
            }
        }else{
            console.log("Buffer overflow.");
        }
        for(let i=0;i<Math.min(_t._q.length,inputs.length*2);i++){
            _t.port.postMessage({name:"data",value:_t._q.shift()});
        }

        return true;
    }
  }
  
  registerProcessor("dump-processor", DumpProcessor);

`], {type: 'text/javascript'});

export class AudioInput
{
    /**
     * 
     * @param {number} sample_rate 
     */
    constructor(sample_rate) {
        var _t = this;
        //see https://github.com/mdn/dom-examples/blob/main/media/web-dictaphone/scripts/app.js
        if (!navigator.mediaDevices.getUserMedia) {
            throw new Error('getUserMedia not supported on your browser!');
        }
        _t._sample_rate = sample_rate;
        _t._media_devices = navigator.mediaDevices;
        _t._media_stream = null;
        _t._nodes = null;
        _t._onsound = null;
        _t._actx = null;
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
    /**
     * 音声キャプチャデバイスを開きます。結果はPromiseで返します。
     * @returns {Promise}
     *  成功:resolve,失敗:reject
     * 
     */
    open() {
        var _t = this;
        let dev = this._media_devices;

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
                    /*  https://addpipe.com/simple-web-audio-recorder-demo/js/app.js
                        create an audio context after getUserMedia is called
                        sampleRate might change after getUserMedia is called, like it does on macOS when recording through AirPods
                        the sampleRate defaults to the one set in your OS for your playback device
                    */
		            let actx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: _t._sample_rate });
                    _t._actx = actx;
                    console.log("actx sample rate",actx.sampleRate);
                    console.log("stream capability",stream.getAudioTracks()[0].getCapabilities().sampleRate);
                    let media_src_node = actx.createMediaStreamSource(stream);
                    actx.audioWorklet.addModule(URL.createObjectURL(ww_script)).then(() => {
                        let handler_node = new AudioWorkletNode(actx, 'dump-processor');
                        handler_node.port.onmessage = (event) => {
                            switch(event.data["name"]){
                            case "data":
                                if (_t._onsound) {
                                    _t._onsound(event.data.value);
                                }
                                break;
                            default:
	                            console.log("unknown msg");
                            }
                        };
                        media_src_node.connect(handler_node);
                        handler_node.connect(actx.destination);

                        _t._nodes = { media_src: media_src_node, handler: handler_node };
                        console.log("connected");
                        actx.suspend().then(()=>{
                        	actx.resume().then(()=>{resolve(true);})
                        });
    
                    });
                },
                function (err) {   //onError
                    console.log('The following error occured: ' + err);
                    reject(false);
                }
            );
        })
    }
    /**
     * 音声キャプチャデバイスを閉じます。以降は使用不能です。
     */
    close() {
        this.stop();
        if (this._nodes) {
            this._nodes.handler.disconnect();
            this._nodes.media_src.disconnect();
        }
        this._nodes = null;
        if(this._actx){
            this._actx.close();
            this._actx = null;    
        }
        const tracks = this._media_stream.getTracks();
        tracks.forEach(function(track) {
            track.stop();
        });        
    }
    /**
     * 関連付けられたオーディオコンテキストを返します。
     * @returns {AudioContext}
     */
    get audioContext(){
        return this._actx;
    }
    /**
     * 
     * @returns {number}
     */
    get sampleRate(){
        return this._sample_rate;
    }
    capability() {
        //see https://note.com/npaka/n/n87acd80a4266
        let tracks = this._media_stream.getTracks();
        for (var i = 0; i < tracks.length; i++) {
            console.log(tracks[i]);
            console.log(tracks[i].getSettings());
        }
    }
    /**
     * 音声入力のコールバック処理を開始します。
     * @param {*} onsound 
     */
    start(onsound)
    {
        if (!this._actx || this._onsound) { throw new Error(); }
        this._onsound = onsound;
        this._nodes.handler.port.postMessage({name:"start"});
        console.log("recorder started");
    }
    /**
     * コールバック処理を停止します。
     */
    stop() {
        if (!this._actx) { throw new Error(); }
        this._onsound = null;
        this._nodes.handler.port.postMessage({name:"stop"});
        console.log("recorder stopped");
    }
}
