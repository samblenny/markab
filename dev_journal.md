# Markab Dev Journal


## 2022-03-10: Makefile for new WASM module

Current task: build a WASM module from C with LLVM to generate a test
pattern in the shared framebuffer.


## 2022-03-09: Shared WASM & JS framebuffer

Worked on the javascript side of the display HAL. Basic arrangement is:

1. JS with HTML canvas element simulates display hardware

2. JS and WASM module share a byte array framebuffer

3. WASM module can update the framebuffer and signal to the JS side that
   it's ready for a repaint

4. JS side has code to do bit depth and color palette translation from
   the packed framebuffer into the 32-bit RGBA image data buffer for the
   canvas element's 2D drawing context

Used a WASM module from a different project to test with. Next step is to
start a C project and Makefile to build a new WASM module where all the
stuff above the HAL will go.


## 2022-03-08: First Steps

Started a new repo for this project that I've been thinking about for years.
Took me a while to come up with a name. Settled on Markab.

General goal is to make portable multimedia creation and playback system
suitable for making language learning apps, but with enough flexibility to
be used for other purposes.
