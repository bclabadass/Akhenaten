#include "platform.h"

#if defined(GAME_PLATFORM_IOS)

#include "core/bstring.h"
#include "core/log.h"
#include "game/game_config.h"

#include <SDL.h>

#include <cstdlib>
#include <filesystem>
#include <system_error>

uint32_t platform_init_sdl_flags() {
    return 0;
}

// iOS suspends apps and later kills them without a normal exit, so game_t::exit() never gets
// to save changed settings. An event watch runs as the app leaves the foreground, while the
// next frame might never come; save() does nothing when nothing changed.
static int SDLCALL save_settings_when_backgrounded(void*, SDL_Event* event) {
    if (event->type == SDL_APP_WILLENTERBACKGROUND || event->type == SDL_APP_TERMINATING) {
        logs::info("platform::ios: leaving foreground, saving settings");
        game_features::save();
        logs::flush();
    }
    return 1;
}

void platform_post_hint_init() {
    SDL_AddEventWatch(save_settings_when_backgrounded, nullptr);
}

void platform_setup_begin() {
}

void platform_run_init_callback() {
}

void platform_run_per_frame_callback() {
}

int platform_poll_event(CoreEvent* event) {
    return SDL_PollEvent(reinterpret_cast<SDL_Event*>(event));
}

// Resolved on every launch: the sandbox path can change on reinstall, so a saved path would go stale.
pcstr platform_request_initial_data_directory() {
    pcstr home = std::getenv("HOME");
    if (!home) {
        logs::warn("platform::data_directory: HOME is not set");
        return nullptr;
    }

    static bstring512 data_dir(home, "/Documents/PharaohData");

    // Created up front so the folder is there to copy into from the Files app.
    std::error_code ec;
    std::filesystem::create_directories(data_dir.c_str(), ec);

    // The log is truncated on every launch, and reopening the app after a crash would wipe the
    // log that explains it. Runs once, before the log moves into this folder.
    const std::filesystem::path log_path = std::filesystem::path(data_dir.c_str()) / logs::default_filename;
    std::filesystem::rename(log_path, std::filesystem::path(data_dir.c_str()) / "akhenaten-log-previous.txt", ec);

    return data_dir.c_str();
}

void platform_append_startup_log(pcstr message) {
}

void platform_hide_startup_log() {
}

bool platform_run_main_loop(platform_pump_frame_cb pump_frame, platform_should_continue_cb should_continue) {
    while (should_continue()) {
        pump_frame();
    }
    return true;
}

void platform_resolve_user_directory(bstring512& dir) {
    char* pref = SDL_GetPrefPath("", "Akhenaten");
    if (pref) {
        dir = pref;
        SDL_free(pref);
    } else {
        logs::warn("platform::user_directory: SDL_GetPrefPath failed, using cwd");
        dir = ".";
    }
}

void platform_t::open_url(pcstr url, pcstr prefix) {
    SDL_OpenURL(url);
}

pcstr platform_t::get_steam_path() {
    return "";
}

// SDL leaves text input off on devices with an on-screen keyboard; starting it shows the keyboard.
// SDL also stops it when the player dismisses the keyboard, so tapping the field again re-shows it.
void platform_show_virtual_keyboard(const uint8_t* text, int max_length) {
    (void)text;
    (void)max_length;
    SDL_StartTextInput();
}

void platform_hide_virtual_keyboard(void) {
    if (SDL_IsTextInputActive()) {
        SDL_StopTextInput();
    }
}

#endif
