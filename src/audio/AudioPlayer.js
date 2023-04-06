//@ts-check

import { Disposable, TbskException } from "../utils/classes";
import { TBSK_ASSERT } from "../utils/functions";
import { PromiseLock } from "../utils/promiseutils";

/**
 * 1個のAudioバッファを再生するプレイヤーです。
 * 使い終わったらcloseを実行してください。
 */
export class AudioPlayer
{
	static ST={
		IDLE:1,
		PLAYING:2,
		STOPWAIT:3,
		CLOSED:4
	}
	/**
	 * @param {AudioContext} actx 
	 */
	constructor(actx)
	{
		let gain=actx.createGain();
		gain.connect(actx.destination);
		this._actx=actx;
		this._status=AudioPlayer.ST.IDLE;
		/**@type {GainNode} */
		this._gain=gain;
		/** @type  {AudioBufferSourceNode|undefined}*/
		this._src=undefined;
	}
	close(){
		const ST=AudioPlayer.ST;
		let _t=this;
		async function fn(){
			if(_t._status!=ST.CLOSED){
				await _t.stop();//nowait
				if(_t._src){
					_t._src.disconnect();
					_t._src=undefined;
				}	
				_t._gain.disconnect();
				_t._status=ST.CLOSED;
			}	
		}
		fn();//no-wait async!
	}
	/**
	 * 音量を設定。
	 * [0,1]の値
	 */
	set gain(v){
		this._gain.gain.value=v;
	}
	get gain(){
		return this._gain.gain.value;
	}
	
	get isPlaying(){
		return this._status==AudioPlayer.ST.PLAYING;
	}
	/**
	 * @async
	 * コンテンツを再生します。
	 * @param {AudioBuffer} audio_buffer 
	 * @returns {Promise<void>}
	 * 再生が終わると完了します。
	 */
	async play(audio_buffer)
    {
		let _t=this;
		const ST=AudioPlayer.ST;

		if(this._status!=ST.IDLE){
			throw new TbskException();
		}
		_t._status=ST.PLAYING;
		_t._play_lock=new PromiseLock();
		let actx=this._actx;
		let src= actx.createBufferSource();
		src.buffer=audio_buffer;
		src.connect(_t._gain);
		src.start();
		let ended_event=()=>{
			if([ST.PLAYING,ST.STOPWAIT].includes(_t._status)){
				_t._play_lock?.release();
				_t._status=ST.IDLE;
				src.disconnect();
				src.removeEventListener("ended",ended_event);
			}
		};
		let statechange_event=()=>{
			if(actx.state!="running" && [ST.PLAYING,ST.STOPWAIT].includes(_t._status)){
				_t._play_lock?.release();
				_t._status=ST.IDLE;
				src.disconnect();
				src.removeEventListener("statechange",statechange_event);
			}
		};		
		actx.addEventListener("statechange",statechange_event);
		src.addEventListener("ended",ended_event);
		_t._src=src;
		//console.log("PLAY1",this._status);
		await _t._play_lock?.wait();
		//console.log("PLAY2",this._status);
		TBSK_ASSERT(_t._status==ST.IDLE);
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
			this._src?.stop();
			_t._status=ST.STOPWAIT;
			await _t._play_lock?.wait();
			return;
		case ST.STOPWAIT:
			await _t._play_lock?.wait();
			return;
		case ST.IDLE:
			return;
		case ST.CLOSED:
		default:
			throw new TbskException();
		}
	}
}