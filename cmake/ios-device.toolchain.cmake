set(CMAKE_SYSTEM_NAME iOS)
set(CMAKE_OSX_SYSROOT iphoneos)
set(CMAKE_OSX_ARCHITECTURES arm64)
set(CMAKE_OSX_DEPLOYMENT_TARGET 17.0)
# Let dependency builds find libraries built inside this repo (e.g. FreeType for HarfBuzz)
get_filename_component(_akh_root "${CMAKE_CURRENT_LIST_DIR}/.." ABSOLUTE)
list(APPEND CMAKE_FIND_ROOT_PATH "${_akh_root}")
# SDL2_mixer has no iOS native-MIDI backend; Pharaoh doesn't use MIDI
set(SDL2MIXER_MIDI_NATIVE OFF CACHE BOOL "" FORCE)
