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


### Notes on Screen Resolution

Thinking about pixel layout and bit depth in the framebuffer...

Current JS blit code is derived from blitstr2 which used a framebuffer layout
meant for compatibility with hardware driver for Sharp Memory LCD of 336x536
pixels at depth of 1-bit per pixel. That resolution, palette, and aspect ratio
does not feel right for Markab.

Current thoughts on framebuffer layout... Maybe start with a bias towards
enabling sprite compatibility with Uxn unless there are good reasons to
diverge? One possible reason would be the 2-bits per pixel color limitation.
Maybe 4 simultaneous colors is enough? EGA palette size of 16 colors seems like
it might be nice. No conclusion yet.

[EGA Video Modes](https://en.wikipedia.org/wiki/Enhanced_Graphics_Adapter):
- 640x350, 2 or 16 colors
- 640x200, 16 colors
- 320x200, 16 colors

[CGA Video Modes](https://en.wikipedia.org/wiki/Color_Graphics_Adapter):
- 320x200, 4 colors
- 640x200, 2 colors

Sounds like 320x200 was popular because it was a natural fit for monitors with
composite NTSC video input. One twist was that 320x200 is 1.6:1 aspect ratio
(assuming square pixels), while NTSC video displays were commonly 4:3 aspect
ratio. Apparently monitors were commonly adjusted to vertically stretch the 200
scan lines of 320x200 resolution to make pixels of 1:1.2 aspect ratio (a bit
taller than wide) in order to fill the visible area of a 4:3 aspect ratio CRT.
Rumor has it that artwork was commonly smushed in the other direction so that
it would look right (circles being round, etc.) when vertically stretched.

So, all that means that blindly copying 320x200 onto an LCD with square pixels
would end up producing something rather different than how things looked back
in the day. Maybe similar considerations apply to re-using bitmap glyphs for
fonts meant to display on early PCs with video modes intended for NTSC
composite monitors?

Some default screen sizes from Uxn apps:

```
calc       144 x 256 px  (0x090 x 0x100)
uxn emu    512 x 320 px  ( 64*8 x  40*8)
launcher   512 x 320 px  (0x200 x 0x140)
left       576 x 368 px  (0x240 x 0x170)
mandelbrot 640 x 480 px
```

For the moment, my inclination is to use 320x200 framebuffer resolution and
scale that up with a CSS transform to display at 640x400 square pixels on my
medium DPI, square-pixel LCD monitor.


## 2022-03-08: First Steps

Started a new repo for this project that I've been thinking about for years.
Took me a while to come up with a name. Settled on Markab.

General goal is to make portable multimedia creation and playback system
suitable for making language learning apps, but with enough flexibility to
be used for other purposes.
