# iOS Port — Working Notes (handoff)

Goal: play Pharaoh + Cleopatra on an **iPhone Duo** (iOS 27) via a native iOS build of Akhenaten (SDL2). Personal sideload only, not App Store.

## Environment
- Mac: M5 Pro MacBook Pro, macOS 27, Xcode with iOS SDK, Homebrew cmake/git/libpng
- Repo: `~/Developer/Akhenaten`, branch **`ios-port`** (upstream: github.com/dalerank/Akhenaten)
- Game data (Steam, Pharaoh 1.3 + Cleopatra, copied from a Windows install): `~/Games/Pharaoh` (contains `campaign.txt`)
- Mac baseline build works: `./compile_macos.sh arm64`, run with
  `./build-arm64/akhenaten.app/Contents/MacOS/akhenaten --window --size 1280x960 ~/Games/Pharaoh`
  (some visual/sound bugs, these are upstream engine issues, not port issues)

## Status
**iOS Simulator build compiles, links and post-builds successfully (all committed).**
Not yet launched in the Simulator.

### Changes made on `ios-port`
1. `cmake/ios-sim.toolchain.cmake` (new): `CMAKE_SYSTEM_NAME iOS`, sysroot `iphonesimulator`, arm64, deployment target 17.0; appends repo root to `CMAKE_FIND_ROOT_PATH` (so HarfBuzz finds the in-repo FreeType); `SDL2MIXER_MIDI_NATIVE OFF` (no iOS native-MIDI backend).
2. `CMakeLists.txt`:
   - ~line 47: if `CMAKE_TOOLCHAIN_FILE` is set, `BUILD_ADDITIONAL_CMAKE_ARGS` passes only `-DCMAKE_TOOLCHAIN_FILE=<abs path>` to dependency sub-builds; otherwise the original macOS arch/deployment args.
   - curl skipped on iOS (`AND NOT IOS` on both curl conditions). Code already guards with `GAME_HAVE_CURL`.
   - libpng: `PNG_FRAMEWORK OFF`, `PNG_TOOLS OFF`.
   - Apple link block: new `if(IOS)` branch (UIKit, Foundation, CoreFoundation, CoreGraphics, QuartzCore, OpenGLES, Metal, MetalKit, CoreVideo, CoreAudio, AudioToolbox, AVFoundation, CoreMotion, CoreHaptics, CoreBluetooth, GameController, z + `libSDL2main.a`); original block kept as `elseif(APPLE)`.
   - macOS post-build blocks (copy into `Contents/MacOS`) changed to `if(APPLE AND NOT IOS)`. The generic "Deploy engine data/ next to binary" step still runs and puts `data/` inside the iOS .app.
3. Source:
   - `src/platform/platform_macos.cpp`: `open_url` now uses `SDL_OpenURL(url)`.
   - `src/dev/imguifiledialog.cpp` (2 places): `mkdir -p` via `system()` replaced by `std::filesystem::create_directories`.
   - `src/figure/figure_phrase.cpp` (TTS dev tool) and `src/core/app_updater.cpp` (self-update): `system()` guarded out with `#if defined(__APPLE__) && TARGET_OS_IPHONE`.

## Build commands (Simulator)
```
cd ~/Developer/Akhenaten
cmake -B build-ios-sim -G Xcode \
  -DCMAKE_TOOLCHAIN_FILE=cmake/ios-sim.toolchain.cmake \
  -DOPTION_ENABLE_TRACY=OFF -DOPTION_ENABLE_VIDEO_RECORDING=OFF -DOPTION_ENABLE_INNOEXTRACT=OFF \
  > ios-configure.log 2>&1
cmake --build build-ios-sim --config Debug -- -sdk iphonesimulator CODE_SIGNING_ALLOWED=NO 2>&1 | tee ios-build.log
```
Output app: `build-ios-sim/Debug-iphonesimulator/akhenaten.app`

### Standard checks
- After every configure (dependency sub-builds can fail WITHOUT stopping configure):
  `grep -n -E "failed with exit code|Could NOT find" ios-configure.log | grep -v PkgConfig` (should be empty; PkgConfig lines are harmless)
- Dependency libs must be iOS Simulator (`platform 7`, not `platform 1` = macOS):
  `for lib in $(find build-ios-sim/libs -name "*.a"); do echo "$lib"; otool -l "$lib" | grep -m1 -A3 LC_BUILD_VERSION | grep platform; done`
- After a build: `grep -n -E "BUILD SUCCEEDED|BUILD FAILED" ios-build.log`; real errors via `grep -n -m5 "error:"`, linker details via `grep -n -E "Undefined symbols|^ld:" ios-build.log`.
- Changing anything that affects dependencies (toolchain file, dep options) needs `rm -rf build-ios-sim` first. Source-only changes just need the build command.

## Lessons learned (gotchas in this codebase)
- `BUILD_ADDITIONAL_CMAKE_ARGS` is passed as `-DX=${list}` inside `execute_process`, so CMake splits the list and only the FIRST element reaches the sub-build. Keep it to one element (the toolchain file).
- That block is before `project()` (line ~61), so `IOS` is not defined yet there. Use `CMAKE_TOOLCHAIN_FILE` instead. `IOS` IS usable after `project()`.
- iOS cross-builds restrict `find_*` to the SDK; don't set find modes to BOTH (it would pick up Homebrew macOS libs). Adding the repo root to `CMAKE_FIND_ROOT_PATH` is the safe fix.
- iOS forbids `system()`; `fork()` compiles. Check for new `system(` calls after upstream merges.

## Next steps
1. **Repair the Simulator runtime**: the build log showed "CoreSimulator is out of date" and a CoreDevice plugin load error. Run `sudo xcodebuild -runFirstLaunch`, then `xcrun simctl list runtimes` until it shows an iOS runtime cleanly (open Xcode once / update macOS if needed).
2. **First Simulator launch**: boot a device, `xcrun simctl install booted <app>`, `xcrun simctl launch --console booted <bundle id>`. Expect it to fail finding game data.
3. **iOS platform layer**:
   - `GAME_PLATFORM_IOS` in `src/platform/platform.h` (via `TargetConditionals.h` / `TARGET_OS_IPHONE`); check `GAME_PLATFORM_MACOSX` isn't also set on iOS, or that macOS-only code paths handle it.
   - `src/platform/platform_ios.cpp` (start from `platform_macos.cpp`): data dir = `Documents/PharaohData`, user/save dir via `SDL_GetPrefPath` or Documents, `get_steam_path` returns empty. Wire it into the CMake platform file list for iOS.
   - iOS `Info.plist` (bundle id, `UILaunchScreen`, `UIFileSharingEnabled`, `LSSupportsOpeningDocumentsInPlace`, orientations), set via `MACOSX_BUNDLE_INFO_PLIST` under `if(IOS)` instead of `res/macos/Info.plist`.
4. **Data into Simulator**: copy `~/Games/Pharaoh` into the app container (`xcrun simctl get_app_container booted <bundle id> data`) under `Documents/PharaohData`. Milestone: main menu loads.
5. **Device build**: `cmake/ios-device.toolchain.cmake` (sysroot `iphoneos`), separate `build-ios-device` folder, signing team + bundle id, Developer Mode on the Duo, copy data via Finder > iPhone > Files. Free Apple ID = re-sign every 7 days.
6. **Playability**: existing touch layer (`src/input/touch.cpp`, used by Vita/Switch/Android paths); add right-click (long-press / two-finger tap), drag-to-pan instead of edge scroll, pinch-zoom; handle SDL window resize on fold/unfold.
7. Compare engine bugs with the Mac build; check or report them upstream. Optional: offer the CMake iOS changes upstream as a PR.
