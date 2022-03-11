# Markab Dev Journal

Tasks to maybe do soon:
- [ ] Add font and write function to paint UTF-8 strings
- [ ] Better wasm<-->js interface for frame buffer dimensions
- [ ] Convert framebuffer to use 2-bits per pixel
- [ ] Better way to configure color palette themes
- [ ] Interrupt handler and state machine for keyboard input
- [ ] Interrupt handler and state machine for pointer input
- [ ] Primitive painting app
- [ ] REPL interface with line editor, history, and scrolling
- [ ] Block editor interface
- [ ] Block editor non-volatile storage (drag'n'drop import/export?)


## 2022-03-11: Rework Framebuffer Interface

Working on defining a good framebuffer interface between wasm and js.

Decided to arbitrarily start with the constraint of a 64KB maximum video ram
size ("the framebuffer") and let everything else follow from there. The choice
of 64KB is meant to accommodate a byte addressable pixel buffer on a stack
machine with 16-bit address bus width. I'm thinking that the video ram could
go on its own bus, separate from regular program memory.

Would like to leave the door open to supporting different types of video modes.

Current configuration for testing is medium sized, medium DPI LCD monitor with
simulated display hardware of html canvas with 2x CSS scaling ("2x zoom"). This
gives convenient readability and a mildly pixelated look. Maybe the zoom could
be adjustable between 1x, 2x, and 4x to accommodate different hardware display
sizes and DPI ratios.

Constellation of uses I would like to potentially support:

1. Monochrome 1-bit per pixel to cover small hardware devices or large display
   areas on a PC. This could work for making a big text editor, or perhaps a
   cheap hardware synth/sequencer with a Cortex M0/M4 dev board and OLED or LCD
   from Adafruit. Resolutions could range from as small as 128x32 or 128x64 on
   cheap OLED up to 1024x512 on laptop or PC.

2. Uxn compatibility mode with 2-bits per pixel that could be implemented on
   lots of different hardware. This could handle up to 640x400 with 4 colors,
   supporting uses like text editor with color syntax highlighting, game with
   kinda big map, painting moderately big images, and so on.

3. Color picker mode with ability to display many colors at once for the
   purpose of building themes and color palettes. Assuming 8-bits per pixel,
   this could support resolution of up to 256x256. With 4-bits per pixel, the
   resolution could be up to 360x360.

To do all this, the data structure on the wasm side could look like...

Frame buffer:
- FB_BYTES: array of uint8_t[65536], "the video ram", "the framebuffer"
- FB_SIZE: 65536

Frame buffer configuration registers:
- FB_WIDE: pixels per horizontal line (limit of X axis)
- FB_HIGH: vertical lines per screen (limit of Y axis)
- FB_DEEP: pixel bit depth in units of bits per pixel
- FB_ZOOM: scaling factor to be applied by the display driver, "zoom"


## 2022-03-10: Makefile for new WASM module

Update: the new WASM module works. It draws a test pattern with a binary
counter. Demo is at https://samblenny.github.io/markab/www/

Today's task: build a WASM module from C with LLVM to generate a test
pattern in the shared framebuffer.


### Notes on compiling C to WASM with only clang and Makefile:

References:
- https://surma.dev/things/c-to-webassembly/
- https://8bitworkshop.com/blog/misc/compiling-emulators-to-webassembly-without-emscripten.md.html
- https://nullprogram.com/blog/2017/08/20/ ("A Tutorial on Portable Makefiles")
- https://pubs.opengroup.org/onlinepubs/9699919799/utilities/make.html (POSIX make spec)
- https://lld.llvm.org/WebAssembly.html (command line argument docs for lld wasm32 linker)
- https://github.com/WebAssembly/tool-conventions/issues/64 (discussion on using lld arguments)


#### POSIX Makefile notes

The five internal macros:
- `$@` : full target name of current target -- from `lib.a: file.c`, `$@` means `lib.a`
- `$%` : for archive library members, from `lib.a(file.o)`, `$%` means `file.o`
- `$?` : list of prereq's newer than current target
- `$<` : for inference rule, `$<` is filename that triggered the rule (sorta like `$@`)
- `$*` : current target minus its suffix


#### LLVM compiler versions supporting wasm32 target

Apple's build of clang for macOS does not support the wasm32 target, but
apparently the homebrew build does? Have not personally verified that.

Check clang targets of Apple's clang v13 build (wasm32 not included):
```
$ clang --print-targets | grep 'x86\|wasm'
    x86        - 32-bit X86: Pentium-Pro and above
    x86-64     - 64-bit X86: EM64T and AMD64
```

Check clang v11 targets on Debian 11:
```
$ clang --print-targets | grep wasm
    wasm32     - WebAssembly 32-bit
    wasm64     - WebAssembly 64-bit
```

Check clang v11 targets on Raspbian Buster:
```
$ clang-11 --print-targets | grep wasm
    wasm32     - WebAssembly 32-bit
    wasm64     - WebAssembly 64-bit
```
Note that on Buster, `/usr/bin/clang` is clang v7, which is too old. But,
Buster has clang v11 as a package. You just have to `sudo apt install clang-11`
and then invoke it as `clang-11`.


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
