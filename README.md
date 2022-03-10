# markab

This is the start of what aspires to be a simple and portable multimedia
creation environment. These are early days. Not much is working yet.


## Dev Journal

Dev journal is here in case you want to follow along with progress:

- https://samblenny.github.io/markab/dev_journal.md (plain text)

- [dev_journal.md](dev_journal.md) (rendered html)


## WASM Demo Page

Latest build of current code is running at https://samblenny.github.io/markab/www/


## How to Build and Run

This procedure is meant for Debian 11. It probably works with minor variations
on Raspberry Pi OS, Ubuntu, etc., but YMMV. For macOS, you would need a build
of LLVM clang that includes support for the wasm32 build target. You might be
able to get that from homebrew, but you're on your own for that.

Build dependencies are a ruby interpreter along with clang and lld from LLVM
v11+. Possibly LLVM as old as version 9 might work, but I recommend 11 or
later. I installed them with `sudo apt install clang lld ruby`.

My current build and run process uses two terminals and an editor window. One
terminal runs the webserver that I leave active while I edit. The other
terminal runs make.

Terminal tab 1 (start ruby server to host www/* at http://localhost:8000):
```
$ cd markab/www
$ ./webserver.rb
```

Terminal tab 2 (build markab.wasm and install it into markab/www/):
```
$ cd markab/src
$ make            # this builds markab.wasm
$ make install    # this copies src/markab.wasm to ../www/markab.wasm
```

After making edits that I want to test, I run `make install` and then do
a full (non-cached) reload of localhost:8000 in my browser.
