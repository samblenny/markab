// Copyright (c) 2022 Sam Blenny
// SPDX-License-Identifier: MIT
//
#include <stdint.h>

// Framebuffer dimensions
#define FB_WIDE (320)
#define FB_HIGH (200)
#define FB_SIZE (FB_WIDE * FB_HIGH)

// This relies on -Wl,--allow-undefined + wasm loader
void js_trace(int code);
