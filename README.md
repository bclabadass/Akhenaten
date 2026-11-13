# iKhenaten

**Pharaoh + Cleopatra on iPhone.** iKhenaten is a fork of [Akhenaten](https://github.com/dalerank/Akhenaten),
the open-source reimplementation of Impressions Games' _Pharaoh_ (1999), that runs natively on iOS.
It is developed and played on an iPhone Duo, on both its folded and unfolded screens.

The iOS work is on the [`ios-port`](https://github.com/bclabadass/iKhenaten/tree/ios-port) branch.
Below the line is upstream Akhenaten's own README.

**Status: playable.** The campaign missions through Nekhen (Nubt, Thinis, Perwadjyt and Nekhen) are
confirmed working as intended on the phone, with no major issues. Builds are sideloaded from Xcode;
there is no App Store release.

## What iKhenaten adds

### iOS support
- Native iOS build for devices and the Simulator, from CMake with Xcode (iOS 17 or later).
- Builds with the iOS 27 SDK, which requires UIScene: SDL3's UIScene support is backported to SDL2
  as a patch applied at configure time. The game resizes when the phone is folded or unfolded.
- Game data and saves live in the app's `Documents/PharaohData` folder, reachable from Finder on a
  Mac or the Files app on the phone.
- Settings are saved when the app goes to the background, since iOS closes apps without a Quit.
- Fixes a crash at startup: the script engine's parser recursed deeply enough to overflow the
  1 MB main-thread stack iOS gives apps (macOS gives 8 MB).

### Touch controls
- Two-finger tap is a right-click everywhere (close windows, go back, cancel building).
- Pinch to zoom, and one-finger drags that follow the finger at any zoom.
- An on-screen rotate button while placing buildings that can rotate.
- Tap the date in the top menu to pause or resume.
- The on-screen keyboard opens for text fields and closes after a fold or rotation.

### The unfolded (inner) screen
- A taller top menu bar with larger text and dropdowns, inset from the screen's curved corners.
- Pop-up windows and the title screen drawn 1.5x larger, while the city keeps its full detail.
- Windows lay themselves out again after a fold or rotation.

### Fixes found while playing
Most of these affect every platform, and each comes with an integral test in [`tests/`](tests/):
- Bazaars can stop buying pottery and beer the city makes itself (this blocked winning Nekhen).
- Yearly births were about five times too high.
- A storage yard without road access stopped the city's storage totals, so stockpile goals never
  completed.
- Burning ruins could leave black tiles where a merged house burned, and loaded fires had no flames.
- Statues showed the wrong statue in their fourth rotation.
- Mission briefings from Nekhen on were silent on iOS, and the historical-period videos were never
  played; they now play before each period's first mission.
- Granary roofs showed the wrong food, and overseer screens lost their layout after a resize.
- A failing script could break the top menu, sidebar and game timer.

## Building for iPhone

You need a Mac with Xcode and the iOS SDK, CMake, an Apple ID signed into Xcode, and the game data
from _Pharaoh_ with the _Cleopatra_ expansion, patched to version 1.3. A free Apple ID works, but
its builds stop launching after 7 days and have to be built and installed again.

```
cmake -B build-ios-device -G Xcode -DCMAKE_TOOLCHAIN_FILE=cmake/ios-device.toolchain.cmake \
  -DOPTION_ENABLE_TRACY=OFF -DOPTION_ENABLE_VIDEO_RECORDING=OFF -DOPTION_ENABLE_INNOEXTRACT=OFF \
  -DGAME_IOS_BUNDLE_ID=<your bundle id> -DGAME_IOS_DEVELOPMENT_TEAM=<your team id>
xcodebuild -project build-ios-device/akhenaten.xcodeproj -scheme akhenaten -configuration RelWithDebInfo \
  -destination id=<device id> -allowProvisioningUpdates -allowProvisioningDeviceRegistration build
xcrun devicectl device install app --device <device id> build-ios-device/RelWithDebInfo-iphoneos/akhenaten.app
```

Then copy your Pharaoh folder (the one containing `campaign.txt`) into the app's
`Documents/PharaohData`, using Finder or the Files app. Leave out `akhenaten.conf` from a desktop
install: it would replace the iOS defaults, such as pinch zoom being on.

For the Simulator, use `cmake/ios-sim.toolchain.cmake` and build with `-sdk iphonesimulator`.

## Known issues
- Saves from the original _Pharaoh_ can load corrupted (an upstream issue).
- The unfolded screen is laid out for landscape only.

---

# Akhenaten [![Github Actions](x64/workflows/Akhenaten%20Build%20Windows/badge.svg)](https://github.com/dalerank/Akhenaten/actions)

[![Website](res/badges/website.svg)](https://dalerank.github.io/Akhenaten/)
[![Discord](res/badges/discord.svg)](https://discord.gg/HS4njmBvpb)
[![Download](res/badges/download.svg)](https://dalerank.itch.io/Akhenaten)

[![Windows](res/badges/windows.svg)](https://nightly.link/dalerank/Akhenaten/workflows/akhenaten_windows/master/windows_build.zip)
[![Linux](res/badges/linux.svg)](https://nightly.link/dalerank/Akhenaten/workflows/akhenaten_linux/master/linux_build.zip)
[![Mac/Arm](res/badges/mac-arm.svg)](https://nightly.link/dalerank/Akhenaten/workflows/akhenaten_mac_arm/master/macos_arm_build.zip)
[![Mac/x64](res/badges/mac-x64.svg)](https://nightly.link/dalerank/Akhenaten/workflows/akhenaten_mac_x64/master/macos_x64_build.zip)
[![Android](res/badges/android.svg)](https://nightly.link/dalerank/Akhenaten/workflows/akhenaten_android/master/apk.zip)
[![Web](res/badges/web.svg)](https://dalerank.github.io/Akhenaten/play/)

[![Tests](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/dalerank/28104123b52e0fc76b56b8df8ca345e7/raw/akhenaten-tests.json)](https://github.com/dalerank/Akhenaten/actions/workflows/akhenaten_integral_tests.yml)

Akhenaten aims to make the original game Pharaoh compatible with modern systems with redesigned original engine.
Unlike the original game, which was developed by Impressions Games, Akhenaten is a community-driven effort to keep the game alive and accessible.

This is a fork of the **Julius/Augustus** project with the aim of making it work with _Pharaoh_ instead of _Caesar 3_.

The work is still in progress, so any help or support is appreciated. Allows you to load original save games 
from Pharaoh and play the initial campaign missions without major issues.

For the original game, check out the page on [Steam](https://store.steampowered.com/app/564530/Pharaoh__Cleopatra/)
or [GOG](https://www.gog.com/en/game/pharaoh_cleopatra).<br>
For the official 2023 remake called _Pharaoh: A New Era_ (a separate project from Akhenaten), check out the Steam page [here](https://store.steampowered.com/app/1351080/Pharaoh_A_New_Era/). Note: Don't try to use resources from the remake, as they are not compatible with this project.

## Running the game

| Platform       | Latest release | Unstable build |
| -------------- | -------------- | -------------- |
| Windows        | -              | [![Github Actions](https://github.com/dalerank/akhenaten/workflows/Akhenaten%20Build%20Windows/badge.svg)](https://nightly.link/dalerank/Akhenaten/workflows/akhenaten_windows/master/windows_build.zip)  |
| Linux binary | -                | [![Github Actions](https://github.com/dalerank/akhenaten/workflows/Akhenaten%20Build%20Linux/badge.svg)](https://nightly.link/dalerank/Akhenaten/workflows/akhenaten_linux/master/linux_build.zip)        |
| Mac (arm)      | -              | [![Github Actions](https://github.com/dalerank/akhenaten/workflows/Akhenaten%20Build%20Mac/badge.svg)](https://nightly.link/dalerank/Akhenaten/workflows/akhenaten_mac_arm/master/macos_arm_build.zip)            |
| Mac (x64)      | -              | [![Github Actions](https://github.com/dalerank/akhenaten/workflows/Akhenaten%20Build%20Mac%20x86_64/badge.svg)](https://nightly.link/dalerank/Akhenaten/workflows/akhenaten_mac_x64/master/macos_x64_build.zip)            |
| Android        | -              | [![Github Actions](https://github.com/dalerank/akhenaten/workflows/Akhenaten%20Build%20Android/badge.svg)](https://nightly.link/dalerank/Akhenaten/workflows/akhenaten_android/master/apk.zip) |
| Flatpak        | -              | [![Github Actions](https://github.com/dalerank/akhenaten/workflows/Akhenaten%20Build%20Linux%20Flatpak/badge.svg)](https://nightly.link/dalerank/Akhenaten/workflows/akhenaten_flatpak/master/akhenaten.flatpak.zip) |
| Bazzite        | -              | [![Github Actions](https://github.com/dalerank/akhenaten/workflows/Akhenaten%20Build%20Bazzite/badge.svg)](https://nightly.link/dalerank/Akhenaten/workflows/akhenaten_bazzite/master/bazzite_build.zip) |
| Emscripten     | -              | [![Akhenaten Build Emscripten](https://github.com/dalerank/Akhenaten/actions/workflows/akhenaten_emscripten.yml/badge.svg)](https://github.com/dalerank/Akhenaten/actions/workflows/akhenaten_emscripten.yml) |



After downloading the most recent binaries from above or building them from source,
start Akhenaten and it will ask you to point to an original Pharaoh installation folder.

If you only have a Pharaoh installer (`.exe`) instead of an already-installed folder,
place it next to the Akhenaten binary as:

```
akhenaten.exe
innoextract.exe      # GOG / Inno Setup installers
unshield.exe         # Sierra / InstallShield (e.g. demo) — optional fallback
Installer/
  Setup.exe          # or pharaoh.exe demo installer
PharaohData/         # created automatically on first launch
```

On startup (when Steam Pharaoh is not found) Akhenaten will unpack `Installer/*.exe` into
`PharaohData`, verify `campaign.txt`, save the path to `akhenaten.cfg`, and continue.

Supported formats:
- **Inno Setup / GOG** via bundled [innoextract-nb](https://github.com/dalerank/innoextract-nb)
  (prebuilt binary downloaded from its GitHub Releases when `OPTION_ENABLE_INNOEXTRACT` is on;
  not built as part of the game)
- **InstallShield** (Sierra demo/retail) via `7z` (outer CAB) + [unshield](https://github.com/twogood/unshield) (`data1.cab`)

You can also use **Extract from installer…** in the configuration window, or:

```
akhenaten --extract-installer "C:\path\to\Setup.exe" --extract-dir "C:\path\to\pharaoh-data"
```

Akhenaten, like Julius and Augustus, requires the original assets (graphics, sounds, etc)
from an unmodified game installation to run, in this case it needs _Pharaoh_ **as well as the _Cleopatra_ expansion.**
The **Pharaoh demo is not supported** (it lacks `Pharaoh_Fonts` / Cleopatra image packs and will be rejected at startup).

Note that you must have permission to write in the game data directory as the saves will be
stored there; also, your game must be patched to last version (1.3 + Cleopatra) to run Akhenaten.

[![Patreon](res/badges/patreon.svg)](https://patreon.com/imspinner)
[![Sponsor](res/badges/sponsor.svg)](https://github.com/sponsors/dalerank)


## Building Akhenaten from source

On Windows 10/11, major Linux distributions, and macOS (arm64 or x86_64), the project can be configured and built using CMake presets (CMake 3.30 or later required).

With this approach, the project will be built into the ./build directory, and dependencies will be automatically downloaded and built via CMake's FetchContent.
-	Clone the repository
- In the project root directory, run (example for Linux):
```
# List available configuration presets
cmake --list-presets

# Configure the project
cmake --preset linux-gcc-debug-make

# Build the project
cmake --build --preset linux-gcc-debug-make
```

If the list of presets does not include the configuration or build type you need, you can add it:
-	Create a CMakeUserPreset.json file with your custom configuration (this file is not tracked by git)

or:
-	Override specific options or build types for an existing preset, for example:
```
# Configure the project
cmake --preset linux-gcc-debug-make -DCMAKE_BUILD_TYPE=Release -DOPTION_ENABLE_TRACY=OFF

# Build the project
cmake --build --preset linux-gcc-debug-make
```
Below are additional and alternative methods for configuring and building the project, including instructions for other platforms.

### Windows + Visual Studio

- Clone the repository
- Install [CMake](https://cmake.org/download/#latest)
- run update-workspace.bat, which download all SDL2 dependencies and create VS solution for you

### Windows + Yours IDE

To build with your favorite IDE, just import the cmakelists.txt file as a project and build from there. Otherwise, you can use [MinGW-w64](https://www.mingw-w64.org/downloads/) to build via CLI:

- Clone the repository
- Install [CMake](https://cmake.org/download/#latest)
- From the project's root folder execute, in order:

  ```
  mkdir build
  cd build
  cmake .. -G "MingGW Makefiles"
  mingw32-make
  ```

Note: All dependencies (SDL2, SDL2_mixer, zlib, etc.) are automatically downloaded and built via CMake's FetchContent, so no manual DLL copying is required for static builds.

### Linux

#### Building from source

- Clone the repository

- From the root folder execute:

  ```
  $ ./update-workspace-linux.sh
  $ cmake --build ./build --target clean
  $ cmake --build ./build
  ```

  * The script assumes that you are running Ubuntu. On other distributions you could find and install relevant packages manually and then run these commands instead of the script:
    ```
    mkdir build
    cd build
    cmake -DCMAKE_BUILD_TYPE=RelWithDebInfo ..
    cd ..
    ```

#### Running the binary

Assuming the zip file is in your Downloads directory:
```shell
cd ~/Downloads
unzip linux_build.zip
chmod +x akhenaten.linux
./akhenaten.linux
```

#### Building in Bazzite (https://bazzite.gg/) on Steam Deck or other platform
You will have to use rpm-ostree to install static version of stdc++ which is not recommended
and will make system updates slower.
But you won't be able to build Akhenaten without it. 
```shell
rpm-ostree install libstdc++-static
systemctl reboot
```
And after reboot:
```shell
./update-workspace-bazzite.sh
```

### MacOS (ARM only)

- Clone the repository

- From the root folder execute:

  ```
  $ ./compile_macos.sh
  ```

### Android

- Clone the repository

- From the root folder execute:

  ```
  sudo apt install openjdk-17-jdk openjdk-17-jre ninja-build
  sudo wget https://dl.google.com/android/repository/commandlinetools-linux-9123335_latest.zip
  sudo unzip commandlinetools-linux-9123335_latest.zip
  cd cmdline-tools/bin
  sdkmanager --install "platform-tools" "build-tools;30.0.1" "emulator" "platforms;android-33"
  cd ../../build
  cmake -DCMAKE_BUILD_DEPENDENCIES=android ..
  cd ../android
  ./gradlew assembleDebug
  ```

## Existing build options

### Building with logging stack trace on crash

Stack trace logging is automatically enabled when building in `Debug` or `RelWithDebInfo` mode. The `cpptrace` library is automatically downloaded via CMake's FetchContent, so no manual submodule checkout is required.

Simply build in Debug or RelWithDebInfo mode:

```shell
cmake -DCMAKE_BUILD_TYPE=Debug ..
# or
cmake -DCMAKE_BUILD_TYPE=RelWithDebInfo ..
```

### Running with different log levels

Use environment variable `SDL_LOG_PRIORITY` for adjustment of logging. For example:

```shell
SDL_LOG_PRIORITY=debug
```

By default `info` level is set.

### Running with tracy

Tracy profiler support is enabled by default via `OPTION_ENABLE_TRACY` (set to `ON`). The Tracy library is automatically downloaded via CMake's FetchContent, so no manual submodule checkout is required.

**Important:** This project uses Tracy v0.13.1. You must use the matching Tracy Profiler GUI version (v0.13.1) to connect to the application. Using a different version (e.g., v0.11.0 or v0.11.1) will result in a protocol mismatch error and the profiler will not work.

To build with tracy enabled (default):

```shell
cmake -DOPTION_ENABLE_TRACY=ON ..
# or simply (since it's ON by default)
cmake ..
```

To disable tracy:

```shell
cmake -DOPTION_ENABLE_TRACY=OFF ..
```

To use the profiler, download and run the Tracy Profiler GUI v0.13.1 from the [Tracy releases page](https://github.com/wolfpld/tracy/releases/tag/v0.13.1). If you need to build the profiler from source (e.g., for older hardware compatibility), make sure to build version v0.13.1.

### Debug screen capture (OpenH264)

Optional in-game screen recording (Debug menu → Write Video) is enabled by default on desktop via `OPTION_ENABLE_VIDEO_RECORDING`. It builds [OpenH264](https://github.com/cisco/openh264) with **meson + ninja + nasm** at configure time and muxes H.264 into `akhenaten_capture.mp4` via vendored [minimp4](https://github.com/lieff/minimp4).

```shell
# requires meson, ninja, and nasm on PATH (Windows can auto-download nasm)
cmake -DOPTION_ENABLE_VIDEO_RECORDING=ON ..
# disable (or auto-disabled if tools/build fail — game still builds)
cmake -DOPTION_ENABLE_VIDEO_RECORDING=OFF ..
```

Self-built OpenH264 is BSD-licensed source; Cisco’s binary MPEG-LA patent program does **not** apply to this static build.

### Command line parameters:

```
--logjsfiles
          print logs which files open with js
--log-sound
          log sound file loading (city sounds, speech, music, effects)
--nocrashdlg
          do not show crash dialog
--fulldmp
          create full dump on crash
--config
          always show configuration window on startup
--noconfig-window
          skip configuration window on startup (even if akhenaten.cfg is missing)
--config:NAME=VALUE
          override a game feature from akhenaten.conf (applied after the config file is loaded;
          CLI values take precedence over saved settings)
          bool: 1/0, true/false, yes/no, on/off
          float: numeric value (e.g. gameopt_game_speed=100)
          string: plain text
          vec2i: WxH or x,y (e.g. gameopt_display_size=1280x800)
          Example: --config:gameui_show_input_near_cursor=1 --config:gameui_draw_fps=0
--save_debug_texture
          save debug textures to DEV_TESTING/tex/
--unpack_scripts
          unpack embedded scripts to user directory
--nosound
          disable audio: skip sound manager init and audio file probing at startup
          (no SDL_mixer, no `cant find audio` warnings even without game data)
--no-resource
          run without Pharaoh data files (skips campaign.txt and AUDIO/ probing;
          DATA_DIR is then an optional VFS base path)
--extract-installer PATH
          extract Pharaoh data from an Inno Setup / GOG installer via innoextract,
          then use the extracted folder as the data directory
--extract-dir PATH
          output directory for --extract-installer (default: …/akhenaten/pharaoh-data
          next to the user config file)
--window
          enable window mode
--render RENDERER
          use specific renderer
--mods PATH
          set mods data directory path
--mixed PATH
          hot reload scripts from disk
--language CODE
          set game language (e.g., ru, en, fr, de, it, sp, po, pr, sw, tc, sc, kr)
--font PATH
          use custom TTF font file (overrides font from localization.js)
--display-scale NUMBER
          Scales the display by a factor of NUMBER. Number can be between 0.5 and 5
--cursor-scale NUMBER
          Scales the mouse cursor by a factor of NUMBER. Number can be 1, 1.5 or 2
--size WxH
          window size. Example: 800x600
--pos x,y
          window pos. Example: 10,10
--help
          show this help message
```

The last argument, if present, is interpreted as data directory of the Pharaoh installation.

### Mods and Scripts

Akhenaten supports modding through the `--mods` parameter, which allows you to specify a directory containing mod files (`.sgx` archives). The game will load mods from this directory in addition to the base game assets.

The `--mixed` parameter enables hot-reloading of JavaScript scripts from disk, which is useful for development and testing. The `--unpack_scripts` parameter extracts embedded scripts to the user directory for inspection or modification.

### Debugging embedded JavaScript (Visual Studio Code)

Akhenaten runs gameplay scripts in an embedded **mujs** VM. You can start a **Debug Adapter Protocol (DAP)** server from the in-game console, then **attach** from **Visual Studio Code** or **Cursor**, set breakpoints in `.js` files, inspect locals, and step through script execution (the native C++ game loop is debugged separately).

- Start the adapter (default port **4711**): in-game console command `js_debugger start` (see `js_debugger status|stop|verbose` in `src/js/js.cpp`).
- In VS Code, use an **attach** configuration for type **`mujs`** pointing at `localhost` and the same port.

A detailed walkthrough, including limitations of **Evaluate**/watch and tips for breakpoints, is in **[DEBUGGER_VSCODE.md](DEBUGGER_VSCODE.md)**.

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to the project.

## Changelog

See [CHANGELOG_2025.md](CHANGELOG_2025.md) or [CHANGELOG_2025_EN.md](CHANGELOG_2025_EN.md) for a summary of recent changes.

## Support

- **Issues**: Report bugs or request features on [GitHub Issues](https://github.com/dalerank/Akhenaten/issues)
- **Discord**: Join our [Discord community](https://discord.gg/HS4njmBvpb)
- **Website**: Visit [dalerank.github.io/Akhenaten](https://dalerank.github.io/Akhenaten/)

![Alt](https://repobeats.axiom.co/api/embed/99a27c096522f0ed847ec37c6495d79552aeb13e.svg "Repobeats analytics image")










