// Copyright (c) 2022 Sam Blenny
// SPDX-License-Identifier: MIT
//
"use strict";

/**
 *  Constants & Global State Vars
 */

// HTML canvas element and its 2D drawing context
const SCREEN = document.querySelector('#screen');
const CTX = SCREEN.getContext('2d', {alpha: false});

// RGBA color constants defined for use with little-endian `DataVew.setUint32(..., true)`
// Layout: (alpha << 24 | blue << 16 | green << 8 | red)
// The >>>0 is a meant to cast to Uint32
const BLACK  = 0xFF000000 >>>0;
const GREEN  = 0xFF00FF00 >>>0;

// WASM module
const wasmModule = "markab.wasm";

// For linking with the wasm module's exports
var wasmExports;

// Framebuffer as subarray of wasm shared memory
var FB_BYTES = new Uint8Array([]);
var FB_SIZE  = 0;

// Framebuffer configuration registers (latched by setFBConfig)
var FB_WIDE = 320;
var FB_HIGH = 200;
var FB_DEEP = 1;
var FB_ZOOM = 2;

/**
 *  Module Entry Point
 */

// Prepare the canvas element and load the wasm module
resizeCanvas(FB_WIDE, FB_HIGH, FB_ZOOM);
let loadSuccessCallback = () => { wasmInit(); repaint(); };
wasmloadModule(loadSuccessCallback);

/**
 *  Function Defs
 */

// Configure the canvas element to match a new framebuffer configuration
function resizeCanvas(wide, high, zoom) {
    console.log("resizeCanvas", wide, high, zoom);
    // Pixel ratio correction factor prevents blurring on displays with non-integer dpi-ratio
    let pixelRatio = window.devicePixelRatio || 1;
    SCREEN.width = wide;
    SCREEN.height = high;
    SCREEN.style.width = (wide * zoom / pixelRatio) + 'px';
    SCREEN.style.height = (high * zoom / pixelRatio) + 'px';
    CTX.scale(zoom, zoom);
}

// Paint the frame buffer (wasm shared memory) to the screen (canvas element)
function repaint() {
    // Adapt to current frambuffer configuration on the wasm side
    const wide = FB_WIDE;
    const high = FB_HIGH;
    const deep = FB_DEEP;
    const src_length = (wide >>> (4-deep)) * high;
    if (deep !== 1 || src_length > 65535) {
        console.warn("FB config out of range", wide, high, deep, src_length);
        throw "repaint 1";
    }
    // Trim source array to match framebuffer config
    let src = FB_BYTES.slice(0, src_length);

    // Set up destination to match source
    let imgData = CTX.getImageData(0, 0, wide, high);
    let dst = new DataView(imgData.data.buffer);  // 32-bit per pixel RGBA

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
    CTX.putImageData(imgData, 0, 0);
}

/**
 *  WASM Stuff
 */

// Load WASM module, bind shared memory, then invoke callback. By default,
// when linking wasm32 with LLVM's lld, it expects the magic name `env` in the
// import object.
function wasmloadModule(callback) {
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

function wasmInit() {
    wasmExports.init();
}
