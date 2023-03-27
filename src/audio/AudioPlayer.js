//@ts-check

import { TbskException } from "../utils/classes";
import { TBSK_ASSERT } from "../utils/functions";
import { PromiseLock } from "../utils/promiseutils";

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
		/** @type {any} */
		_t._stop_resolver=undefined;
		_t._status=AudioPlayer.ST.IDLE;
	}
	get isPlaying(){
		return this._status==AudioPlayer.ST.PLAYING;
	}
	/**
	 * @async
	 * コンテンツを再生します。
	 * @returns {Promise<void>}
	 */
	async play()
    {
		let _t=this;
		const ST=AudioPlayer.ST;

		if(this._status!=ST.IDLE){
			throw new TbskException();
		}
		_t._status=ST.PLAYING;
		_t._play_lock=new PromiseLock();
		_t._src.start();
		_t._actx.addEventListener("statechange",()=>{
			if(_t._actx.state!="running" && _t._status!=ST.END){
				_t._play_lock?.release();
				_t._status=ST.END;
			}
		});
		_t._src.addEventListener("ended",()=>{
			if(_t._status!=ST.END){
				_t._play_lock?.release();
				_t._status=ST.END;
			}
		});
		//console.log("PLAY1",this._status);
		await _t._play_lock?.wait();
		//console.log("PLAY2",this._status);
		TBSK_ASSERT(_t._status==ST.END);
		return;
	}
	/**
	 * @async
	 * 再生中であれば停止します。この関数は、isPlayingがtrueの時だけ呼び出すことができます。
	 * @returns {Promise<void>}
	 * 停止状態になるとresolveします。
	 * play関数が完了した次のタイミングで帰ります。
	 */
	async stop()
    {
		const ST=AudioPlayer.ST;
		let _t=this;
		switch(_t._status){
		case ST.PLAYING:
			this._src.stop();
			_t._status=ST.STOPWAIT;
			await _t._play_lock?.wait();
			return;
		case ST.STOPWAIT:
			await _t._play_lock?.wait();
			throw new TbskException();
		case ST.END:
			return;
		default:
			throw new TbskException();
		}
	}
}