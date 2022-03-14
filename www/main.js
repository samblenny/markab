// Copyright (c) 2022 Sam Blenny
// SPDX-License-Identifier: MIT
//
"use strict";
import * as wasm from './wasm.js';

/**
 *  GLOBAL CONSTANTS
 */

// HTML canvas element and its 2D drawing context
const SCREEN = document.querySelector('#screen');
const CTX = SCREEN.getContext('2d', {alpha: false});

// Initial canvas configuration
const DEFAULT_WIDE = 320;  // Px per horizontal line. Remember CSS width should be (zoom * wide)
const DEFAULT_HIGH = 200;  // Lines per frame. Remember CSS height should be (zoom * high)
const DEFAULT_DEEP = 1;    // Frame buffer bits per pixel
const DEFAULT_ZOOM = 2;    // Upscaling factor for display driver. 2x zoom looks mildly pixelated.

// RGBA color constants defined for use with little-endian `DataVew.setUint32(..., true)`
// Layout: (alpha << 24 | blue << 16 | green << 8 | red)
// The >>>0 is a perhaps redundant hint to the interpreter that these are meant as Uint32
const LTGRAY = 0xFFDDDDDD >>>0;
const BLACK  = 0xFF000000 >>>0;
const GREEN  = 0xFF00FF00 >>>0;
const RED    = 0xFF0000FF >>>0;


/**
 *  ENTRY POINT (MODULE INIT)
 */

// Configure the canvas at default size and draw stripes to indicate loading in progress
initCanvas(DEFAULT_WIDE, DEFAULT_HIGH, DEFAULT_ZOOM);

// Load wasm module with callback to continue initialization
let loadSuccessCallback = initWASM;
wasm.loadModule(loadSuccessCallback);


/**
 *  FUNCTION DEFS
 */

// Prepare HTML canvas element for use as a simulated display device
function initCanvas(wide, high, zoom) {
    console.log("initCanvas");
    resizeCanvas(wide, high, zoom);
    // Draw test pattern that should quickly be replaced as soon as wasm loads
    drawStripes(wide, high, RED);
}

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

// Final success callback in the chain for the JS wasm module loader
function initWASM() {
    console.log("initWASM");
    wasm.init();
    repaint();
}

// Yield values from an endless sequence of 10 clear pixels, then 1 red pixel
function* stripeGenerator() {
    const c = LTGRAY;
    while (true) {
        for (const rgba of [c, c, c, c, c, c, c, c, c, c, RED]) {
            yield rgba;
        }
    }
}

// Make an ugly test pattern intended as hard-to-miss wasm loading indicator
function drawStripes(wide, high, rgba) {
    let imgData = CTX.getImageData(0, 0, wide, high);
    let dv = new DataView(imgData.data.buffer);
    const littleEndian = true;
    let gen = stripeGenerator();
    for (let i=0; i<dv.byteLength; i=i+4) {
        dv.setUint32(i, gen.next().value, littleEndian);
    }
    CTX.putImageData(imgData, 0, 0);
}

// Paint the frame buffer (wasm shared memory) to the screen (canvas element)
function repaint() {
    // Adapt to current frambuffer configuration on the wasm side
    const wide = wasm.FB_WIDE;
    const high = wasm.FB_HIGH;
    const deep = wasm.FB_DEEP;
    const src_length = (wide >>> (4-deep)) * high;
    if (deep !== 1 || src_length > 65535) {
        console.warn("FB config out of range", wide, high, deep, src_length);
        throw "repaint 1";
    }
    // Trim source array to match framebuffer config
    let src = wasm.FB_BYTES.slice(0, src_length);

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
