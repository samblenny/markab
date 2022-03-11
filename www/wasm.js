// Copyright (c) 2022 Sam Blenny
// SPDX-License-Identifier: MIT
//
"use strict";
const wasmModule = "markab.wasm";

// Bindings for shared memory and functions
var wasmExports;

// Framebuffer as subarray of wasm shared memory
export var FB_BYTES = new Uint8Array([]);
export var FB_SIZE  = 0;

// Framebuffer configuration registers (latched by setFBConfig)
export var FB_WIDE = 320;
export var FB_HIGH = 200;
export var FB_DEEP = 1;
export var FB_ZOOM = 2;

// Load WASM module, bind shared memory, then invoke callback. By default,
// when linking wasm32 with LLVM's lld, it expects the magic name `env` in the
// import object.
export function loadModule(callback) {
    var importObject = {
	env: {
            js_trace: (code) => {
                console.log("wasm trace code:", code);
            },
            set_fb_config: (wide, high, deep, zoom) => {
                setFBConfig(wide, high, deep, zoom);
            },
            memset: memset,
        },
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

// Silly memset because sometimes LLVM wants to link the wasm module against this
function memset(dest, val, len) {
    console.log("memset", dest, val, len);
    let wasmU8 = new Uint8Array(wasmExports.memory.buffer);
    for (let i=dest; i<dest+len; i++) {
        wasmU8[i] = val;
    }
}

// Callback to initialize shared memory IPC bindings once WASM module is instantiated
function initSharedMemBindings(result) {
    wasmExports = result.instance.exports;
    // Make a Uint8 array slice for the shared framebuffer. Slice size is
    // determined by dereferencing FB_SIZE pointer exported from wasm module.
    // FB_SIZE represents the maximum capacity of the frame buffer which is
    // **not the same thing** as the currently configured display size.
    let wasmBufU8 = new Uint8Array(wasmExports.memory.buffer);
    let wasmDV = new DataView(wasmExports.memory.buffer);
    const fb_bytes_ptr = wasmExports.FB_BYTES.value;
    const fb_size_ptr  = wasmExports.FB_SIZE.value;
    const littleEndian = true;
    FB_SIZE = wasmDV.getUint32(fb_size_ptr, littleEndian);
    console.log("initSharedMemBindings fb_size_ptr:", fb_size_ptr, "FB_SIZE:", FB_SIZE);
    FB_BYTES = wasmBufU8.subarray(fb_bytes_ptr, fb_bytes_ptr + FB_SIZE);
}

// Set the frame buffer configuration registers. (this gets called by wasm module)
// Arbitrarily assert that frame buffer max is 64KB and enforce that:
//   ((wide * high) >>> (4-deep)) <= 65535  (meaning it fits in 16 bit address space)
// Units for deep are bits per pixel.
function setFBConfig(wide, high, deep, zoom) {
    console.log("setFBConfig", wide, high, deep, zoom);
    const condition1 = wide > 1024 || high > 512;
    const condition2 = deep < 1 || deep > 3;
    const condition3 = ((wide >>> (4-deep)) * high) > 65535;
    const condition4 = zoom < 1 || zoom > 3;
    if (condition1 || condition2 || condition3 || condition4) {
        console.warn("unsupported frame buffer config", wide, high, deep, zoom);
        throw "setFBConfig";
    }
    FB_WIDE = wide;
    FB_HIGH = high;
    FB_DEEP = deep;
    FB_ZOOM = zoom;
}

export function init() {
    console.log("wasm.init()");
    wasmExports.init();
}
