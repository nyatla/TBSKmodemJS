/**
 * Audioバッファを一度だけ再生するプレイヤーです。
 */
export class AudioPlayer
{
	constructor(actx,audio_buffer)
	{
		let _t=this;
		_t._actx=actx;
		let src= _t._actx.createBufferSource();
		src.buffer=audio_buffer;
		src.connect(_t._actx.destination);
		_t._src=src;
		_t._playing=false;
	}
	/**
	 * 再生が完了するとtrue
	 * @returns bool
	 */
	isFinised(){
		return !this._playing;
	}
	/**
	 * 再生します。
	 * @returns 
	 */
	play()
    {
		if(!this._src || this._playing){throw new Error();}
		let _t=this;
        return new Promise((resolve, reject) => {
            _t._src.start();
			_t._playing=true;
            _t._src.onended=()=>{
				_t._playing=false;
				_t._src=null;
				resolve();
			};
        });
	}
	stop()
    {
		_t._src.stop();
		_t._playing=false;
		this._src=null;
	}
}