export class AudioCapture1 {
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
                sampleRate: { ideal: _t._sample_rate },
                sampleSize: { ideal: 16 },
                channelCount: { ideal: 1 },
                noiseSuppression:{ideal:false}
            },
            video: false
        };
        return new Promise((resolve, reject) => {
            dev.getUserMedia(constraints).then(
                function (stream) {   //onSuccess
                    _t._media_stream = stream;
                    let media_src_node = actx.createMediaStreamSource(stream);
                    //https://weblike-curtaincall.ssl-lolipop.jp/portfolio-web-sounder/webaudioapi-basic/custom
                    var getBufferSize = function() {
                        if (/(Win(dows )?NT 6\.2)/.test(navigator.userAgent)) {
                            return 1024;  // Windows 8
                        } else if (/(Win(dows )?NT 6\.1)/.test(navigator.userAgent)) {
                            return 1024;  // Windows 7
                        } else if (/(Win(dows )?NT 6\.0)/.test(navigator.userAgent)) {
                            return 2048;  // Windows Vista
                        } else if (/Win(dows )?(NT 5\.1|XP)/.test(navigator.userAgent)) {
                            return 4096;  // Windows XP
                        } else if (/Mac|PPC/.test(navigator.userAgent)) {
                            return 1024;  // Mac OS X
                        } else if (/Linux/.test(navigator.userAgent)) {
                            return 8192;  // Linux
                        } else if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
                            return 2048;  // iOS
                        } else {
                            return 16384;  // Otherwise
                        }
                    };                    
                    let handler_node = actx.createScriptProcessor(getBufferSize(), 1, 1);
                    media_src_node.connect(handler_node);
                    handler_node.connect(actx.destination);
                    handler_node.addEventListener("audioprocess",
                        (event) => {
                            console.log("in");
                            if (!_t._onsound) {
                                return;
                            }
                            new Promise((resolve)=>{
                                resolve(event);

                            }).then((e)=>{_t._onsound(e.inputBuffer.getChannelData(0))});
                        }
                    );

                    _t._nodes = { media_src: media_src_node, handler: handler_node };
                    console.log("connected");
                    resolve();
                },
                function (err) {   //onError
                    console.log('The following error occured: ' + err);
                    reject();
                });
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
