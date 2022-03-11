// Copyright (c) 2022 Sam Blenny
// SPDX-License-Identifier: MIT
//
"use strict";
import * as wasm from './wasm.js';

const SCALE = 2;   // 2x zoom (looks pixely)
const WIDE = 320;  // Remember that canvas CSS width needs to be (SCALE*WIDE)
const HIGH = 200;  // Remember that canvas CSS height needs to be (HIGH*WIDE)
const SCREEN = document.querySelector('#screen');
const CTX = SCREEN.getContext('2d');
// The >>>0 is a perhaps redundant hint to the interpreter that these are meant as Uint32
const CLEAR = 0x00000000 >>>0;
const RED   = 0xff0000ff >>>0;
const GREEN = 0x00ff00ff >>>0;
const BLACK = 0x000000ff >>>0;
// Default foreground color
let DEFAULT = BLACK;

// Load wasm module with callback to continue initialization
initCanvas(WIDE, HIGH, SCALE);
let loadSuccessCallback = initWASM;
wasm.loadModule(loadSuccessCallback);

// Initialize canvas including anti-blur fix for displays with a non-integer dpi-ratio
function initCanvas(wide, high, scale) {
    let pixelRatio = window.devicePixelRatio || 1;
    SCREEN.width = wide;
    SCREEN.height = high;
    SCREEN.style.width = (wide * scale / pixelRatio) + 'px';
    SCREEN.style.height = (high * scale / pixelRatio) + 'px';
    CTX.scale(scale, scale);
    // Draw test pattern that should quickly be replaced as soon as wasm loads
    drawStripes(wide, high, RED);
}

function initWASM() {
    wasm.init();
    repaint();
}

// Yield values from an endless sequence of 10 clear pixels, then 1 red pixel
function* stripeGenerator() {
    const c = CLEAR;
    while (true) {
        for (const rgba of [c, c, c, c, c, c, c, c, c, c, RED]) {
            yield rgba;
        }
    }
}

// Make an ugly test pattern that's intended for testing JS side of painting to canvas
function drawStripes(wide, high, rgba) {
    let imgData = CTX.getImageData(0, 0, wide, high);
    let dv = new DataView(imgData.data.buffer);
    let gen = stripeGenerator();
    for (let i=0; i<dv.byteLength; i=i+4) {
        dv.setUint32(i, gen.next().value);
    }
    CTX.putImageData(imgData, 0, 0);
}

// Paint the frame buffer (wasm shared memory) to the screen (canvas element)
function repaint() {
    const rgba = DEFAULT;
    let imgData = CTX.getImageData(0, 0, WIDE, HIGH);
    let dst = new DataView(imgData.data.buffer);  // 32-bit per pixel RGBA
    let src = wasm.frameBuf();                    // 1-bit per pixel monochrome

    // Throw an exception if the source and destination buffer sizes don't match
    const srcPx = src.length << 3;
    const dstPx = dst.byteLength >>> 2;
    if (srcPx !== dstPx) {
        console.warn("repaint(): framebuffer size mismatch! this is a bug.");
        throw "buffer size mismatch";
    }

    // Blit with bit depth translation
    let i = 0;
    for (const s of src) {
        // Set rgba color pixels from a byte worth of monochrome pixels
        dst.setUint32(i    , ((s &  1) === 0) ? rgba : 0);
        dst.setUint32(i + 4, ((s &  2) === 0) ? rgba : 0);
        dst.setUint32(i + 8, ((s &  4) === 0) ? rgba : 0);
        dst.setUint32(i +12, ((s &  8) === 0) ? rgba : 0);
        dst.setUint32(i +16, ((s & 16) === 0) ? rgba : 0);
        dst.setUint32(i +20, ((s & 32) === 0) ? rgba : 0);
        dst.setUint32(i +24, ((s & 64) === 0) ? rgba : 0);
        dst.setUint32(i +28, ((s &128) === 0) ? rgba : 0);
        i = i + 32;
    }
    CTX.putImageData(imgData, 0, 0);
}
