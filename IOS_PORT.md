# iOS Port — Working Notes (handoff)

Goal: play Pharaoh + Cleopatra on an **iPhone Duo** (iOS 27) via a native iOS build of Akhenaten (SDL2). Personal sideload only, not App Store.

## Environment
- Mac: M5 Pro MacBook Pro, macOS 27, Xcode 27.2 with iOS SDK, Homebrew cmake/git/libpng, `llvm@20` (for clang-format 20)
- Repo: `~/Developer/Akhenaten`, branch **`ios-port`** (upstream: github.com/dalerank/Akhenaten)
- Game data (Steam, Pharaoh 1.3 + Cleopatra, copied from a Windows install): `~/Games/Pharaoh` (contains `campaign.txt`), matching `data_directory` in `~/Library/Application Support/Akhenaten/akhenaten.cfg`.
  The integral suite runs with no family chosen, so its saves (`test_*.svx`, autosaves) go to a family of their own, `Save/Integral Tests/` (`fullpath_saves` in `src/io/gamestate/boilerplate.cpp`; `tests/281_test_saves_family.js`). Older runs left them loose in `Save/`. On 2026-11-07 the Mac's were moved into the family, and the family folder was copied to the Duo with `devicectl device copy to` (the phone never runs the suite, so the folder doesn't appear there by itself).
- Mac baseline build works: `./compile_macos.sh arm64`, run with
  `./build-arm64/akhenaten.app/Contents/MacOS/akhenaten --window --size 1280x960 <data dir>`
  (some visual/sound bugs, these are upstream engine issues, not port issues)
- Placeholders such as `<DUO_UDID>`, `<TEAM_ID>` and `<BUNDLE_ID>` stand for personal values, kept in `IOS_PORT.local.md` next to this file (not committed; listed in `.git/info/exclude`).
- Devices: **iPhone Duo** `<DUO_UDID>` (iPhone19,4, iOS 27.3 beta 24C5037i, Developer Mode on), iPad Pro 11" M1 `<IPAD_UDID>`.
- Signing: free Personal Team `<TEAM_ID>`, Apple ID signed into Xcode. Profiles last 7 days; the current one expires **2026-11-14**, so rebuild and reinstall after that.

## Status
**Runs on the iPhone Duo** (Debug build, signed, built with the iOS 27.2 SDK; UIScene support via an SDL patch). Brendan's report, 2026-11-07:
- Loads, shows the menus, and lists saved data.
- New maps work: scrolling, placing buildings, and walkers behave normally.
- **Loading a saved map crashes the game.** Not yet investigated.
- **Right-click: fixed, confirmed on the Duo.** A two-finger tap in the city view drops the build tool and undoes a drag in progress (`screen_city_t::handle_two_finger_gesture`); two-finger pan/pinch keeps it. Covered by `tests/278_touch_two_finger_cancel.js`, using the `__test_touch_down/move/up` helpers in `src/js/js_test_game.cpp` (not valid UTF-8: edit it byte-wise).
- **Right-click everywhere else: fixed, confirmed on the Duo.** A two-finger tap, or holding one finger and tapping another, is now a real right-click at the mouse level (`touch_multi_finger_gesture`/`touch_multi_finger_tap` in `src/input/touch.cpp`, used by `mouse::set_from_touch`), so windows, info panels, advisors, dialogs and the military/ship picking modes close or go back as with a mouse. Before, the old mapping only worked when the second finger lifted first; with the first finger up first it became a left click under the second finger. No finger in a two-finger gesture counts as a left click. Covered by `tests/280_touch_two_finger_right_click.js` (fails on the old code).
- **Settings now persist on iOS** (confirmed on the Duo). They were only written on a clean Quit or a game save; iOS suspends and later kills apps without one. `platform_ios.cpp` saves them from an SDL event watch on `SDL_APP_WILLENTERBACKGROUND`/`SDL_APP_TERMINATING` (logged as "platform::ios: leaving foreground, saving settings").
- **Pinch-zoom: fixed, confirmed on the Duo** (with "Enable zoom" on). Two causes:
  - Zoom was off by default (`gameui_zoom`), and with it off `zoom_t::update_value` resets the zoom every frame. It now defaults to on for iOS only (`src/game/game_config.cpp`); desktop and `--og` keep it off. The fresh-install default is untested on a device.
  - `get_latest_touch()` returned the same finger as `get_earliest_touch()` when both landed in the same millisecond (one iOS touch event), so the pinch measured 0 and never zoomed. Covered by `tests/279_touch_pinch_zoom_holds.js`.

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
- With the touch right-click and test-family changes (2026-11-07): 330 passed, the same 13 failed.
- `02_main_menu_buttons` failed once in an earlier full run and passed every run since. It looks flaky; the cause wasn't found.

Before committing: format with clang-format 20, from Homebrew's `llvm@20` (the plain `clang-format` formula is a newer version that CI would reject):
`PATH="$(brew --prefix llvm@20)/bin:$PATH" git clang-format --style=file --extensions cpp,cc,cxx,h,hpp`. Stage new files first, or it skips them. Repeat until it reports no changes: in files mixing tabs and spaces (e.g. `platform.h`) each pass reformats one more neighbouring line. Leave the untracked `akhenaten-log.txt` out.

### UIScene support (iOS 27 SDK)
- iOS 27 traps at launch (`UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`) on apps built with its SDK that don't adopt UIScene. SDL 2.32.10 (the latest SDL2) has none.
- A first workaround stamped the binary as SDK 26.0. iOS then ran the app in compatibility mode on the Duo: an iPhone 8 sized window (667x375 points), enlarged and fixed-size, so folding never resized it.
- Fix: `cmake/patches/sdl2-2.32.10-ios-uiscene.patch` backports SDL3's UIScene support to SDL2's uikit driver: `SDLUIKitSceneDelegate` and the app delegate's scene configuration; launch window and `SDL_main` start once the scene connects; game window and message-box window created on the scene; orientation read from the scene instead of `statusBarOrientation`. It only switches on when `Info.plist` has a `UIApplicationSceneManifest` (ours does).
- `CMakeLists.txt` applies the patch to the fetched SDL source on iOS builds only (`git apply`, with a reverse check so reconfiguring is safe; fails the configure if it doesn't apply). A new SDL version needs the patch regenerated.
- Confirmed: Simulator (iPhone 18 Pro, 874x402 points) and Duo (678x466 points in the state it was in), sharp, and folding/unfolding mid-game resizes the game with touch still accurate.
- Pinned for a potential future update: moving the engine to SDL3, which has this upstream.

### Simulator state (Xcode 27.2, checked 2026-11-07)
- **iPhone 18 Pro** (`<SIM_UDID>`) boots cleanly. Use this one.
- **iPhone Duo** simulator (runtime 24B91016s) ends boot with `Data Migration Failed`, even when brand-new. No migrator failed (the log blames a "migration progress window incident"), and `simctl io screenshot` fails. Recheck after Xcode or runtime updates; the real Duo is the better target anyway.

### Changes made on `ios-port`
1. `cmake/ios-sim.toolchain.cmake` and `cmake/ios-device.toolchain.cmake`: `CMAKE_SYSTEM_NAME iOS`, sysroot `iphonesimulator` / `iphoneos`, arm64, deployment target 17.0; repo root added to `CMAKE_FIND_ROOT_PATH` (so HarfBuzz finds the in-repo FreeType); `SDL2MIXER_MIDI_NATIVE OFF` (no iOS native-MIDI backend).
2. `CMakeLists.txt`:
   - ~line 47: if `CMAKE_TOOLCHAIN_FILE` is set, `BUILD_ADDITIONAL_CMAKE_ARGS` passes only `-DCMAKE_TOOLCHAIN_FILE=<abs path>` to dependency sub-builds; otherwise the original macOS arch/deployment args.
   - curl skipped on iOS. libpng: `PNG_FRAMEWORK OFF`, `PNG_TOOLS OFF`. `akhenaten-updater` (desktop self-update helper) not built on iOS.
   - Apple link block: `if(IOS)` branch with the iOS frameworks + `libSDL2main.a`.
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
When copying game data from a desktop install, leave out `akhenaten.conf`: the game saves every option in it, so a desktop copy overrides the iOS defaults (e.g. zoom on).

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
- The game log is `Documents/PharaohData/akhenaten-log.txt` (Files > On My iPhone > Akhenaten > PharaohData). Each launch moves the last one to `akhenaten-log-previous.txt` (`platform_ios.cpp`), so after a crash, open the app again and read the previous log. The log is also flushed when the app is backgrounded and when it aborts (a failed assert; the assert text itself is only in the crash report). Pull either one with `xcrun devicectl device copy from --device <id> --domain-type appDataContainer --domain-identifier <bundle id> --source Documents/PharaohData/akhenaten-log-previous.txt --destination <local path>`.
- `simctl launch <udid> <bundle id> --no-logo --nointro` passes arguments to the game (`simctl` can't send touches).
- Xcode 27.2 has no Simulator.app (`open -a Simulator` fails). The simulated device window is DeviceHub: `open /Applications/Xcode.app/Contents/Applications/DeviceHub.app`.
- `GAME_PLATFORM_MACOSX` stays defined on iOS, and `is_macos()` returns true there. `GAME_PLATFORM_IOS` / `is_ios()` mark only what differs, so check for `is_ios()` first when adding Apple-specific code.
- `simctl uninstall` deletes the app's container, including the copied game data. `simctl install` over an existing app keeps it.
- JS strings are interned as `xstring` and capped at 65,535 chars (`src/core/xstring.cpp`); longer ones abort.
- `src/mujs/CLAUDE.md` says MuJS sources are CRLF, but they are LF now.
- `vfs::file_remove` and `vfs::file_rename_os` used to hand relative paths (`Save/<family>/...`) to the OS as-is, which resolved them against the working directory rather than the data folder. Deleting saves silently did nothing, and on iOS campaign progress never saved (`unable to rename Save/<family>/progress.tmp -> progress.dat`), so won missions weren't recorded. Both now `resolve()` first, like reads and writes (test 284). Narmer's stranded Nubt win was restored on the Duo by copying `progress.tmp` to `progress.dat`. Side effect: the tests now delete their own saves, so `Save/Integral Tests/` on the Mac keeps only its autosaves (the Duo's copy still has the old 24).
- The victory screen asks for `smk/victory_balcony.smk`, which Pharaoh data doesn't have (its videos are `.bik` in `BINKS/`), so no victory video plays; upstream, not port-specific.
- **One script error used to freeze the UI for the session.** After any `[es=...]` handler threw, the VM error flag stayed set and `js_call_event_handlers` skipped every handler until a script reload, including top-menu drawing and sidebar input (seen on the Duo: top bar black, menu dead, after the well script failed at the month change). Now only the failing handler is skipped (`js_vm_disable_failed_handler`) and logged as "JS: handler … disabled until scripts reload"; grep the log for that line when a feature stops working. Tests 282 and 283.
- **Touch placement of non-draggable buildings** takes two taps: the first picks a tile (`screen_city_t::selected_tile`), a second tap on or beside the ghost confirms, and the building goes on the picked tile. The placement check used to follow the last finger (the planner re-checks the pointer tile every frame), so confirming one row over could build across a road. The check and the ghost now follow the picked tile; while the ghost is red, a tap beside it moves it instead of confirming (a booth fits only one tile at a crossroads, and picks land a tile off easily); and on iOS the ghost isn't drawn with no finger down and nothing picked (it used to linger beside the last building, looking like a second one). Test 285.
- **Mission wins opened from the Load dialog or Continue weren't recorded.** Only the family menu (`ui_dynasty_menu.js`) loaded the profile into `g_player`; otherwise the win went to an empty profile that `save()` refused, silently. `__game_player_record_mission_win` now loads the current family's profile first and logs if saving fails (test 286). Narmer's Thinis and Perwadjyt wins (2026-11-07) were lost this way.
- Saves made with no family chosen land loose in `Save/`, where the Load dialog (it lists `Save/<family>/`) never shows them.

## Next steps
1. ~~Simulator runtime, first launch, platform layer, data into Simulator~~: done.
2. ~~Device build~~: done; runs on the Duo.
3. **TODO later (Brendan may prototype here): original Pharaoh saves load corrupted. Upstream engine bug, not iOS-specific.**
   - Repro saves: `~/Games/Pharaoh/Save/Retryohep/Meidum 7.sav` and `Bahariya Oasis Victory.sav`.
   - On the Mac: Meidum 7 segfaults in `building_stonemason_guild::spawn_figure` on the first tick after loading. Bahariya loads.
   - On the Duo (Debug build), both trip `assert("pool_no_allocation")` in `building_temple_complex::on_post_load`; the decorative-tiles pool holds 2.
   - Load log for both: `runtime_data overflow: BUILDING_{BANDSTAND,BOOTH,JUGGLER_SCHOOL,CONSERVATORY} wrote 212 bytes` (`city_buildings.cpp:446`, limit 186), `id < MAX_BUILDINGS` (`city_buildings.cpp:29`), and `No building model registered for type 57/90/187/188/211/212`.
   - `building_entertainment::bind_dynamic` binds only 130 bytes, so the stream is most likely already misaligned before these records. Find the first bad building record.
   - Upstream `master` had no fix as of 2026-11-07 (branch level with `origin/master` at `24ce892ec`).
   - Repro without the UI: a throwaway test in `tests/` calling `__game_load_savegame('Retryohep/Meidum 7.sav')` then `__test_pump_frames(30)`, run with real data (`--nointro`, no `--no-resource`). The crash handler prints the backtrace to the game log.
   - Untested: saves made by Akhenaten itself, loaded on the Duo.
4. **Playability, remaining** (Brendan, 2026-11-07: "generally playable"; Nubt, Thinis and Perwadjyt completed on the Duo):
   - ~~Destroy tool destroying on a two-finger cancel~~: fixed. Measuring a clear-land drag marks its buildings DELETED_BY_PLAYER; cancel never restored them and the daily `building_update_state` demolished them, also while the selection was open (on touch it stays open between taps). Upstream bug, also hits a mouse right-click cancel. Test 287.
   - People moving out / low sentiment: checked 2026-11-08 with Narmer's `Thinis 2` and `Perwajyt 2` on the Mac; same behaviour, so not the port. Thinis 2 emigrates because of unemployment (24%, `low_mood_cause` = no jobs; migration -40% until it drops to ~10%). Perwajyt 2 is healthy (sentiment 98-100, no unemployment). The cause shows in the Population advisor (`city_migration_t::determine_reason()` only runs when the advisors open). Revisit only if a save shows emigration with low unemployment and food/taxes/wages fine.
   - **PINNED (Brendan, 2026-11-08): winning Perwadjyt doesn't go on to the cutscene.** Not investigated. Related clue: the victory screen asks for `smk/victory_balcony.smk`, which Pharaoh data doesn't have (its videos are `.bik` in `BINKS/`), so the victory video may fail and the flow stop there; check the log around `window_mission_won` / `Video: failed to open` after a Perwadjyt win.
   - UI scale on the small outer screen.
5. **Ferry-boat assert** (`figure_ferry_boat::figure_action`, `allow_move_type == EMOVE_WATER`) seen in a new game on the Duo; Debug builds only. Not reproduced on the Mac: the seven ferry tests and two Duo saves (no ferries in them) never trip it, and nothing in the code writes a ferry boat's move type after `on_create`. A local, uncommitted `[ferry-diag]` log line in `figure_ferry_boat.cpp` (before the assert) is in the Duo build, so if it happens again `akhenaten-log-previous.txt` will show the boat's state.
6. **Device build type**: Release/RelWithDebInfo for the Duo (asserts off like desktop, smaller stack frames, faster).
7. ~~Log file on iOS; virtual keyboard~~: done, both confirmed on the Duo.
8. Potential future update: move the engine to SDL3 (drops the SDL2 UIScene patch).
9. Compare engine bugs with the Mac build; check or report them upstream. Optional: offer the iOS changes upstream as a PR (the MuJS fix and the touch fixes are useful on their own).
