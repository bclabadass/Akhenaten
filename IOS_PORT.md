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
**iOS Simulator build compiles, links, installs and launches on the iPhone 18 Pro simulator, using the SDK 26.0 link stamp (see "UIScene blocker").**
With game data in `Documents/PharaohData` it plays the logo and intro video, and launching with `--no-logo --nointro` reaches the main menu. Touch input and gameplay are untested.

### macOS integral test status
The iOS changes touch shared code (`platform.h`, `akhenaten.cpp`), so macOS was checked too:
- Baseline `855a339b9` (without these changes): 326 passed, 13 failed.
- With these changes, latest full run: 326 passed, the same 13 failed.
- Those 13 also fail without these changes: `120_mudbrick_small_place`, `123_mudbrick_medium_place`, `125_mudbrick_large_place`, `20_warship_wharf_placement`, `221_scribal_school_og_spawn`, `222_library_og_spawn`, `228_mortuary_og`, `240_dock_og`, `240_lumberjack_og`, `249_kingdom_request_sea`, `262_warship_wharf_og`, `268_true_large_pyramid_og_complete`, `80_birds_hunt`. Not investigated, and not checked on Linux, which is what CI uses.
- `02_main_menu_buttons` failed in one earlier full run with these changes (325 passed, 14 failed), then passed the latest full run and 5 of 5 solo runs on both builds. It looks flaky; the cause wasn't found.

Before committing: format with clang-format 20, from Homebrew's `llvm@20` (the plain `clang-format` formula is a newer version that CI would reject):
`PATH="$(brew --prefix llvm@20)/bin:$PATH" git clang-format --style=file --extensions cpp,cc,cxx,h,hpp`. Stage new files first, or it skips them. Leave the untracked `akhenaten-log.txt` out.

### UIScene blocker (iOS 27 SDK)
- Crash: `EXC_BREAKPOINT` in `UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`, from `UIApplicationMain` in `SDL_UIKitRunApp`, before any game code runs.
- Cause: SDL 2.32.10 has no UIScene code, and UIKit treats that as fatal for this binary (SDK stamp 27.2).
- Confirmed: stamping a copy of the same binary with SDK 26.0 stops the crash. Simulator only; not tested on a device.
- Repro on a copy of the app, never the build output:
  `vtool -set-build-version iossim 17.0 26.0 -replace -output <copy>.patched <copy>/akhenaten`, move it over `<copy>/akhenaten`, then `codesign -f -s - <copy>`.
- Current workaround: the `if(IOS)` link block in `CMakeLists.txt` passes `-platform_version <platform> <deployment target> 26.0`, so the normal build carries the stamp. It may stop working in a later iOS and is untested on a device; check it at step 5.
- Lasting fix if needed: scene support in SDL (scene manifest and delegate, and attach `UIWindow` to its `windowScene`). Decide after the device test; fold/unfold handling may also need it.

### Simulator state (Xcode 27.2, checked 2026-11-07)
- Runtime repair not needed: the CoreSimulator and CoreDevice errors no longer occur.
- **iPhone 18 Pro** (`<SIM_UDID>`) boots cleanly. Use this one.
- **iPhone Duo** (runtime 24B91016s) ends boot with `Data Migration Failed`, including on a brand-new device, so erasing is unlikely to help. No migrator failed (the log blames a "migration progress window incident"). `simctl io screenshot` also fails. Settings launches, but app rendering is unconfirmed. Recheck after Xcode or runtime updates.

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
4. `res/ios/Info.plist` (new; real executable name, numeric `CFBundleVersion`, `UILaunchScreen`, file sharing, landscape only), selected under `if(IOS)` in `CMakeLists.txt`. The macOS plist sets `CFBundleExecutable` to `launch.sh`, which made the iOS install fail.

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
- `simctl bootstatus` exits 0 even on `Data Migration Failed`; check its text. `simctl list runtimes` only shows that a runtime is registered, not that its devices work.
- No game log reaches the container, and stdout/stderr captured with `simctl launch --stdout/--stderr` were empty. The default log backend in `src/core/log.cpp` is set up with a bare `akhenaten-log.txt` filename, which probably resolves against an unwritable working directory on iOS (not confirmed). Until that's fixed, use crash reports (`~/Library/Logs/DiagnosticReports/akhenaten-*.ips`) and screenshots.
- `simctl launch <udid> <bundle id> --no-logo --nointro` passes arguments to the game, which is the way past screens that wait for a tap (`simctl` can't send touches).
- `GAME_PLATFORM_MACOSX` stays defined on iOS, and `is_macos()` returns true there. `GAME_PLATFORM_IOS` / `is_ios()` mark only what differs, so check for `is_ios()` first when adding Apple-specific code.
- `simctl uninstall` deletes the app's container, including the copied game data. `simctl install` over an existing app keeps it.

## Next steps
1. ~~Repair the Simulator runtime~~: not needed. See "Simulator state".
2. ~~First Simulator launch~~: done on the iPhone 18 Pro with the SDK stamp.
3. ~~iOS platform layer~~: done. `GAME_PLATFORM_IOS`, `src/platform/platform_ios.cpp` (data dir resolved each launch, `get_steam_path` empty, user dir via `SDL_GetPrefPath`), Configuration dialog skipped on iOS, and a clean exit with instructions when data is missing. Still to do: the iOS log file (see gotchas); the virtual keyboard functions are stubs; save/load is untested.
4. ~~Data into Simulator~~: done. Main menu loads on the iPhone 18 Pro with `~/Games/Pharaoh` copied to `Documents/PharaohData` in the app container (`xcrun simctl get_app_container <udid> <bundle id> data`).
5. **Device build**: `cmake/ios-device.toolchain.cmake` (sysroot `iphoneos`), separate `build-ios-device` folder, signing team + bundle id, Developer Mode on the Duo, copy data via Finder > iPhone > Files. Free Apple ID = re-sign every 7 days.
6. **Playability**: existing touch layer (`src/input/touch.cpp`, used by Vita/Switch/Android paths); add right-click (long-press / two-finger tap), drag-to-pan instead of edge scroll, pinch-zoom; handle SDL window resize on fold/unfold.
7. Compare engine bugs with the Mac build; check or report them upstream. Optional: offer the CMake iOS changes upstream as a PR.
