#include "platform.h"

#if defined(GAME_PLATFORM_IOS)

#include "core/bstring.h"
#include "core/log.h"
#include "game/game_config.h"
#include "input/keyboard.h"
#include "platform/screen.h"

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
    // Opened upright, the window starts in portrait: right for the inner screen, and on the folded one the
    // screen tracker (g_ios_screen) turns it to landscape at once. Starting landscape only would turn an
    // inner-screen launch to portrait in the middle of the intro.
    SDL_SetHint(SDL_HINT_ORIENTATIONS, "LandscapeLeft LandscapeRight Portrait");
}

void platform_setup_begin() {
}

void platform_run_init_callback() {
}

// iOS can raise the keyboard by itself when the screen rotates or folds. SDL then either turns
// text input on, or, mid-transition, leaves it off with the keyboard up, and SDL only hides a
// keyboard it knows it showed. Nothing in the game would ever close either one.
static void dismiss_stray_keyboard() {
    constexpr Uint32 screen_change_settle_ms = 700;
    static vec2i last_size = {0, 0};
    static SDL_DisplayOrientation last_orientation = SDL_ORIENTATION_UNKNOWN;
    static Uint32 check_at = 0;

    const vec2i size = g_platform_screen.get_window_size();
    const SDL_DisplayOrientation orientation = SDL_GetDisplayOrientation(0);
    if (size != last_size || orientation != last_orientation) {
        check_at = last_size.x > 0 ? SDL_GetTicks() + screen_change_settle_ms : 0;
        last_size = size;
        last_orientation = orientation;
    }

    if (g_keyboard.is_capturing()) {
        check_at = 0;
        return;
    }

    if (SDL_IsTextInputActive()) {
        SDL_StopTextInput();
        return;
    }

    if (check_at && SDL_TICKS_PASSED(SDL_GetTicks(), check_at)) {
        check_at = 0;
        SDL_StartTextInput();
        SDL_StopTextInput();
    }
}

void platform_run_per_frame_callback() {
    dismiss_stray_keyboard();
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
