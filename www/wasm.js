// Copyright (c) 2022 Sam Blenny
// SPDX-License-Identifier: MIT
//
"use strict";
const wasmModule = "markab.wasm";
const wide = 320;
const high = 200;

// Load WASM module, bind shared memory, then invoke callback. By default,
// when linking wasm32 with LLVM's lld, it expects the magic name `env` in the
// import object.
export function loadModule(callback) {
    var importObject = {
	env: { js_trace: (code) => { console.log("wasm trace code:", code); }, },
    };
    if ("instantiateStreaming" in WebAssembly) {
        // Modern browsers should support this
        WebAssembly.instantiateStreaming(fetch(wasmModule), importObject)
            .then(initSharedMemBindings)
            .then(callback)
            .catch(function (e) {
                console.error(e);
            });
    } else {
        console.error("Browser does not support WebAssembly.instantiateStreaming()");
    }
}

// Bindings for shared memory and functions
var wasmShared;
var wasmExports;
var wasmInstanceReady = false;

// UTF8 decoder
let decoder = new TextDecoder();

// Callback to initialize shared memory IPC bindings once WASM module is instantiated
function initSharedMemBindings(result) {
    wasmExports = result.instance.exports;
    wasmShared = new Uint8Array(wasmExports.memory.buffer);
    wasmInstanceReady = true;
}

export function init() {
    if (wasmExports && "init" in wasmExports) {
        wasmExports.init();
    } else {
        console.error("wasm.init() failure: perhaps HTTP 404 on .wasm file?");
    }
}

export function frameBuf() {
    if (!wasmInstanceReady) {
        console.error("wasm.frameBuf() failure: perhaps HTTP 404 on .wasm file?");
        return;
    }
    const size = wide * high;
    let start = wasmExports.frame_buf_ptr();
    let bytes = wasmShared.subarray(start, start + size);
    return bytes;
}
