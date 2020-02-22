import '../../global-this.js';

import {
  toByteArray as decodeJS,
  fromByteArray as encodeJS
} from '../../index.js';

const WASM = `
AGFzbQEAAAABFgRgAABgAX8Bf2ACf38Bf2ADf39/AX8DBgUAAQIBAwQFAXABAQEFAwEAAgYhBX8BQdCK
BAt/AEGACAt/AEHBCgt/AEGACAt/AEHQigQLB5wBCgZtZW1vcnkCABFfX3dhc21fY2FsbF9jdG9ycwAA
EEJhc2U2NGRlY29kZV9sZW4AAQxCYXNlNjRkZWNvZGUAAhBCYXNlNjRlbmNvZGVfbGVuAAMMQmFzZTY0
ZW5jb2RlAAQMX19kc29faGFuZGxlAwEKX19kYXRhX2VuZAMCDV9fZ2xvYmFsX2Jhc2UDAwtfX2hlYXBf
YmFzZQMECqoHBQIACz4BA38gACEBA0AgAS0AACECIAFBAWoiAyEBIAJBgIiAgABqLQAAQcAASQ0ACyAD
IABrQQJqQQRtQQNsQQFqC9gDAQZ/IAEhAgNAIAItAAAhAyACQQFqIgQhAiADQYCIgIAAai0AAEHAAEkN
AAsgBCABQX9zaiICQQNqQQRtIQUCQCACQQVIDQAgBCABayIGQXpqIQcDQCAAIAFBAWoiAy0AAEGAiICA
AGotAABBBHYgAS0AAEGAiICAAGotAABBAnRyOgAAIABBAWogAUECaiIELQAAQYCIgIAAai0AAEECdiAD
LQAAQYCIgIAAai0AAEEEdHI6AAAgAEECaiABQQNqLQAAQYCIgIAAai0AACAELQAAQYCIgIAAai0AAEEG
dHI6AAAgAEEDaiEAIAFBBGohASACQXxqIgJBBEoNAAsgBiAHQXxxa0F7aiECCyAFQQNsIQMCQCACQQJI
DQAgACABLQABQYCIgIAAai0AAEEEdiABLQAAQYCIgIAAai0AAEECdHI6AAACQCACQQJHDQAgAEEBaiEA
DAELIAAgAS0AAkGAiICAAGotAABBAnYgAS0AAUGAiICAAGotAABBBHRyOgABAkAgAkEETg0AIABBAmoh
AAwBCyAAIAEtAANBgIiAgABqLQAAIAEtAAJBgIiAgABqLQAAQQZ0cjoAAiAAQQNqIQALIABBADoAACAD
QQAgAmtBA3FrCxAAIABBAmpBA21BAnRBAXIL+gIBBX9BACEDAkACQCACQX5qIgRBAU4NACAAIQUMAQsg
ACEFA0AgBSABIANqIgYtAABBAnZBgIqAgABqLQAAOgAAIAVBAWogBi0AAEEEdEEwcSAGQQFqIgctAABB
BHZyQYCKgIAAai0AADoAACAFQQJqIActAABBAnRBPHEgBkECaiIGLQAAQQZ2ckGAioCAAGotAAA6AAAg
BUEDaiAGLQAAQT9xQYCKgIAAai0AADoAACAFQQRqIQUgA0EDaiIDIARIDQALCwJAIAMgAk4NACAFIAEg
A2oiBi0AAEECdkGAioCAAGotAAA6AAAgBi0AAEEEdEEwcSEHAkACQCADIAJBf2pHDQAgBSAHQYCKgIAA
ai0AADoAAUE9IQYMAQsgBSAGQQFqIgYtAABBBHYgB3JBgIqAgABqLQAAOgABIAYtAABBAnRBPHFBgIqA
gABqLQAAIQYLIAVBPToAAyAFIAY6AAIgBUEEaiEFCyAFQQA6AAAgBSAAa0EBagsLyQIBAEGACAvBAkBA
QEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEA+QEBAPzQ1Njc4OTo7PD1AQEBA
QEBAAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBlAQEBAQEAaGxwdHh8gISIjJCUmJygpKissLS4vMDEy
M0BAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBA
QEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBA
QEBAQEBAQEBAQEBAQEBBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0
dXZ3eHl6MDEyMzQ1Njc4OSsvAABbBG5hbWUBVAUAEV9fd2FzbV9jYWxsX2N0b3JzARBCYXNlNjRkZWNv
ZGVfbGVuAgxCYXNlNjRkZWNvZGUDEEJhc2U2NGVuY29kZV9sZW4EDEJhc2U2NGVuY29kZQAlCXByb2R1
Y2VycwEMcHJvY2Vzc2VkLWJ5AQVjbGFuZwU5LjAuMQ==
`.trim().split('\n').join('');

const BYTES_PER_PAGE = 64 * 1024;

// TODO: Enforce max size
// TODO: Shrink/discard after use?
// TODO: Encode streaming!?

/** 
 * @param {WebAssembly.Memory} memory
 * @param {number} pointer
 * @param {number} targetLength
 */
function ensureMemory(memory, pointer, targetLength) {
  const availableMemory = memory.buffer.byteLength - pointer;
  if (availableMemory < targetLength) {
    const nPages = Math.ceil((targetLength - availableMemory) / BYTES_PER_PAGE);
    memory.grow(nPages);
  }
}

/** 
 * @param {Uint8Array} uint8 
 * @param {string} str
 */
function textEncodeInto(uint8, str) {
  if (typeof TextEncoder !== 'undefined') {
    if ('encodeInto' in TextEncoder.prototype) {
      new TextEncoder().encodeInto(str, uint8)
    } else {
      uint8.set(new TextEncoder().encode(str))
    }
  } else {
    for (let i = 0; i < bufCodedLen; i++) {
      uint8[i] = str.charCodeAt(i);
    }
  }
  return uint8;
}

/** 
 * @param {WebAssembly.Instance} instance
 * @param {WebAssembly.Memory} memory
 * @param {string} str 
 * @returns {[number, number]}
 */
function textEncodeIntoMemory(instance, memory, str) {
  const pBufCoded = instance.exports.__heap_base.value;
  const bufCodedLen = str.length;
  ensureMemory(memory, pBufCoded, bufCodedLen);

  const bufCoded = new Uint8Array(memory.buffer, pBufCoded, bufCodedLen + 1);
  textEncodeInto(bufCoded, str);
  bufCoded[bufCodedLen] = '\0';

  return [pBufCoded, bufCodedLen]
}

/**
 * @param {WebAssembly.Instance} instance
 * @param {string} str
 */
function decode(instance, str) {
  /** @type {WebAssembly.Memory} */
  const memory = instance.exports.memory

  const [pBufCoded, bufCodedLen] = textEncodeIntoMemory(instance, memory, str);

  const pBufPlain = pBufCoded + bufCodedLen;
  const bufPlainLen = instance.exports.Base64decode_len(pBufCoded);
  ensureMemory(memory, pBufPlain, bufPlainLen);

  const lenReal = instance.exports.Base64decode(pBufPlain, pBufCoded);
  const bufPlain = new Uint8Array(memory.buffer, pBufPlain, lenReal);

  // Return a copy
  // NOTE: We could return a view directly into WASM memory for some efficiency 
  // gains, but this would require that the caller understands that it will be
  // overwritten upon next use.
  return new Uint8Array(bufPlain).buffer;
}

/**
 * @param {WebAssembly.Instance} instance
 * @param {WebAssembly.Memory} memory
 * @param {ArrayBuffer} arrayBuffer 
 * @returns {[number, number]}
 */
function writeIntoMemory(instance, memory, arrayBuffer) {
  const pString = instance.exports.__heap_base.value;
  const stringLen = arrayBuffer.byteLength;
  ensureMemory(memory, pString, stringLen);

  const string = new Uint8Array(memory.buffer, pString, stringLen + 1);
  string.set(new Uint8Array(arrayBuffer));
  string[stringLen] = '\0';

  return [pString, stringLen];
}

/**
 * @param {WebAssembly.Instance} instance 
 * @param {ArrayBuffer} arrayBuffer
 */
function encode(instance, arrayBuffer) {
  // console.time('wasm');
  /** @type {WebAssembly.Memory} */
  const memory = instance.exports.memory

  const [pString, stringLen] = writeIntoMemory(instance, memory, arrayBuffer);

  const pEncoded = pString + stringLen;
  const encodedLen = instance.exports.Base64encode_len(stringLen);
  ensureMemory(memory, pEncoded, encodedLen);

  // -1 so we don't include string termination char '\0'
  const encoded = new Uint8Array(memory.buffer, pEncoded, encodedLen - 1);

  instance.exports.Base64encode(pEncoded, pString, stringLen);
  // console.timeEnd('wasm');

  // NOTE: Actually, most of the runtime is spent building the string.
  //       As far as I know, the fastest way is 
  // console.time('text');
  const str = new TextDecoder().decode(encoded);
  // console.timeEnd('text');

  return str;
}

// class Promises {
//   /** 
//    * Encode foobar
//    * @param {ArrayBuffer} arrayBuffer @returns {Promise<string>}
//    */
//   async encode(arrayBuffer) { }

//   /** 
//    * Decode foobar
//    * @param {string} string @returns {Promise<ArrayBuffer>}
//    */
//   async decode(string) { }
// }

class Base64 {
  /**
   * @returns {Promise<Base64>}
   */
  get initialized() { }

  /**
   * @param {ArrayBuffer} arrayBuffer
   * @returns {string}
   */
  encode(arrayBuffer) { }

  /**
   * @param {string} string
   * @returns {ArrayBuffer}
   */
  decode(string) { }

  /**
   * @returns {Promises}
   */
  get promises() { }
}

// /** 
//  * We only need a single instance b/c the JS implementation doesn't have state.
//  * @type {Promises}
//  */
// const jsPromises = new class JSPromises extends Promises {
//   async encode(arrayBuffer) { return encodeJS(arrayBuffer) }
//   async decode(string) { return decodeJS(string) }
// };

// class WASMPromises extends Promises {
//   constructor(p) { super(); this.p = p }
//   async encode(arrayBuffer) { return encode((await this.p).instance, arrayBuffer) }
//   async decode(string) { return decode((await this.p).instance, string) }
// }

export class JavaScriptBase64 extends Base64 {
  /** @returns {Promise<this>} */
  get initialized() { return Promise.resolve(this) }

  /** @param {ArrayBuffer} arrayBuffer @returns {string} */
  encode(arrayBuffer) { return encodeJS(arrayBuffer) }

  /** @param {string} string @returns {ArrayBuffer} */
  decode(string) { return decodeJS(string) }

  // /** @returns {Promises} */
  // get promises() { return jsPromises }
}

// TODO: Replace with #private variables when those ship

/** @type {Map<Base64, Promise<WebAssembly.WebAssemblyInstantiatedSource>>} */
const _instancePromise = new WeakMap();

/** @type {Map<Base64, WebAssembly.WebAssemblyInstantiatedSource>} */
const _instance = new WeakMap();

// /** @type {Map<Base64, Promises>} */
// const _promises = new WeakMap();

export class WebAssemblyBase64 extends Base64 {
  constructor() {
    super();
    const instancePromise = WebAssembly.instantiate(decodeJS(WASM));
    _instancePromise.set(this, instancePromise);
    // _promises.set(this, new WASMPromises(instancePromise));
  }

  /**
   * @returns {Promise<this>}
   */
  get initialized() {
    return _instancePromise.get(this).then(({ instance }) => {
      _instance.set(this, instance);
      return this;
    });
  }

  /** 
   * @param {ArrayBuffer} arrayBuffer 
   * @returns {string}
   */
  encode(arrayBuffer) {
    return encode(_instance.get(this), arrayBuffer);
  }

  /** 
   * @param {string} string 
   * @returns {ArrayBuffer}
   */
  decode(string) { 
    return decode(_instance.get(this), string);
  }

  // /** 
  //  * @returns {Promises}
  //  */
  // get promises() { 
  //   return _promises.get(this);
  // }
}

export {
  WebAssemblyBase64 as WASMBase64,
  JavaScriptBase64 as JSBase64,
}

/**
 * Factory function for `Base64` class that tests for WebAssembly availability.
 * @returns {Base64}
 */
export async function createBase64() {
  if ('WebAssembly' in globalThis) {
    return await new WebAssemblyBase64().initialized;
  } else if ('Uint8Array' in globalThis && 'DataView' in globalThis) {
    return new JavaScriptBase64();
  }
  throw Error('Platform unsupported. Make sure Uint8Array and DataView exist');
}
