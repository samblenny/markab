// Copyright (c) 2022 Sam Blenny
// SPDX-License-Identifier: MIT
//
// Notes:
// 1. The __attribute__((visibility("default"))) tell LLVM which symbols to export.
//
// 2. Use of uint32_t is mainly about reminding myself that wasm32 uses int32.
//    Some of the valid ranges to be represented would fit better as uint8_t or
//    uint16_t, but, using that would obscure the underlying reality of the
//    wasm32 implementation. Anyhow, it should all work fine on non-wasm stuff too.
//
#include <stdint.h>
#include "markab.h"

#define SIZE_64K (65536)

// Frame buffer. Maximum capacity is 64KB. This is meant to accommodate various
// video modes on an emulated stack machine having 16-bit address bus width.
__attribute__((visibility("default")))
uint8_t FB_BYTES[SIZE_64K];
__attribute__((visibility("default")))
uint32_t FB_SIZE = SIZE_64K;

// Frame buffer config registers
uint32_t FB_WIDE = 304;  // pixels per horizontal line
uint32_t FB_HIGH = 184;  // vertical lines per frame
uint32_t FB_DEEP = 1;    // bits per pixel ("bit depth")
uint32_t FB_ZOOM = 2;    // upscaling factor to be applied by display driver

// Initialization function (gets called by javascript)
__attribute__((visibility("default")))
int init(void) {
    // Put some noise in the frame buffer
    uint32_t limit = (FB_WIDE >> (4-FB_DEEP)) * FB_HIGH;
    for(int i=0; i<limit; i++) {
        FB_BYTES[i] = /* 0x55; */ (uint8_t) i;
    }
    js_trace(limit);
    set_fb_config(FB_WIDE, FB_HIGH, FB_DEEP, FB_ZOOM);
    return 0;
}
