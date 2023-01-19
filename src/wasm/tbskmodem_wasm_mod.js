
var Module = (() => {
  var _scriptDir = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : undefined;
  
  return (
function(Module) {
  Module = Module || {};

var Module = typeof Module != "undefined" ? Module : {};

var readyPromiseResolve, readyPromiseReject;

Module["ready"] = new Promise(function(resolve, reject) {
 readyPromiseResolve = resolve;
 readyPromiseReject = reject;
});

var moduleOverrides = Object.assign({}, Module);

var arguments_ = [];

var thisProgram = "./this.program";

var quit_ = (status, toThrow) => {
 throw toThrow;
};

var ENVIRONMENT_IS_WEB = true;

var ENVIRONMENT_IS_WORKER = false;

var scriptDirectory = "";

function locateFile(path) {
 if (Module["locateFile"]) {
  return Module["locateFile"](path, scriptDirectory);
 }
 return scriptDirectory + path;
}

var read_, readAsync, readBinary, setWindowTitle;

if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
 if (ENVIRONMENT_IS_WORKER) {
  scriptDirectory = self.location.href;
 } else if (typeof document != "undefined" && document.currentScript) {
  scriptDirectory = document.currentScript.src;
 }
 if (_scriptDir) {
  scriptDirectory = _scriptDir;
 }
 if (scriptDirectory.indexOf("blob:") !== 0) {
  scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
 } else {
  scriptDirectory = "";
 }
 {
  read_ = url => {
   var xhr = new XMLHttpRequest();
   xhr.open("GET", url, false);
   xhr.send(null);
   return xhr.responseText;
  };
  if (ENVIRONMENT_IS_WORKER) {
   readBinary = url => {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.responseType = "arraybuffer";
    xhr.send(null);
    return new Uint8Array(xhr.response);
   };
  }
  readAsync = (url, onload, onerror) => {
   var xhr = new XMLHttpRequest();
   xhr.open("GET", url, true);
   xhr.responseType = "arraybuffer";
   xhr.onload = () => {
    if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
     onload(xhr.response);
     return;
    }
    onerror();
   };
   xhr.onerror = onerror;
   xhr.send(null);
  };
 }
 setWindowTitle = title => document.title = title;
} else {}

var out = Module["print"] || console.log.bind(console);

var err = Module["printErr"] || console.warn.bind(console);

Object.assign(Module, moduleOverrides);

moduleOverrides = null;

if (Module["arguments"]) arguments_ = Module["arguments"];

if (Module["thisProgram"]) thisProgram = Module["thisProgram"];

if (Module["quit"]) quit_ = Module["quit"];

var POINTER_SIZE = 4;

var wasmBinary;

if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];

var noExitRuntime = Module["noExitRuntime"] || true;

if (typeof WebAssembly != "object") {
 abort("no native wasm support detected");
}

var wasmMemory;

var ABORT = false;

var EXITSTATUS;

function assert(condition, text) {
 if (!condition) {
  abort(text);
 }
}

var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf8") : undefined;

function UTF8ArrayToString(heapOrArray, idx, maxBytesToRead) {
 var endIdx = idx + maxBytesToRead;
 var endPtr = idx;
 while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
 if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
  return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
 }
 var str = "";
 while (idx < endPtr) {
  var u0 = heapOrArray[idx++];
  if (!(u0 & 128)) {
   str += String.fromCharCode(u0);
   continue;
  }
  var u1 = heapOrArray[idx++] & 63;
  if ((u0 & 224) == 192) {
   str += String.fromCharCode((u0 & 31) << 6 | u1);
   continue;
  }
  var u2 = heapOrArray[idx++] & 63;
  if ((u0 & 240) == 224) {
   u0 = (u0 & 15) << 12 | u1 << 6 | u2;
  } else {
   u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
  }
  if (u0 < 65536) {
   str += String.fromCharCode(u0);
  } else {
   var ch = u0 - 65536;
   str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
  }
 }
 return str;
}

function UTF8ToString(ptr, maxBytesToRead) {
 return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
}

function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
 if (!(maxBytesToWrite > 0)) return 0;
 var startIdx = outIdx;
 var endIdx = outIdx + maxBytesToWrite - 1;
 for (var i = 0; i < str.length; ++i) {
  var u = str.charCodeAt(i);
  if (u >= 55296 && u <= 57343) {
   var u1 = str.charCodeAt(++i);
   u = 65536 + ((u & 1023) << 10) | u1 & 1023;
  }
  if (u <= 127) {
   if (outIdx >= endIdx) break;
   heap[outIdx++] = u;
  } else if (u <= 2047) {
   if (outIdx + 1 >= endIdx) break;
   heap[outIdx++] = 192 | u >> 6;
   heap[outIdx++] = 128 | u & 63;
  } else if (u <= 65535) {
   if (outIdx + 2 >= endIdx) break;
   heap[outIdx++] = 224 | u >> 12;
   heap[outIdx++] = 128 | u >> 6 & 63;
   heap[outIdx++] = 128 | u & 63;
  } else {
   if (outIdx + 3 >= endIdx) break;
   heap[outIdx++] = 240 | u >> 18;
   heap[outIdx++] = 128 | u >> 12 & 63;
   heap[outIdx++] = 128 | u >> 6 & 63;
   heap[outIdx++] = 128 | u & 63;
  }
 }
 heap[outIdx] = 0;
 return outIdx - startIdx;
}

var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

function updateGlobalBufferAndViews(buf) {
 buffer = buf;
 Module["HEAP8"] = HEAP8 = new Int8Array(buf);
 Module["HEAP16"] = HEAP16 = new Int16Array(buf);
 Module["HEAP32"] = HEAP32 = new Int32Array(buf);
 Module["HEAPU8"] = HEAPU8 = new Uint8Array(buf);
 Module["HEAPU16"] = HEAPU16 = new Uint16Array(buf);
 Module["HEAPU32"] = HEAPU32 = new Uint32Array(buf);
 Module["HEAPF32"] = HEAPF32 = new Float32Array(buf);
 Module["HEAPF64"] = HEAPF64 = new Float64Array(buf);
}

var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 16777216;

var wasmTable;

var __ATPRERUN__ = [];

var __ATINIT__ = [];

var __ATPOSTRUN__ = [];

var runtimeInitialized = false;

function preRun() {
 if (Module["preRun"]) {
  if (typeof Module["preRun"] == "function") Module["preRun"] = [ Module["preRun"] ];
  while (Module["preRun"].length) {
   addOnPreRun(Module["preRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPRERUN__);
}

function initRuntime() {
 runtimeInitialized = true;
 callRuntimeCallbacks(__ATINIT__);
}

function postRun() {
 if (Module["postRun"]) {
  if (typeof Module["postRun"] == "function") Module["postRun"] = [ Module["postRun"] ];
  while (Module["postRun"].length) {
   addOnPostRun(Module["postRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
 __ATPRERUN__.unshift(cb);
}

function addOnInit(cb) {
 __ATINIT__.unshift(cb);
}

function addOnPostRun(cb) {
 __ATPOSTRUN__.unshift(cb);
}

var runDependencies = 0;

var runDependencyWatcher = null;

var dependenciesFulfilled = null;

function addRunDependency(id) {
 runDependencies++;
 if (Module["monitorRunDependencies"]) {
  Module["monitorRunDependencies"](runDependencies);
 }
}

function removeRunDependency(id) {
 runDependencies--;
 if (Module["monitorRunDependencies"]) {
  Module["monitorRunDependencies"](runDependencies);
 }
 if (runDependencies == 0) {
  if (runDependencyWatcher !== null) {
   clearInterval(runDependencyWatcher);
   runDependencyWatcher = null;
  }
  if (dependenciesFulfilled) {
   var callback = dependenciesFulfilled;
   dependenciesFulfilled = null;
   callback();
  }
 }
}

function abort(what) {
 if (Module["onAbort"]) {
  Module["onAbort"](what);
 }
 what = "Aborted(" + what + ")";
 err(what);
 ABORT = true;
 EXITSTATUS = 1;
 what += ". Build with -sASSERTIONS for more info.";
 ___trap();
}

var dataURIPrefix = "data:application/octet-stream;base64,";

function isDataURI(filename) {
 return filename.startsWith(dataURIPrefix);
}

var wasmBinaryFile;

wasmBinaryFile = "tbskmodem_wasm_mod.wasm";

if (!isDataURI(wasmBinaryFile)) {
 wasmBinaryFile = locateFile(wasmBinaryFile);
}

function getBinary(file) {
 try {
  if (file == wasmBinaryFile && wasmBinary) {
   return new Uint8Array(wasmBinary);
  }
  if (readBinary) {
   return readBinary(file);
  }
  throw "both async and sync fetching of the wasm failed";
 } catch (err) {
  abort(err);
 }
}

function getBinaryPromise() {
 if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
  if (typeof fetch == "function") {
   return fetch(wasmBinaryFile, {
    credentials: "same-origin"
   }).then(function(response) {
    if (!response["ok"]) {
     throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
    }
    return response["arrayBuffer"]();
   }).catch(function() {
    return getBinary(wasmBinaryFile);
   });
  }
 }
 return Promise.resolve().then(function() {
  return getBinary(wasmBinaryFile);
 });
}

function createWasm() {
 var info = {
  "env": asmLibraryArg,
  "wasi_snapshot_preview1": asmLibraryArg
 };
 function receiveInstance(instance, module) {
  var exports = instance.exports;
  Module["asm"] = exports;
  wasmMemory = Module["asm"]["memory"];
  updateGlobalBufferAndViews(wasmMemory.buffer);
  wasmTable = Module["asm"]["__indirect_function_table"];
  addOnInit(Module["asm"]["__wasm_call_ctors"]);
  removeRunDependency("wasm-instantiate");
 }
 addRunDependency("wasm-instantiate");
 function receiveInstantiationResult(result) {
  receiveInstance(result["instance"]);
 }
 function instantiateArrayBuffer(receiver) {
  return getBinaryPromise().then(function(binary) {
   return WebAssembly.instantiate(binary, info);
  }).then(function(instance) {
   return instance;
  }).then(receiver, function(reason) {
   err("failed to asynchronously prepare wasm: " + reason);
   abort(reason);
  });
 }
 function instantiateAsync() {
  if (!wasmBinary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(wasmBinaryFile) && typeof fetch == "function") {
   return fetch(wasmBinaryFile, {
    credentials: "same-origin"
   }).then(function(response) {
    var result = WebAssembly.instantiateStreaming(response, info);
    return result.then(receiveInstantiationResult, function(reason) {
     err("wasm streaming compile failed: " + reason);
     err("falling back to ArrayBuffer instantiation");
     return instantiateArrayBuffer(receiveInstantiationResult);
    });
   });
  } else {
   return instantiateArrayBuffer(receiveInstantiationResult);
  }
 }
 if (Module["instantiateWasm"]) {
  try {
   var exports = Module["instantiateWasm"](info, receiveInstance);
   return exports;
  } catch (e) {
   err("Module.instantiateWasm callback failed with error: " + e);
   readyPromiseReject(e);
  }
 }
 instantiateAsync().catch(readyPromiseReject);
 return {};
}

var tempDouble;

var tempI64;

function callRuntimeCallbacks(callbacks) {
 while (callbacks.length > 0) {
  callbacks.shift()(Module);
 }
}

function _TBSKmodem_api_load_() {
 let MOD = Module;
 if ("tbskmodem" in MOD) {
  console.log("tbskmodem api is already initialized.");
  return;
 }
 console.log("Start tbskmodem initialize.");
 function set_default(a, v) {
  return a === undefined || a === null ? v : a;
 }
 class Disposable {
  dispose() {}
 }
 class WasmProxy extends Disposable {
  constructor(wasm_instance) {
   super();
   this._wasm_instance = wasm_instance;
  }
  dispose() {
   MOD._wasm_tbskmodem_Dispose(this._wasm_instance);
   this._wasm_instance = null;
   super.dispose();
  }
 }
 class IntInputIterator extends WasmProxy {
  constructor() {
   super(MOD._wasm_tbskmodem_IntInputIterator());
  }
  put(v) {
   MOD._wasm_tbskmodem_IntInputIterator_put(this._wasm_instance, v);
   return this;
  }
  puts(v) {
   for (var i = 0; i < v.length; i++) {
    this.put(v[i] & 255);
   }
   return this;
  }
 }
 class DoubleInputIterator extends WasmProxy {
  constructor(is_recoverable = false) {
   super(MOD._wasm_tbskmodem_DoubleInputIterator(is_recoverable));
  }
  put(v) {
   MOD._wasm_tbskmodem_DoubleInputIterator_put(this._wasm_instance, v);
   return this;
  }
  puts(v) {
   for (var i = 0; i < v.length; i++) {
    this.put(v[i]);
   }
   return this;
  }
 }
 class BasicOutputIterator extends WasmProxy {
  constructor(wasm_instance) {
   super(wasm_instance);
  }
  toArray() {
   let r = [];
   try {
    for (;;) {
     r.push(this.next());
    }
   } catch (e) {
    if (e instanceof StopIteration) {} else {
     console.log(e);
     throw e;
    }
   }
   return r;
  }
 }
 class DoubleOutputIterator extends BasicOutputIterator {
  constructor(wasm_instance) {
   super(wasm_instance);
  }
  next() {
   let s = MOD._wasm_tbskmodem_DoubleOutputIterator_hasNext(this._wasm_instance);
   switch (s) {
   case 0:
    return MOD._wasm_tbskmodem_DoubleOutputIterator_lastNext(this._wasm_instance);

   case 1:
    throw new RecoverableStopIteration();

   case 2:
    throw new StopIteration();

   default:
    throw new Error();
   }
  }
 }
 class IntOutputIterator extends BasicOutputIterator {
  constructor(wasm_instance) {
   super(wasm_instance);
  }
  next() {
   let s = MOD._wasm_tbskmodem_IntOutputIterator_hasNext(this._wasm_instance);
   switch (s) {
   case 0:
    return MOD._wasm_tbskmodem_IntOutputIterator_lastNext(this._wasm_instance);

   case 1:
    throw new RecoverableStopIteration();

   case 2:
    throw new StopIteration();

   default:
    throw new Error();
   }
  }
 }
 class StopIteration extends Error {}
 class RecoverableStopIteration extends StopIteration {}
 class TraitTone extends WasmProxy {
  constructor(double_array) {
   super(MOD._wasm_tbskmodem_TraitTone());
  }
 }
 class SieTone extends WasmProxy {
  constructor(poinsts, cycle) {
   let _cycle = set_default(cycle, 1);
   super(MOD._wasm_tbskmodemm_SinTone(points, _cycle));
  }
 }
 class XPskSinTone extends WasmProxy {
  constructor(poinsts, cycle, div) {
   let _cycle = set_default(cycle, 1);
   let _div = set_default(div, 8);
   super(MOD._wasm_tbskmodem_XPskSinTone(poinsts, _cycle, _div));
  }
 }
 class CoffPreamble extends WasmProxy {
  constructor(tone, threshold, cycle) {
   let _threshold = set_default(threshold, 1);
   let _cycle = set_default(cycle, 4);
   super(MOD._wasm_tbskmodem_CoffPreamble(tone._wasm_instance, _threshold, _cycle));
  }
 }
 class PassDecoder {
  reset() {}
  put(data) {
   return data;
  }
 }
 class Utf8Decoder {
  constructor() {
   this._decoder = new TextDecoder("utf8", {
    fatal: true
   });
   this._q = [];
   this._tmp = [];
  }
  reset() {
   this._q = [];
   this._tmp = [];
  }
  put(data) {
   for (let i = 0; i < data.length; i++) {
    this._q.push(data[i]);
   }
   let ret = [];
   ML: while (this._q.length > 0) {
    for (var i = 0; i < this._q.length; i++) {
     try {
      let inp = new Uint8Array(this._q.slice(0, i + 1));
      ret.push(this._decoder.decode(inp));
      this._q = this._q.slice(i + 1);
      continue ML;
     } catch (e) {
      if (i > 8) {
       ret.push(this._q[0]);
       this._q = this._q.slice(1);
       continue ML;
      }
     }
    }
    break;
   }
   if (ret.length > 0) {
    return ret;
   }
   return undefined;
  }
 }
 class TbskModulator extends WasmProxy {
  constructor(tone, preamble) {
   super(MOD._wasm_tbskmodem_TbskModulator(tone._wasm_instance, preamble._wasm_instance));
  }
  modulate(src) {
   var buf = new IntInputIterator();
   try {
    if (typeof src == "string") {
     let te = new TextEncoder();
     buf.puts(te.encode(src));
    } else {
     buf.puts(src);
    }
    let wi = MOD._wasm_tbskmodem_TbskModulator_Modulate_A(this._wasm_instance, buf._wasm_instance);
    if (wi == null) {
     throw new Error();
    }
    let out = new DoubleOutputIterator(wi);
    try {
     return out.toArray();
    } finally {
     out.dispose();
    }
   } finally {
    buf.dispose();
   }
  }
  modulate2AudioBuffer(actx, src, sampleRate) {
   let f32_array = this.modulate(src);
   let buf = actx.createBuffer(1, f32_array.length, sampleRate);
   buf.getChannelData(0).set(f32_array);
   return buf;
  }
 }
 class TbskDemodulator extends WasmProxy {
  constructor(tone, preamble) {
   super(MOD._wasm_tbskmodem_TbskDemodulator(tone._wasm_instance, preamble._wasm_instance));
  }
  _demodulateAsInt(buf) {
   let r = MOD._wasm_tbskmodem_TbskDemodulator_DemodulateAsInt(this._wasm_instance, buf._wasm_instance);
   if (r == 0) {
    return null;
   }
   return new IntOutputIterator(r);
  }
  demodulate(src, decoder = undefined) {
   if (decoder == "utf8") {
    decoder = new Utf8Decoder();
   } else {
    decoder = new PassDecoder();
   }
   let buf = new DoubleInputIterator();
   try {
    buf.puts(src);
    let out = this._demodulateAsInt(buf);
    if (out == null) {
     return [];
    }
    try {
     if (decoder) {
      return decoder.put(out.toArray());
     } else {
      return out.toArray();
     }
    } finally {
     out.dispose();
    }
   } finally {
    buf.dispose();
   }
  }
  _demodulateAsInt_B(src) {
   let r = MOD._wasm_tbskmodem_TbskDemodulator_DemodulateAsInt_B(this._wasm_instance, src._wasm_instance);
   if (r == 0) {
    return null;
   }
   return new DemodulateResult(r);
  }
 }
 class DemodulateResult extends WasmProxy {
  constructor(wasm_instance) {
   super(wasm_instance);
  }
  getType() {
   return MOD._wasm_tbskmodem_TbskDemodulator_DemodulateResult_GetType(this._wasm_instance);
  }
  getOutput() {
   return new IntOutputIterator(MOD._wasm_tbskmodem_TbskDemodulator_DemodulateResult_GetOutput(this._wasm_instance));
  }
  getRecover() {
   let wi = MOD._wasm_tbskmodem_TbskDemodulator_DemodulateResult_Recover(this._wasm_instance);
   if (wi == 0) {
    return null;
   }
   return new IntOutputIterator(wi);
  }
 }
 class TbskListener extends Disposable {
  constructor(tone, preamble, events = {}, decoder = undefined) {
   super();
   if (!("onStart" in events)) {
    events.onStart = null;
   }
   if (!("onData" in events)) {
    events.onData = null;
   }
   if (!("onEnd" in events)) {
    events.onEnd = null;
   }
   let _t = this;
   this._decoder = decoder == "utf8" ? new Utf8Decoder() : new PassDecoder();
   this._demod = new TbskDemodulator(tone, preamble);
   this._input_buf = new DoubleInputIterator(true);
   this._callOnStart = () => {
    new Promise(resolve => {
     resolve();
    }).then(() => {
     if (events.onStart) {
      events.onStart();
     }
    });
   };
   this._callOnData = data => {
    new Promise(resolve => {
     resolve();
    }).then(() => {
     if (events.onData) {
      events.onData(data);
     }
    });
   };
   this._callOnEnd = () => {
    new Promise(resolve => {
     resolve();
    }).then(() => {
     if (events.onEnd) {
      events.onEnd();
     }
    });
   };
  }
  dispose() {
   if (this._currentGenerator) {
    this._currentGenerator.dispose();
   }
   this._demod.dispose();
   this._input_buf.dispose();
  }
  push(src) {
   function* workflow(demod, input_buf, callOnStart, callOnData, callOnEnd, decoder) {
    decoder.reset();
    let out_buf = null;
    let dresult = null;
    dresult = demod._demodulateAsInt_B(input_buf);
    yield function() {
     out_buf.dispose();
     dresult.dispose();
     out_buf = null;
     dresult = null;
    };
    if (dresult == null) {
     console.error("input err");
     return;
    }
    try {
     switch (dresult.getType()) {
     case 1:
      out_buf = dresult.getOutput();
      break;

     case 2:
      for (;;) {
       out_buf = dresult.getRecover();
       if (out_buf != null) {
        break;
       }
       yield;
      }
      break;

     default:
      console.error("unknown type.");
      return;
     }
    } finally {
     dresult.dispose();
     dresult = null;
    }
    console.log("Signal detected!");
    callOnStart();
    let ra = [];
    for (;;) {
     try {
      for (;;) {
       let w = out_buf.next();
       ra.push(w);
      }
     } catch (e) {
      if (e instanceof RecoverableStopIteration) {
       if (ra.length > 0) {
        console.log("data:");
        if (decoder) {
         let rd = decoder.put(ra);
         if (rd) {
          callOnData(rd);
         }
        } else {
         callOnData(ra);
        }
        ra = [];
       }
       yield;
       continue;
      } else if (e instanceof StopIteration) {
       if (ra.length > 0) {
        console.log("data:");
        if (decoder) {
         let rd = decoder.put(ra);
         if (rd) {
          callOnData(rd);
         }
        } else {
         callOnData(ra);
        }
        ra = [];
       }
       console.log("Signal lost!");
       callOnEnd();
      }
     }
     out_buf.dispose();
     out_buf = null;
     return;
    }
   }
   this._input_buf.puts(src);
   if (this._currentGenerator == null) {
    this._currentGenerator = workflow(this._demod, this._input_buf, this._callOnStart, this._callOnData, this._callOnEnd, this._decoder);
    this._currentGenerator.dispose = this._currentGenerator.next();
   }
   if (this._currentGenerator.next().done) {
    this._currentGenerator = null;
   }
  }
 }
 class PcmData extends WasmProxy {
  constructor(wasm_instance) {
   super(wasm_instance);
  }
  static create(float_data, sample_bits, frame_rate) {
   let input_src = new DoubleInputIterator();
   input_src.puts(float_data);
   return new PcmData(MOD._wasm_tbskmodem_PcmData_2(input_src._wasm_instance, sample_bits, frame_rate));
  }
  dump() {
   let iter = new IntOutputIterator(MOD._wasm_tbskmodem_PcmData_Dump(this._wasm_instance));
   return new Uint8Array(iter.toArray());
  }
 }
 MOD.tbskmodem = {
  getPointerHolderSize: function() {
   return MOD._wasm_tbskmodem_PointerHolder_Size();
  },
  Utf8Decoder: Utf8Decoder,
  WasmProxy: WasmProxy,
  StopIteration: StopIteration,
  IntInputIterator: IntInputIterator,
  DoubleInputIterator: DoubleInputIterator,
  IntOutputIterator: IntOutputIterator,
  DoubleOutputIterator: DoubleOutputIterator,
  TraitTone: TraitTone,
  SieTone: SieTone,
  XPskSinTone: XPskSinTone,
  CoffPreamble: CoffPreamble,
  TbskModulator: TbskModulator,
  TbskDemodulator: TbskDemodulator,
  TbskListener: TbskListener,
  PcmData: PcmData
 };
 console.log("tbskmodem initialized.", this._instance);
 return this._instance;
}

function ___assert_fail(condition, filename, line, func) {
 abort("Assertion failed: " + UTF8ToString(condition) + ", at: " + [ filename ? UTF8ToString(filename) : "unknown filename", line, func ? UTF8ToString(func) : "unknown function" ]);
}

function _abort() {
 abort("");
}

function _emscripten_memcpy_big(dest, src, num) {
 HEAPU8.copyWithin(dest, src, src + num);
}

function abortOnCannotGrowMemory(requestedSize) {
 abort("OOM");
}

function _emscripten_resize_heap(requestedSize) {
 var oldSize = HEAPU8.length;
 requestedSize = requestedSize >>> 0;
 abortOnCannotGrowMemory(requestedSize);
}

var asmLibraryArg = {
 "TBSKmodem_api_load_": _TBSKmodem_api_load_,
 "__assert_fail": ___assert_fail,
 "abort": _abort,
 "emscripten_memcpy_big": _emscripten_memcpy_big,
 "emscripten_resize_heap": _emscripten_resize_heap
};

var asm = createWasm();

var ___wasm_call_ctors = Module["___wasm_call_ctors"] = function() {
 return (___wasm_call_ctors = Module["___wasm_call_ctors"] = Module["asm"]["__wasm_call_ctors"]).apply(null, arguments);
};

var _wasm_tbskmodem_VERSION = Module["_wasm_tbskmodem_VERSION"] = function() {
 return (_wasm_tbskmodem_VERSION = Module["_wasm_tbskmodem_VERSION"] = Module["asm"]["wasm_tbskmodem_VERSION"]).apply(null, arguments);
};

var _wasm_tbskmodem_malloc = Module["_wasm_tbskmodem_malloc"] = function() {
 return (_wasm_tbskmodem_malloc = Module["_wasm_tbskmodem_malloc"] = Module["asm"]["wasm_tbskmodem_malloc"]).apply(null, arguments);
};

var _malloc = Module["_malloc"] = function() {
 return (_malloc = Module["_malloc"] = Module["asm"]["malloc"]).apply(null, arguments);
};

var _wasm_tbskmodem_free = Module["_wasm_tbskmodem_free"] = function() {
 return (_wasm_tbskmodem_free = Module["_wasm_tbskmodem_free"] = Module["asm"]["wasm_tbskmodem_free"]).apply(null, arguments);
};

var _free = Module["_free"] = function() {
 return (_free = Module["_free"] = Module["asm"]["free"]).apply(null, arguments);
};

var _wasm_tbskmodem_putInt = Module["_wasm_tbskmodem_putInt"] = function() {
 return (_wasm_tbskmodem_putInt = Module["_wasm_tbskmodem_putInt"] = Module["asm"]["wasm_tbskmodem_putInt"]).apply(null, arguments);
};

var _wasm_tbskmodem_getInt = Module["_wasm_tbskmodem_getInt"] = function() {
 return (_wasm_tbskmodem_getInt = Module["_wasm_tbskmodem_getInt"] = Module["asm"]["wasm_tbskmodem_getInt"]).apply(null, arguments);
};

var _wasm_tbskmodem_PointerHolder_Size = Module["_wasm_tbskmodem_PointerHolder_Size"] = function() {
 return (_wasm_tbskmodem_PointerHolder_Size = Module["_wasm_tbskmodem_PointerHolder_Size"] = Module["asm"]["wasm_tbskmodem_PointerHolder_Size"]).apply(null, arguments);
};

var _wasm_tbskmodem_Dispose = Module["_wasm_tbskmodem_Dispose"] = function() {
 return (_wasm_tbskmodem_Dispose = Module["_wasm_tbskmodem_Dispose"] = Module["asm"]["wasm_tbskmodem_Dispose"]).apply(null, arguments);
};

var _wasm_tbskmodem_IntInputIterator = Module["_wasm_tbskmodem_IntInputIterator"] = function() {
 return (_wasm_tbskmodem_IntInputIterator = Module["_wasm_tbskmodem_IntInputIterator"] = Module["asm"]["wasm_tbskmodem_IntInputIterator"]).apply(null, arguments);
};

var _wasm_tbskmodem_IntInputIterator_put = Module["_wasm_tbskmodem_IntInputIterator_put"] = function() {
 return (_wasm_tbskmodem_IntInputIterator_put = Module["_wasm_tbskmodem_IntInputIterator_put"] = Module["asm"]["wasm_tbskmodem_IntInputIterator_put"]).apply(null, arguments);
};

var _wasm_tbskmodem_DoubleInputIterator = Module["_wasm_tbskmodem_DoubleInputIterator"] = function() {
 return (_wasm_tbskmodem_DoubleInputIterator = Module["_wasm_tbskmodem_DoubleInputIterator"] = Module["asm"]["wasm_tbskmodem_DoubleInputIterator"]).apply(null, arguments);
};

var _wasm_tbskmodem_DoubleInputIterator_put = Module["_wasm_tbskmodem_DoubleInputIterator_put"] = function() {
 return (_wasm_tbskmodem_DoubleInputIterator_put = Module["_wasm_tbskmodem_DoubleInputIterator_put"] = Module["asm"]["wasm_tbskmodem_DoubleInputIterator_put"]).apply(null, arguments);
};

var _wasm_tbskmodem_IntOutputIterator_hasNext = Module["_wasm_tbskmodem_IntOutputIterator_hasNext"] = function() {
 return (_wasm_tbskmodem_IntOutputIterator_hasNext = Module["_wasm_tbskmodem_IntOutputIterator_hasNext"] = Module["asm"]["wasm_tbskmodem_IntOutputIterator_hasNext"]).apply(null, arguments);
};

var _wasm_tbskmodem_IntOutputIterator_lastNext = Module["_wasm_tbskmodem_IntOutputIterator_lastNext"] = function() {
 return (_wasm_tbskmodem_IntOutputIterator_lastNext = Module["_wasm_tbskmodem_IntOutputIterator_lastNext"] = Module["asm"]["wasm_tbskmodem_IntOutputIterator_lastNext"]).apply(null, arguments);
};

var _wasm_tbskmodem_DoubleOutputIterator_hasNext = Module["_wasm_tbskmodem_DoubleOutputIterator_hasNext"] = function() {
 return (_wasm_tbskmodem_DoubleOutputIterator_hasNext = Module["_wasm_tbskmodem_DoubleOutputIterator_hasNext"] = Module["asm"]["wasm_tbskmodem_DoubleOutputIterator_hasNext"]).apply(null, arguments);
};

var _wasm_tbskmodem_DoubleOutputIterator_lastNext = Module["_wasm_tbskmodem_DoubleOutputIterator_lastNext"] = function() {
 return (_wasm_tbskmodem_DoubleOutputIterator_lastNext = Module["_wasm_tbskmodem_DoubleOutputIterator_lastNext"] = Module["asm"]["wasm_tbskmodem_DoubleOutputIterator_lastNext"]).apply(null, arguments);
};

var _wasm_tbskmodem_TraitTone = Module["_wasm_tbskmodem_TraitTone"] = function() {
 return (_wasm_tbskmodem_TraitTone = Module["_wasm_tbskmodem_TraitTone"] = Module["asm"]["wasm_tbskmodem_TraitTone"]).apply(null, arguments);
};

var _wasm_tbskmodem_SinTone = Module["_wasm_tbskmodem_SinTone"] = function() {
 return (_wasm_tbskmodem_SinTone = Module["_wasm_tbskmodem_SinTone"] = Module["asm"]["wasm_tbskmodem_SinTone"]).apply(null, arguments);
};

var _wasm_tbskmodem_XPskSinTone = Module["_wasm_tbskmodem_XPskSinTone"] = function() {
 return (_wasm_tbskmodem_XPskSinTone = Module["_wasm_tbskmodem_XPskSinTone"] = Module["asm"]["wasm_tbskmodem_XPskSinTone"]).apply(null, arguments);
};

var _wasm_tbskmodem_CoffPreamble = Module["_wasm_tbskmodem_CoffPreamble"] = function() {
 return (_wasm_tbskmodem_CoffPreamble = Module["_wasm_tbskmodem_CoffPreamble"] = Module["asm"]["wasm_tbskmodem_CoffPreamble"]).apply(null, arguments);
};

var _wasm_tbskmodem_TbskModulator = Module["_wasm_tbskmodem_TbskModulator"] = function() {
 return (_wasm_tbskmodem_TbskModulator = Module["_wasm_tbskmodem_TbskModulator"] = Module["asm"]["wasm_tbskmodem_TbskModulator"]).apply(null, arguments);
};

var _wasm_tbskmodem_TbskModulator_Modulate_A = Module["_wasm_tbskmodem_TbskModulator_Modulate_A"] = function() {
 return (_wasm_tbskmodem_TbskModulator_Modulate_A = Module["_wasm_tbskmodem_TbskModulator_Modulate_A"] = Module["asm"]["wasm_tbskmodem_TbskModulator_Modulate_A"]).apply(null, arguments);
};

var _wasm_tbskmodem_TbskDemodulator = Module["_wasm_tbskmodem_TbskDemodulator"] = function() {
 return (_wasm_tbskmodem_TbskDemodulator = Module["_wasm_tbskmodem_TbskDemodulator"] = Module["asm"]["wasm_tbskmodem_TbskDemodulator"]).apply(null, arguments);
};

var _wasm_tbskmodem_TbskDemodulator_DemodulateAsInt = Module["_wasm_tbskmodem_TbskDemodulator_DemodulateAsInt"] = function() {
 return (_wasm_tbskmodem_TbskDemodulator_DemodulateAsInt = Module["_wasm_tbskmodem_TbskDemodulator_DemodulateAsInt"] = Module["asm"]["wasm_tbskmodem_TbskDemodulator_DemodulateAsInt"]).apply(null, arguments);
};

var _wasm_tbskmodem_TbskDemodulator_DemodulateAsInt_B = Module["_wasm_tbskmodem_TbskDemodulator_DemodulateAsInt_B"] = function() {
 return (_wasm_tbskmodem_TbskDemodulator_DemodulateAsInt_B = Module["_wasm_tbskmodem_TbskDemodulator_DemodulateAsInt_B"] = Module["asm"]["wasm_tbskmodem_TbskDemodulator_DemodulateAsInt_B"]).apply(null, arguments);
};

var _wasm_tbskmodem_TbskDemodulator_DemodulateResult_GetType = Module["_wasm_tbskmodem_TbskDemodulator_DemodulateResult_GetType"] = function() {
 return (_wasm_tbskmodem_TbskDemodulator_DemodulateResult_GetType = Module["_wasm_tbskmodem_TbskDemodulator_DemodulateResult_GetType"] = Module["asm"]["wasm_tbskmodem_TbskDemodulator_DemodulateResult_GetType"]).apply(null, arguments);
};

var _wasm_tbskmodem_TbskDemodulator_DemodulateResult_GetOutput = Module["_wasm_tbskmodem_TbskDemodulator_DemodulateResult_GetOutput"] = function() {
 return (_wasm_tbskmodem_TbskDemodulator_DemodulateResult_GetOutput = Module["_wasm_tbskmodem_TbskDemodulator_DemodulateResult_GetOutput"] = Module["asm"]["wasm_tbskmodem_TbskDemodulator_DemodulateResult_GetOutput"]).apply(null, arguments);
};

var _wasm_tbskmodem_TbskDemodulator_DemodulateResult_Recover = Module["_wasm_tbskmodem_TbskDemodulator_DemodulateResult_Recover"] = function() {
 return (_wasm_tbskmodem_TbskDemodulator_DemodulateResult_Recover = Module["_wasm_tbskmodem_TbskDemodulator_DemodulateResult_Recover"] = Module["asm"]["wasm_tbskmodem_TbskDemodulator_DemodulateResult_Recover"]).apply(null, arguments);
};

var _wasm_tbskmodem_PcmData_1 = Module["_wasm_tbskmodem_PcmData_1"] = function() {
 return (_wasm_tbskmodem_PcmData_1 = Module["_wasm_tbskmodem_PcmData_1"] = Module["asm"]["wasm_tbskmodem_PcmData_1"]).apply(null, arguments);
};

var _wasm_tbskmodem_PcmData_2 = Module["_wasm_tbskmodem_PcmData_2"] = function() {
 return (_wasm_tbskmodem_PcmData_2 = Module["_wasm_tbskmodem_PcmData_2"] = Module["asm"]["wasm_tbskmodem_PcmData_2"]).apply(null, arguments);
};

var _wasm_tbskmodem_PcmData_GetSampleBits = Module["_wasm_tbskmodem_PcmData_GetSampleBits"] = function() {
 return (_wasm_tbskmodem_PcmData_GetSampleBits = Module["_wasm_tbskmodem_PcmData_GetSampleBits"] = Module["asm"]["wasm_tbskmodem_PcmData_GetSampleBits"]).apply(null, arguments);
};

var _wasm_tbskmodem_PcmData_GetFramerate = Module["_wasm_tbskmodem_PcmData_GetFramerate"] = function() {
 return (_wasm_tbskmodem_PcmData_GetFramerate = Module["_wasm_tbskmodem_PcmData_GetFramerate"] = Module["asm"]["wasm_tbskmodem_PcmData_GetFramerate"]).apply(null, arguments);
};

var _wasm_tbskmodem_PcmData_GetByteslen = Module["_wasm_tbskmodem_PcmData_GetByteslen"] = function() {
 return (_wasm_tbskmodem_PcmData_GetByteslen = Module["_wasm_tbskmodem_PcmData_GetByteslen"] = Module["asm"]["wasm_tbskmodem_PcmData_GetByteslen"]).apply(null, arguments);
};

var _wasm_tbskmodem_PcmData_DataAsFloat = Module["_wasm_tbskmodem_PcmData_DataAsFloat"] = function() {
 return (_wasm_tbskmodem_PcmData_DataAsFloat = Module["_wasm_tbskmodem_PcmData_DataAsFloat"] = Module["asm"]["wasm_tbskmodem_PcmData_DataAsFloat"]).apply(null, arguments);
};

var _wasm_tbskmodem_PcmData_Dump = Module["_wasm_tbskmodem_PcmData_Dump"] = function() {
 return (_wasm_tbskmodem_PcmData_Dump = Module["_wasm_tbskmodem_PcmData_Dump"] = Module["asm"]["wasm_tbskmodem_PcmData_Dump"]).apply(null, arguments);
};

var _load_apis = Module["_load_apis"] = function() {
 return (_load_apis = Module["_load_apis"] = Module["asm"]["load_apis"]).apply(null, arguments);
};

var ___errno_location = Module["___errno_location"] = function() {
 return (___errno_location = Module["___errno_location"] = Module["asm"]["__errno_location"]).apply(null, arguments);
};

var ___trap = Module["___trap"] = function() {
 return (___trap = Module["___trap"] = Module["asm"]["__trap"]).apply(null, arguments);
};

var _setThrew = Module["_setThrew"] = function() {
 return (_setThrew = Module["_setThrew"] = Module["asm"]["setThrew"]).apply(null, arguments);
};

var stackSave = Module["stackSave"] = function() {
 return (stackSave = Module["stackSave"] = Module["asm"]["stackSave"]).apply(null, arguments);
};

var stackRestore = Module["stackRestore"] = function() {
 return (stackRestore = Module["stackRestore"] = Module["asm"]["stackRestore"]).apply(null, arguments);
};

var stackAlloc = Module["stackAlloc"] = function() {
 return (stackAlloc = Module["stackAlloc"] = Module["asm"]["stackAlloc"]).apply(null, arguments);
};

var dynCall_ji = Module["dynCall_ji"] = function() {
 return (dynCall_ji = Module["dynCall_ji"] = Module["asm"]["dynCall_ji"]).apply(null, arguments);
};

var calledRun;

dependenciesFulfilled = function runCaller() {
 if (!calledRun) run();
 if (!calledRun) dependenciesFulfilled = runCaller;
};

function run(args) {
 args = args || arguments_;
 if (runDependencies > 0) {
  return;
 }
 preRun();
 if (runDependencies > 0) {
  return;
 }
 function doRun() {
  if (calledRun) return;
  calledRun = true;
  Module["calledRun"] = true;
  if (ABORT) return;
  initRuntime();
  readyPromiseResolve(Module);
  if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
  postRun();
 }
 if (Module["setStatus"]) {
  Module["setStatus"]("Running...");
  setTimeout(function() {
   setTimeout(function() {
    Module["setStatus"]("");
   }, 1);
   doRun();
  }, 1);
 } else {
  doRun();
 }
}

if (Module["preInit"]) {
 if (typeof Module["preInit"] == "function") Module["preInit"] = [ Module["preInit"] ];
 while (Module["preInit"].length > 0) {
  Module["preInit"].pop()();
 }
}

run();


  return Module.ready
}
);
})();
if (typeof exports === 'object' && typeof module === 'object')
  module.exports = Module;
else if (typeof define === 'function' && define['amd'])
  define([], function() { return Module; });
else if (typeof exports === 'object')
  exports["Module"] = Module;
