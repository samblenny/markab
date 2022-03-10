// Copyright (c) 2022 Sam Blenny
// SPDX-License-Identifier: MIT
//
// The visibility "default" attributes tell LLVM which symbols to export.
//
#include <stdint.h>
#include "markab.h"

// Frame buffer
uint8_t FB[FB_SIZE];

// Initialization function (to be called by javascript)
__attribute__((visibility("default")))
int init(void) {
    js_trace(32);
    // Put some noise in the frame buffer
    for(int i=0; i<FB_SIZE; i++) {
        FB[i] = (uint8_t) i;
    }
    return 23;
}

__attribute__((visibility("default")))
uint8_t * frame_buf_ptr() {
    return FB;
}
