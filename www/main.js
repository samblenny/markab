// Copyright (c) 2022 Sam Blenny
// SPDX-License-Identifier: MIT
//
"use strict";

/**
 *  Constants & Global State Vars
 */

const SCREEN = document.querySelector('#screen');
const CTX = SCREEN.getContext('2d', {alpha: false});
const BLACK = 0xFF000000;
const GREEN = 0xFF00FF00;
const wasmModule = "markab.wasm";

var wasmExports;

// Framebuffer (shared with wasm) and double-buffer (for canvas)
var FB_BYTES = new Uint8Array([]);
var FB_SIZE  = 0;
var FB_DBLBUF;

// Framebuffer config registers
var WIDE = 320;
var HIGH = 200;
var DEEP = 1;
var ZOOM = 2;

/**
 *  Module Entry Point
 */

// Prepare the canvas element and load the wasm module
resizeCanvas(WIDE, HIGH, ZOOM);
wasmloadModule(() => {wasmExports.init(); repaint();});

/**
 *  Function Defs
 */

// Configure canvas to match framebuffer config
function resizeCanvas(wide, high, zoom) {
    // Prevent blur on displays with non-integer dpi-ratio
    let pixelRatio = window.devicePixelRatio || 1;
    SCREEN.width = wide;
    SCREEN.height = high;
    SCREEN.style.width = (wide * zoom / pixelRatio) + 'px';
    SCREEN.style.height = (high * zoom / pixelRatio) + 'px';
    CTX.scale(zoom, zoom);
    // Start with a blank double buffer of matching size
    FB_DBLBUF = CTX.createImageData(wide, high);
}

// Paint the frame buffer (wasm shared memory) to the screen (canvas element)
function repaint() {
    // Adapt to current frambuffer configuration on the wasm side
    const src_length = (WIDE >>> (4-DEEP)) * HIGH;
    if (DEEP !== 1 || src_length > 65535) {
        throw "repaint 1";
    }
    // Match source and destination sizes
    let src = FB_BYTES.slice(0, src_length);
    let dst = new DataView(FB_DBLBUF.data.buffer);

    // Blit with bit depth translation
    const palette = [BLACK, GREEN];
    let i = 0;
    for (const s of src) {
        // Set rgba color pixels from a byte worth of monochrome pixels
        // Note that this is using setUint32 in little-endian mode!
        dst.setUint32(i    , palette[(s >>> 0) & 1], true);
        dst.setUint32(i + 4, palette[(s >>> 1) & 1], true);
        dst.setUint32(i + 8, palette[(s >>> 2) & 1], true);
        dst.setUint32(i +12, palette[(s >>> 3) & 1], true);
        dst.setUint32(i +16, palette[(s >>> 4) & 1], true);
        dst.setUint32(i +20, palette[(s >>> 5) & 1], true);
        dst.setUint32(i +24, palette[(s >>> 6) & 1], true);
        dst.setUint32(i +28, palette[(s >>> 7) & 1], true);
        i = i + 32;
    }
    CTX.putImageData(FB_DBLBUF, 0, 0);
}

/**
 *  WASM Stuff
 */

// Load WASM module, bind shared memory, then invoke callback.
function wasmloadModule(callback) {
    var importObject = {
	env: {
            js_trace: (code) => {
                console.log("wasm trace:", code);
            },
            set_fb_config: (wide, high, deep, zoom) => {
                setFBConfig(wide, high, deep, zoom);
            },
            memset: memset,
        },
    };
    if ("instantiateStreaming" in WebAssembly) {
        WebAssembly.instantiateStreaming(fetch(wasmModule), importObject)
            .then(initSharedMemBindings)
            .then(callback)
            .catch(function (e) {
                console.error(e);
            });
    } else {
        console.error("Browser does not support instantiateStreaming()");
    }
}

// Sometimes LLVM wants to link the wasm module against this
function memset(dest, val, len) {
    let wasmU8 = new Uint8Array(wasmExports.memory.buffer);
    for (let i=dest; i<dest+len; i++) {
        wasmU8[i] = val;
    }
}

// Initialize shared memory IPC bindings once WASM module is ready
function initSharedMemBindings(result) {
    wasmExports = result.instance.exports;
    // Make a Uint8 array slice for the shared framebuffer. Slice size is
    // determined by dereferencing FB_SIZE pointer exported from wasm module.
    let wasmBufU8 = new Uint8Array(wasmExports.memory.buffer);
    let wasmDV = new DataView(wasmExports.memory.buffer);
    const bPtr = wasmExports.FB_BYTES.value;
    const sPtr  = wasmExports.FB_SIZE.value;
    FB_SIZE = wasmDV.getUint32(sPtr, true); // little-endian
    FB_BYTES = wasmBufU8.subarray(bPtr, bPtr + FB_SIZE);
}

// Set the frame buffer config registers (called by wasm)
function setFBConfig(wide, high, deep, zoom) {
    const a = wide > 1024 || high > 512;
    const b = deep < 1 || deep > 3;
    const c = ((wide >>> (4-deep)) * high) > 65535;
    const d = zoom < 1 || zoom > 3;
    if (a || b || c || d) {
        throw "setFBConfig";
    }
    WIDE = wide;
    HIGH = high;
    DEEP = deep;
    ZOOM = zoom;
    // Resize the double buffer
    FB_DBLBUF = CTX.createImageData(wide, high);
}
