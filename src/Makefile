# Copyright (c) 2022 Sam Blenny
# SPDX-License-Identifier: MIT
#
# This was developed on Debian, but it uses .POSIX in the hope of making things
# easy to port. You might need to do `sudo apt install clang lld`.
#
.POSIX:     # Tell make to use POSIX mode (no GNU extensions)
.SUFFIXES:  # Disable default old-school CC inference rules

CC      = clang
CFLAGS  = -Wall -Wpedantic --target=wasm32 -nostdlib
LDFLAGS = -Wl,--no-entry -Wl,--export-dynamic -Wl,--allow-undefined -Os -flto -Wl,--strip-all
PREFIX  = ../www

markab.wasm: markab.c markab.h
install: markab.wasm
	cp markab.wasm $(PREFIX)/
clean:
	@rm -f markab.wasm

.PHONY: clean
.SUFFIXES: .c .wasm   # Enable new inference rule for wasm (see next line)
.c.wasm:
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $<

# Credits:
# - Helpful blog post: https://surma.dev/things/c-to-webassembly/
#
# Linker Notes:
# 1. LTO: lld supports LTO by default; pass `-flto` to clang to use it
#    see https://releases.llvm.org/7.0.0/tools/lld/docs/index.html
# 2. Exports: Symbols marked with `__attribute__((visibility("default")))`
#    will be exported if you link with `-Wl,--export-dynamic`.
# 3. Imports: With `-Wl,--allow-undefined`, all undefined symbols will be
#    allowed with the unverified expectation that the wasm loader provides
#    them. In javascript, the module name for the imports should be "env".
#    See https://lld.llvm.org/WebAssembly.html#imports
# 4. Entry Point: `-Wl,--no-entry` skips checks for _start, main
