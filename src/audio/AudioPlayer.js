//@ts-check

import { TbskException } from "../utils/classes";
import { TBSK_ASSERT } from "../utils/functions";

/**
 * Audioバッファを一度だけ再生するプレイヤーです。
 */
export class AudioPlayer
{
	static ST={
		IDLE:1,
		PLAYING:2,
		STOPWAIT:3,
		END:4
	}
	/**
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
		/** @type  {AudioBufferSourceNode}*/
		_t._src=src;
		_t._play_promise=undefined;
		_t._status=AudioPlayer.ST.IDLE;
	}
	/**
	 * 再生が完了するとtrue
	 * @returns {boolean}
	 */
	get isFinised(){
		return this._status==AudioPlayer.ST.END;
	}
	/**
	 * @async
	 * コンテンツを再生します。
	 * @returns {Promise<boolean>}
	 * 再生が完了するとresolveします。
	 */
	async play()
    {
		let _t=this;
		if(this._status!=AudioPlayer.ST.IDLE){
			throw new TbskException();
		}
		_t._src.start();
		_t._status=AudioPlayer.ST.PLAYING;
		_t.play_promise= new Promise((resolve) =>
		{
            _t._src.onended=()=>{
				resolve(true);
				_t._status=AudioPlayer.ST.END;
			};
		})
		return await _t.play_promise;
	}
	/**
	 * @async
	 * 再生中であれば停止します。
	 * @returns {Promise<boolean>}
	 * 停止状態になるとresolveします。
	 */
	async stop()
    {
		let _t=this;
		switch(_t._status){
		case AudioPlayer.ST.PLAYING:
			this._src.stop();
			_t._status=AudioPlayer.ST.STOPWAIT;
			return await _t.play_promise;
		case AudioPlayer.ST.STOPWAIT:
			return await _t.play_promise;
		case AudioPlayer.ST.END:
			return true;
		default:
			throw new TbskException();
		}
	}
}