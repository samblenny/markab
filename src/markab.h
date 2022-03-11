// Copyright (c) 2022 Sam Blenny
// SPDX-License-Identifier: MIT
//
#include <stdint.h>

// The relies on -Wl,--allow-undefined and linking by wasm loader

void js_trace(uint32_t code);

void set_fb_config(uint32_t wide, uint32_t high, uint32_t deep, uint8_t zoom);
