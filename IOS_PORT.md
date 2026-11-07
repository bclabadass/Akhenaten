# iOS Port — Working Notes (handoff)

Goal: play Pharaoh + Cleopatra on an **iPhone Duo** (iOS 27) via a native iOS build of Akhenaten (SDL2). Personal sideload only, not App Store.

## Environment
- Mac: M5 Pro MacBook Pro, macOS 27, Xcode 27.2 with iOS SDK, Homebrew cmake/git/libpng, `llvm@20` (for clang-format 20)
- Repo: `~/Developer/Akhenaten`, branch **`ios-port`** (upstream: github.com/dalerank/Akhenaten)
- Game data (Steam, Pharaoh 1.3 + Cleopatra, copied from a Windows install): renamed on 2026-11-07 from `~/Games/Pharaoh` to **`~/Games/PharaohData`** (contains `campaign.txt`).
  The macOS config (`~/Library/Application Support/Akhenaten/akhenaten.cfg`) still has `data_directory=~/Games/Pharaoh`, which now holds only test saves the integral suite wrote there. **Pending decision:** rename the folder back, or repoint the config.
- Mac baseline build works: `./compile_macos.sh arm64`, run with
  `./build-arm64/akhenaten.app/Contents/MacOS/akhenaten --window --size 1280x960 <data dir>`
  (some visual/sound bugs, these are upstream engine issues, not port issues)
- Devices: **iPhone Duo** `<DUO_UDID>` (iPhone19,4, iOS 27.3 beta 24C5037i, Developer Mode on), iPad Pro 11" M1 `<IPAD_UDID>`.
- Signing: free Personal Team `<TEAM_ID>`, Apple ID signed into Xcode. Profiles last 7 days; the current one expires **2026-11-14**, so rebuild and reinstall after that.

## Status
**Runs on the iPhone Duo** (Debug build, signed, SDK 26.0 link stamp). Brendan's report, 2026-11-07:
- Loads, shows the menus, and lists saved data.
- New maps work: scrolling, placing buildings, and walkers behave normally.
- **Loading a saved map crashes the game.** Not yet investigated.
- **No right-click.** Placement mode can't be cancelled, so you get stuck with a building selected and eventually can't click off it.
- **Pinch-zoom** partly works but snaps back to the default zoom on release.

Simulator (iPhone 18 Pro): reaches the main menu and a game can be played with tap and drag.

### Device crash fixed: MuJS stack overflow
- Crash: `EXC_BAD_ACCESS` at the stack guard during `js_vm_sync` in startup. The iOS main thread has 1 MB of stack; macOS and the Simulator have 8 MB.
- Cause: `jsP_foldconst` (`jsparse.cpp`), `cvardecs` and `analyze` (`jscompile.cpp`) recursed on `->b`, one frame per element of an AST list, so long scripts overflowed 1 MB. They now loop over `AST_LIST` chains, as upstream MuJS does.
- Test: `mujs_self_test_long_list_parse` in `src/js/js_self_tests.cpp` parses a 20,000-element list on a 256 KB thread at every VM init. It crashed without the fix, crashed in `analyze` with only two walkers fixed, and passes with all three.
- No integral (JS) test can show this on macOS: JS strings are capped at 65,535 chars (`xstring`), and that's not deep enough to overflow 8 MB.

### macOS integral test status
The iOS changes touch shared code (`platform.h`, `akhenaten.cpp`, MuJS), so macOS is checked too:
- Baseline `855a339b9` (without these changes): 326 passed, 13 failed.
- With the platform-layer changes: 326 passed, the same 13 failed.
- Those 13 also fail without these changes: `120_mudbrick_small_place`, `123_mudbrick_medium_place`, `125_mudbrick_large_place`, `20_warship_wharf_placement`, `221_scribal_school_og_spawn`, `222_library_og_spawn`, `228_mortuary_og`, `240_dock_og`, `240_lumberjack_og`, `249_kingdom_request_sea`, `262_warship_wharf_og`, `268_true_large_pyramid_og_complete`, `80_birds_hunt`. Not investigated, and not checked on Linux, which is what CI uses.
- **With the MuJS fix: 319 passed, 20 failed, but that run had no game data** (folder renamed, see Environment). 5 of the 7 extra failures are editor tests that couldn't write to `<data dir>/Maps`. The other two, `211_animal_info_window` and `241_enemy_heavy_og`, are unexplained. Rerun once the data folder is sorted out.
- `02_main_menu_buttons` failed once in an earlier full run and passed every run since. It looks flaky; the cause wasn't found.

Before committing: format with clang-format 20, from Homebrew's `llvm@20` (the plain `clang-format` formula is a newer version that CI would reject):
`PATH="$(brew --prefix llvm@20)/bin:$PATH" git clang-format --style=file --extensions cpp,cc,cxx,h,hpp`. Stage new files first, or it skips them. Repeat until it reports no changes: in files mixing tabs and spaces (e.g. `platform.h`) each pass reformats one more neighbouring line. Leave the untracked `akhenaten-log.txt` out.

### UIScene blocker (iOS 27 SDK)
- Crash: `EXC_BREAKPOINT` in `UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`, from `UIApplicationMain` in `SDL_UIKitRunApp`, before any game code runs.
- Cause: SDL 2.32.10 has no UIScene code, and UIKit treats that as fatal for binaries stamped with the iOS 27 SDK.
- Workaround: the `if(IOS)` link block in `CMakeLists.txt` passes `-platform_version <platform> <deployment target> 26.0`. **Works on the Simulator and on the Duo (iOS 27.3 beta).** It may stop working in a later iOS.
- Lasting fix if needed: scene support in SDL (scene manifest and delegate, and attach `UIWindow` to its `windowScene`). Fold/unfold handling may also need it.

### Simulator state (Xcode 27.2, checked 2026-11-07)
- **iPhone 18 Pro** (`<SIM_UDID>`) boots cleanly. Use this one.
- **iPhone Duo** simulator (runtime 24B91016s) ends boot with `Data Migration Failed`, even when brand-new. No migrator failed (the log blames a "migration progress window incident"), and `simctl io screenshot` fails. Recheck after Xcode or runtime updates; the real Duo is the better target anyway.

### Changes made on `ios-port`
1. `cmake/ios-sim.toolchain.cmake` and `cmake/ios-device.toolchain.cmake`: `CMAKE_SYSTEM_NAME iOS`, sysroot `iphonesimulator` / `iphoneos`, arm64, deployment target 17.0; repo root added to `CMAKE_FIND_ROOT_PATH` (so HarfBuzz finds the in-repo FreeType); `SDL2MIXER_MIDI_NATIVE OFF` (no iOS native-MIDI backend).
2. `CMakeLists.txt`:
   - ~line 47: if `CMAKE_TOOLCHAIN_FILE` is set, `BUILD_ADDITIONAL_CMAKE_ARGS` passes only `-DCMAKE_TOOLCHAIN_FILE=<abs path>` to dependency sub-builds; otherwise the original macOS arch/deployment args.
   - curl skipped on iOS. libpng: `PNG_FRAMEWORK OFF`, `PNG_TOOLS OFF`. `akhenaten-updater` (desktop self-update helper) not built on iOS.
   - Apple link block: `if(IOS)` branch with the iOS frameworks + `libSDL2main.a`, and the SDK 26.0 link stamp.
   - macOS post-build blocks changed to `if(APPLE AND NOT IOS)`. The generic "Deploy engine data/" step still puts `data/` inside the iOS .app.
   - iOS bundle settings: `res/ios/Info.plist`; cache options `GAME_IOS_BUNDLE_ID` (default `mt.dalerank.akhenaten`) and `GAME_IOS_DEVELOPMENT_TEAM` (empty = no signing settings), mapped to Xcode's bundle ID, team and automatic signing.
3. Platform layer: `GAME_PLATFORM_IOS` / `is_ios()` (`platform.h`), `src/platform/platform_ios.cpp` (data dir `Documents/PharaohData` resolved each launch, `get_steam_path` empty, user dir via `SDL_GetPrefPath`), Configuration dialog skipped on iOS, clean exit with instructions when data is missing.
4. MuJS list walkers made iterative, plus the self-test (see above).
5. Earlier: `open_url` via `SDL_OpenURL`; `system()` removed or guarded (`imguifiledialog.cpp`, `figure_phrase.cpp`, `app_updater.cpp`).

## Build commands
Simulator:
```
cmake -B build-ios-sim -G Xcode -DCMAKE_TOOLCHAIN_FILE=cmake/ios-sim.toolchain.cmake \
  -DOPTION_ENABLE_TRACY=OFF -DOPTION_ENABLE_VIDEO_RECORDING=OFF -DOPTION_ENABLE_INNOEXTRACT=OFF > ios-configure.log 2>&1
cmake --build build-ios-sim --config Debug -- -sdk iphonesimulator CODE_SIGNING_ALLOWED=NO 2>&1 | tee ios-build.log
```
Device (Duo):
```
cmake -B build-ios-device -G Xcode -DCMAKE_TOOLCHAIN_FILE=cmake/ios-device.toolchain.cmake \
  -DOPTION_ENABLE_TRACY=OFF -DOPTION_ENABLE_VIDEO_RECORDING=OFF -DOPTION_ENABLE_INNOEXTRACT=OFF \
  -DGAME_IOS_BUNDLE_ID=<BUNDLE_ID> -DGAME_IOS_DEVELOPMENT_TEAM=<TEAM_ID> > ios-device-configure.log 2>&1
xcodebuild -project build-ios-device/akhenaten.xcodeproj -scheme akhenaten -configuration Debug \
  -destination id=<DUO_UDID> -allowProvisioningUpdates -allowProvisioningDeviceRegistration build 2>&1 | tee ios-device-build.log
xcrun devicectl device install app --device <DUO_UDID> build-ios-device/Debug-iphoneos/akhenaten.app
xcrun devicectl device process launch --device <DUO_UDID> --terminate-existing <BUNDLE_ID>
```
Installing over the existing app keeps its `Documents/PharaohData`.

### Standard checks
- After every configure (dependency sub-builds can fail WITHOUT stopping configure):
  `grep -n -E "failed with exit code|Could NOT find" <configure log> | grep -v PkgConfig` (should be empty)
- Dependency libs must match the target: `platform 7` = iOS Simulator, `platform 2` = iOS device, `platform 1` = macOS (wrong):
  `for lib in $(find <build dir>/libs -name "*.a"); do echo "$lib"; otool -l "$lib" | grep -m1 -A3 LC_BUILD_VERSION | grep platform; done`
- After a build: `grep -n -E "BUILD SUCCEEDED|BUILD FAILED" <build log>`; errors via `grep -n -m5 "error:"`.
- Changing anything that affects dependencies (toolchain file, dep options) needs the build folder deleted first. Source-only changes just need the build command.

## Lessons learned (gotchas in this codebase)
- `BUILD_ADDITIONAL_CMAKE_ARGS` is passed as `-DX=${list}` inside `execute_process`, so CMake splits the list and only the FIRST element reaches the sub-build. Keep it to one element (the toolchain file).
- That block is before `project()` (line ~61), so `IOS` is not defined yet there. Use `CMAKE_TOOLCHAIN_FILE` instead. `IOS` IS usable after `project()`.
- iOS cross-builds restrict `find_*` to the SDK; don't set find modes to BOTH (it would pick up Homebrew macOS libs). Adding the repo root to `CMAKE_FIND_ROOT_PATH` is the safe fix.
- iOS forbids `system()`; `fork()` compiles. Check for new `system(` calls after upstream merges.
- **The iOS main thread has a 1 MB stack** (macOS 8 MB, and the Simulator uses the Mac's). Deep recursion that's fine on the Mac or Simulator can crash on the device. Debug builds use about 4x more stack per frame than optimized ones.
- Device crash reports: `xcrun devicectl device info files --device <id> --domain-type systemCrashLogs`, then `xcrun devicectl device copy from --device <id> --domain-type systemCrashLogs --source <name>.ips --destination <local path>`.
- App files on the device: `xcrun devicectl device info files --device <id> --domain-type appDataContainer --domain-identifier <bundle id> --subdirectory Documents`. `device copy to` with the same domain copies files or folders in.
- A free team can't sign a bundle ID registered by another team, hence `<BUNDLE_ID>` for the device. xcodebuild signs only with an Apple ID signed into Xcode > Settings > Accounts ("No Accounts" error otherwise).
- `simctl bootstatus` exits 0 even on `Data Migration Failed`; check its text. `simctl list runtimes` only shows that a runtime is registered, not that its devices work.
- No game log reaches the app container. The default log backend in `src/core/log.cpp` uses a bare `akhenaten-log.txt` filename, which probably resolves against an unwritable working directory on iOS (not confirmed). Until that's fixed, use crash reports and screenshots.
- `simctl launch <udid> <bundle id> --no-logo --nointro` passes arguments to the game (`simctl` can't send touches).
- Xcode 27.2 has no Simulator.app (`open -a Simulator` fails). The simulated device window is DeviceHub: `open /Applications/Xcode.app/Contents/Applications/DeviceHub.app`.
- `GAME_PLATFORM_MACOSX` stays defined on iOS, and `is_macos()` returns true there. `GAME_PLATFORM_IOS` / `is_ios()` mark only what differs, so check for `is_ios()` first when adding Apple-specific code.
- `simctl uninstall` deletes the app's container, including the copied game data. `simctl install` over an existing app keeps it.
- JS strings are interned as `xstring` and capped at 65,535 chars (`src/core/xstring.cpp`); longer ones abort.
- `src/mujs/CLAUDE.md` says MuJS sources are CRLF, but they are LF now.

## Next steps
1. ~~Simulator runtime, first launch, platform layer, data into Simulator~~: done.
2. ~~Device build~~: done; runs on the Duo.
3. **Saved-game load crash on the Duo**: pull the crash reports and fix.
4. **Playability**: right-click (long-press or two-finger tap), so placement can be cancelled; pinch-zoom that keeps its zoom level; check drag-to-pan. Existing touch layer: `src/input/touch.cpp` (used by Vita/Switch/Android). Handle SDL window resize on fold/unfold.
5. Log file on iOS; virtual keyboard (stubs today); Release build for the device (smaller frames, faster).
6. Mac data folder decision, then rerun the macOS integral suite.
7. Compare engine bugs with the Mac build; check or report them upstream. Optional: offer the iOS changes upstream as a PR (the MuJS fix is useful on its own).
