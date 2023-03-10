//@ts-check

/**
 * Audioバッファを一度だけ再生するプレイヤーです。
 */
export class AudioPlayer
{
	/**
	 * 
	 * @param {AudioContext} actx 
	 * @param {AudioBuffer} audio_buffer 
	 */
	constructor(actx,audio_buffer)
	{
		let _t=this;
		_t._actx=actx;
		let src= _t._actx.createBufferSource();
		src.buffer=audio_buffer;
		src.connect(_t._actx.destination);
		/** @type  {AudioBufferSourceNode?}*/
		_t._src=src;
		_t._playing=false;
	}
	/**
	 * 再生が完了するとtrue
	 * @returns {boolean}
	 */
	get isFinised(){
		return !this._playing;
	}
	/**
	 * 再生します。
	 * @returns {Promise}
	 * 再生が完了するとresolveします。
	 */
	play()
    {
		if(!this._src || this._playing){throw new Error();}
		let _t=this;
        return new Promise((resolve) => {
            _t._src.start();
			_t._playing=true;
            _t._src.onended=()=>{
				_t._playing=false;
				_t._src=null;
				resolve();
			};
        });		
	}
	/**
	 * 再生中であれば停止します。
	 */
	stop()
    {
		if(this._src){
			this._src.stop();
			this._playing=false;
			this._src=null;
		}
	}
}