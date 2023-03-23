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
		if(this._status!=AudioPlayer.ST.IDLE){
			throw new TbskException();
		}
		_t._src.start();
		_t._status=AudioPlayer.ST.PLAYING;
		let p=new Promise((resolve)=>{
			_t._src.onended=()=>{
				resolve(true);
				_t._status=AudioPlayer.ST.END;
			};
		});
		//設定されてたらstop resolverを呼ぶ
		p.then(()=>{if(_t._stop_resolver){_t._stop_resolver(true);}})

		return p;
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
		let _t=this;
		switch(_t._status){
		case AudioPlayer.ST.PLAYING:
			this._src.stop();
			_t._status=AudioPlayer.ST.STOPWAIT;
			await new Promise((resolve)=>{_t._stop_resolver=resolve;});
			return;
		case AudioPlayer.ST.STOPWAIT:
			throw new TbskException();
		case AudioPlayer.ST.END:
			return;
		default:
			throw new TbskException();
		}
	}
}