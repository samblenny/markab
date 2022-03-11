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

// Framebuffer as subarray of wasm shared memory
var fb_bytes = null;

// Callback to initialize shared memory IPC bindings once WASM module is instantiated
function initSharedMemBindings(result) {
    wasmExports = result.instance.exports;
    wasmShared = new Uint8Array(wasmExports.memory.buffer);
    wasmInstanceReady = true;
    // Now that wasm module is loaded, make an array slice for the shared framebuffer
    // The >>>3 to divide by 8 is because 8 pixels are packed into each byte
    const fb_size = (wide * high) >>>3;
    let fb_ptr = wasmExports.frame_buf_ptr();
    fb_bytes = wasmShared.subarray(fb_ptr, fb_ptr + fb_size);
}

export function init() {
    wasmExports.init();
}

export function frameBuf() {
    return fb_bytes;
}
