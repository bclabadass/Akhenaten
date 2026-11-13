#include "platform/screen.h"

#include "core/calc.h"
#include "core/log.h"
#include "game/game.h"
#include "graphics/graphics.h"
#include "graphics/elements/menu.h"
#include "graphics/image.h"
#include "graphics/screen.h"
#include "graphics/view/view.h"
#include "graphics/view/zoom.h"
#include "game/game_config.h"
#include "arguments.h"
#include "platform/android/android.h"
#include "platform/platform.h"
#include "platform/renderer.h"
#include "platform/switch/switch.h"
#include "platform/vita/vita.h"
#include "resource/icons.h"

#include "SDL.h"
#include "js/js_game.h"

#include <cstdio>
#include <stdlib.h>

platform_screen_t g_platform_screen;

namespace {
SDL_Window* as_sdl_window(void* window) {
    return static_cast<SDL_Window*>(window);
}
} // namespace

static int get_max_scale_percentage(int pixel_width, int pixel_height) {
    int width_scale_pct = pixel_width * 100 / g_platform_screen.minimum.x;
    int height_scale_pct = pixel_height * 100 / g_platform_screen.minimum.y;
    return SDL_min(width_scale_pct, height_scale_pct);
}

void platform_screen_t::set_scale_percentage(int new_scale, int pixel_width, int pixel_height) {
#ifdef __vita__
    scale_percentage = 100;
#else
    scale_percentage = calc_bound(new_scale, 50, 500);
#endif

    if (!pixel_width || !pixel_height) {
        return;
    }

    int max_scale_pct = get_max_scale_percentage(pixel_width, pixel_height);
    if (max_scale_pct < scale_percentage) {
        // Keep the same floor as calc_bound — a tiny/bogus window size must not push scale to e.g. 10%.
        scale_percentage = calc_bound(max_scale_pct, 50, 500);
    }

    // Never raise the SDL minimum above the current window — that forces the OS window to grow.
    int min_w = scale_logical_to_pixels(minimum.x);
    int min_h = scale_logical_to_pixels(minimum.y);
    if (min_w > pixel_width) {
        min_w = pixel_width;
    }
    if (min_h > pixel_height) {
        min_h = pixel_height;
    }
    SDL_SetWindowMinimumSize(as_sdl_window(window), min_w, min_h);

    const char* scale_quality = "linear";
#if !defined(GAME_PLATFORM_ANDROID)
    // Scale using nearest neighbour when we scale a multiple of 100%: makes it look sharper.
    // But not on MacOS: users are used to the linear interpolation since that's what Apple also does.
    if (scale_percentage % 100 == 0) {
        scale_quality = "nearest";
    }
#endif
    SDL_SetHint(SDL_HINT_RENDER_SCALE_QUALITY, scale_quality);
}

void* platform_screen_t::surface_format() {
    SDL_Surface* scr_surface = SDL_GetWindowSurface(as_sdl_window(window));
    return scr_surface->format;
}

#if !defined(GAME_PLATFORM_WIN) && !defined(GAME_PLATFORM_MACOSX)
static void set_window_icon() {
    // TODO platform_icon_get_pixels() not defined?
    // SDL_Surface *surface = SDL_CreateRGBSurfaceFrom(platform_icon_get_pixels(), 16, 16, 32, 16 * 4,
    //     0x000000ff, 0x0000ff00, 0x00ff0000, 0xff000000);
    // if (!surface) {
    //     SDL_LogError(SDL_LOG_CATEGORY_APPLICATION, "Unable to create surface for icon. Reason: %s", SDL_GetError());
    // }
    // SDL_SetWindowIcon(SDL.window, surface);
    // SDL_FreeSurface(surface);
}
#endif

int platform_screen_t::create(const xstring& title, const xstring& renderer, bool fullscreen,
  int display_scale_percentage, vec2i screen_size) {
#if defined(GAME_PLATFORM_ANDROID)
    // scale.screen_density = android_get_screen_density();
#endif

    set_scale_percentage(display_scale_percentage, 0, 0);

    vec2i wsize;
    if (!fullscreen && g_render.is_fullscreen_only()) {
        fullscreen = true;
    }

    // For emscripten, always use windowed mode and get size from canvas
    if (platform.is_emscripten()) {
        fullscreen = false;
        // Use a reasonable default size - actual size will be obtained after window creation
        wsize = {1920, 1080};
    } else if (fullscreen) {
        SDL_DisplayMode mode;
        SDL_GetDesktopDisplayMode(0, &mode);
        wsize = {mode.w, mode.h};
    } else {
        // Prefer cfg/CLI size; std::max with gameopt default blocked lower resolutions.
        wsize = screen_size;
        if (wsize.x <= 0 || wsize.y <= 0) {
            wsize = game_features::gameopt_display_size.to_vec2i();
        }
        if (wsize.x <= 0 || wsize.y <= 0) {
            wsize = {1280, 800};
        }
        // Config / video-mode sizes are window pixels; scale only affects the logical backbuffer.
        game_features::gameopt_display_size.set(wsize);
    }

    destroy();

#if defined(GAME_PLATFORM_ANDROID)
    // Fix for wrong colors on some android devices
    SDL_GL_SetAttribute(SDL_GL_RED_SIZE, 5);
    SDL_GL_SetAttribute(SDL_GL_GREEN_SIZE, 6);
    SDL_GL_SetAttribute(SDL_GL_BLUE_SIZE, 5);
#endif

    logs::info("Creating screen %d x %d, %s, driver: %s", wsize.x, wsize.y, fullscreen ? "fullscreen" : "windowed",
      SDL_GetCurrentVideoDriver());
    Uint32 flags = SDL_WINDOW_RESIZABLE;

#if SDL_VERSION_ATLEAST(2, 0, 1)
    flags |= SDL_WINDOW_ALLOW_HIGHDPI;
#endif

    if (fullscreen) {
        flags |= SDL_WINDOW_FULLSCREEN_DESKTOP;
    }

    platform_render_setup_options(renderer);
    if (!renderer.empty() && renderer == "opengl") {
        flags |= SDL_WINDOW_OPENGL;
    }
    window = SDL_CreateWindow(title.c_str(), SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED, wsize.x, wsize.y, flags);

    if (!window) {
        logs::error("Unable to create window: %s", SDL_GetError());
        return 0;
    }

#if !defined(_WIN32) && !defined(__APPLE__)
    // Windows and mac don't need setting a window icon. In fact the icon gets blurry if we do
    set_window_icon();
#endif

    // For emscripten and fullscreen-only platforms, always get the actual window size
    // as the canvas size may differ from the requested size
    if (g_render.is_fullscreen_only() || platform.is_emscripten()) {
        SDL_GetWindowSize(as_sdl_window(window), &wsize.x, &wsize.y);
    }

    if (!platform_renderer_init(as_sdl_window(window), renderer)) {
        return 0;
    }

    vec2i tmp_size;
    SDL_SetWindowIcon(as_sdl_window(window), load_icon_surface(":akhenaten_72.png", tmp_size));

#if !defined(__APPLE__)
    if (fullscreen && SDL_GetNumVideoDisplays() > 1) {
        SDL_SetWindowGrab(as_sdl_window(window), SDL_TRUE);
    }
#endif // !__APPLE__
    set_scale_percentage(display_scale_percentage, wsize.x, wsize.y);
    return resize(wsize.x, wsize.y, 1);
}

void platform_screen_t::destroy() {
    platform_renderer_destroy();
    if (window) {
        SDL_DestroyWindow(as_sdl_window(window));
        window = nullptr;
    }
}

bool platform_screen_t::resize(int pixel_width, int pixel_height, int save) {
#if defined(GAME_PLATFORM_ANDROID)
    constexpr int k_min_logical_w = 800;
    constexpr int k_min_logical_h = 600;
    const int max_fit_scale = SDL_min(pixel_width * 100 / k_min_logical_w,
                                      pixel_height * 100 / k_min_logical_h);
    int requested;
    if (g_args.has_arg("display_scale_percentage")) {
        requested = g_args.get_display_scale_percentage();
    } else {
        requested = (int)(android_get_screen_density() * 100.0f + 0.5f);
        g_args.set_display_scale_percentage(SDL_min(requested, max_fit_scale));
        requested = g_args.get_display_scale_percentage();
    }
    set_scale_percentage(SDL_min(requested, max_fit_scale), pixel_width, pixel_height);
#endif

#if defined(GAME_PLATFORM_IOS)
    // The window itself: at startup the size passed in is the saved one, possibly the other screen's.
    const vec2i window_size = get_window_size();
    if (const int scale = g_ios_screen.on_window_size(window_size.x, window_size.y)) {
        set_scale_percentage(scale, pixel_width, pixel_height);
    }
#endif

    int logical_width = scale_pixels_to_logical(pixel_width);
    int logical_height = scale_pixels_to_logical(pixel_height);

#if defined(GAME_PLATFORM_IOS)
    const vec2i actual = get_window_size();
    logs::info("platform::ios: resize to %dx%d, window is %dx%d, scale %d%%, canvas %dx%d, orientation %d", pixel_width,
      pixel_height, actual.x, actual.y, scale_percentage, logical_width, logical_height, (int)SDL_GetDisplayOrientation(0));
#endif

    if (save) {
        // Store window pixels (matches video-mode list), not logical size.
        game_features::gameopt_display_size.set({pixel_width, pixel_height});
    }

    if (platform_renderer_create_render_texture(logical_width, logical_height)) {
        g_screen.set_resolution(logical_width, logical_height);
        return true;
    }

    return false;
}

ios_screen_tracker_t g_ios_screen;

e_ios_screen ios_screen_for(int width, int height) {
    const int short_side = SDL_min(width, height);
    if (short_side < 600 || short_side >= 700) {
        return IOS_SCREEN_FOLDED;
    }
    return height > width ? IOS_SCREEN_INNER_PORTRAIT : IOS_SCREEN_INNER_LANDSCAPE;
}

int ios_screen_tracker_t::on_window_size(int width, int height) {
    const e_ios_screen next = ios_screen_for(width, height);
    const bool was_tall = tall;
    tall = height > width;
    if (next == IOS_SCREEN_FOLDED) {
        // The folded screen is landscape only. Leaving portrait, iOS picks a landscape itself, so until
        // the window is landscape only the preferred one is allowed: the phone's right side at the bottom.
        SDL_SetHint(SDL_HINT_ORIENTATIONS, tall ? "LandscapeLeft" : "LandscapeLeft LandscapeRight");
    }
    if (next == current) {
        // Launched folded and held upright, the window is briefly portrait before iOS turns it to
        // landscape; the scale picked for that shape doesn't suit the landscape one.
        return (next == IOS_SCREEN_FOLDED && tall != was_tall) ? 100 : 0;
    }

    const e_ios_screen prev = current;
    current = next;
    if (prev == IOS_SCREEN_UNKNOWN || (prev == IOS_SCREEN_FOLDED) != (next == IOS_SCREEN_FOLDED)) {
        if (prev != IOS_SCREEN_UNKNOWN) {
            zoom_for(prev) = g_zoom.ftarget();
        }
        const float zoom = zoom_for(next);
        if (game.session.active) {
            g_zoom.set_scale(zoom);
        } else {
            g_zoom.zoom = g_zoom.target = zoom;
        }
    }
    if (prev == IOS_SCREEN_INNER_LANDSCAPE) {
        landscape_sidebar_collapsed = g_camera.sidebar_collapsed;
    }

    if (next != IOS_SCREEN_FOLDED) {
        SDL_SetHint(SDL_HINT_ORIENTATIONS, "LandscapeLeft LandscapeRight Portrait");
    }

    if (next == IOS_SCREEN_FOLDED) {
        g_camera.sidebar_collapsed = true;
        return 100;
    }

    // The inner screen is a 3x display, so 67% draws the game at about 2x and fits more city. Only
    // set on crossing between the screens, so the Display options slider keeps working.
    const bool from_folded = (prev == IOS_SCREEN_FOLDED || prev == IOS_SCREEN_UNKNOWN);
    if (from_folded) {
        landscape_sidebar_collapsed = false;
    }
    // Portrait is too narrow for the sidebar; turning back restores it as it was.
    g_camera.sidebar_collapsed = (next == IOS_SCREEN_INNER_PORTRAIT) ? true : landscape_sidebar_collapsed;
    return from_folded ? 67 : 0;
}

vec2i platform_screen_t::get_window_size() const {
    int width = 0;
    int height = 0;
    if (window) {
        SDL_GetWindowSize(as_sdl_window(window), &width, &height);
    }
    return {width, height};
}

int platform_screen_t::scale_display(int display_scale_percentage) {
    int width, height;
    SDL_GetWindowSize(as_sdl_window(window), &width, &height);

    g_args.set_display_scale_percentage(display_scale_percentage);

    // Keep the OS window pixel size fixed; only the logical backbuffer changes.
    ignore_size_changed = true;

    if (!platform.is_android()) {
        set_scale_percentage(display_scale_percentage, width, height);
    }

    // save=0: do not overwrite gameopt_display_size with the logical (scaled) size.
    resize(width, height, 0);

    int new_w = 0;
    int new_h = 0;
    SDL_GetWindowSize(as_sdl_window(window), &new_w, &new_h);
    if (new_w != width || new_h != height) {
        SDL_SetWindowSize(as_sdl_window(window), width, height);
        resize(width, height, 0);
    }

    ignore_size_changed = false;
    return scale_percentage;
}

void platform_screen_t::move(int x, int y) {
    if (!game.is_fullscreen()) {
        pos.x = x;
        pos.y = y;
        centered = 0;
        SDL_SetWindowPosition(as_sdl_window(window), x, y);
    }
}

void platform_screen_t::set_fullscreen() {
    SDL_GetWindowPosition(as_sdl_window(window), &pos.x, &pos.y);
    int display = SDL_GetWindowDisplayIndex(as_sdl_window(window));
    SDL_DisplayMode mode;

    if (platform.is_emscripten()) {
        // For emscripten, get the actual window size after setting fullscreen
        // as SDL_GetDesktopDisplayMode may return incorrect values
        if (0 != SDL_SetWindowFullscreen(as_sdl_window(window), SDL_WINDOW_FULLSCREEN_DESKTOP)) {
            logs::info("Unable to enter fullscreen: %s", SDL_GetError());
            return;
        }
        SDL_GetWindowSize(as_sdl_window(window), &mode.w, &mode.h);
        logs::info("User to fullscreen %d x %d on display %d", mode.w, mode.h, display);
    } else {
        SDL_GetDesktopDisplayMode(display, &mode);
        logs::info("User to fullscreen %d x %d on display %d", mode.w, mode.h, display);
        if (0 != SDL_SetWindowFullscreen(as_sdl_window(window), SDL_WINDOW_FULLSCREEN_DESKTOP)) {
            logs::info("Unable to enter fullscreen: %s", SDL_GetError());
            return;
        }
        SDL_SetWindowDisplayMode(as_sdl_window(window), &mode);
    }

    if (!platform.is_macos()) {
        if (SDL_GetNumVideoDisplays() > 1) {
            SDL_SetWindowGrab(as_sdl_window(window), SDL_TRUE);
        }
    }

    game.set_fullscreen(true);
    game_features::gameopt_display_size.set({mode.w, mode.h});
}

void platform_screen_t::set_windowed() {
    if (g_render.is_fullscreen_only()) {
        return;
    }
    // gameopt_display_size is window pixels (same units as the video-mode list).
    auto wsize = game_features::gameopt_display_size.to_vec2i();
    SDL_SetWindowFullscreen(as_sdl_window(window), 0);
    SDL_SetWindowSize(as_sdl_window(window), wsize.x, wsize.y);
    if (centered) {
        center_window();
    }
    if (SDL_GetWindowGrab(as_sdl_window(window)) == SDL_TRUE) {
        SDL_SetWindowGrab(as_sdl_window(window), SDL_FALSE);
    }
    game.set_fullscreen(false);
}

void platform_screen_t::set_window_size(int pixel_width, int pixel_height) {
    if (g_render.is_fullscreen_only()) {
        return;
    }
    // Arguments are window pixels from the video-mode list — do not multiply by display scale.
    if (game.is_fullscreen()) {
        SDL_SetWindowFullscreen(as_sdl_window(window), 0);
    } else {
        SDL_GetWindowPosition(as_sdl_window(window), &pos.x, &pos.y);
    }
    if (SDL_GetWindowFlags(as_sdl_window(window)) & SDL_WINDOW_MAXIMIZED) {
        SDL_RestoreWindow(as_sdl_window(window));
    }
    ignore_size_changed = true;
    SDL_SetWindowSize(as_sdl_window(window), pixel_width, pixel_height);
    if (centered) {
        center_window();
    }
    if (SDL_GetWindowGrab(as_sdl_window(window)) == SDL_TRUE) {
        SDL_SetWindowGrab(as_sdl_window(window), SDL_FALSE);
    }
    game.set_fullscreen(false);
    game_features::gameopt_display_size.set({pixel_width, pixel_height});
    // Refresh logical for current scale (SIZE_CHANGED ignored above; may not fire if size unchanged).
    resize(pixel_width, pixel_height, 1);
    ignore_size_changed = false;
}

void platform_screen_t::center_window() {
    int display = SDL_GetWindowDisplayIndex(as_sdl_window(window));
    SDL_SetWindowPosition(as_sdl_window(window), SDL_WINDOWPOS_CENTERED_DISPLAY(display),
      SDL_WINDOWPOS_CENTERED_DISPLAY(display));
    centered = 1;
}

void platform_screen_t::recreate_texture() {
#if defined(GAME_PLATFORM_WIN)
    // On Windows, if ctrl + alt + del is pressed during fullscreen, the rendering context may be lost for a few frames
    // after restoring the window, preventing the texture from being recreated. This forces an attempt to recreate the
    // texture every frame to bypass that issue.
    if (game.is_fullscreen() && platform_renderer_lost_render_texture()) {
        SDL_DisplayMode mode;
        SDL_GetWindowDisplayMode(as_sdl_window(window), &mode);
        g_screen.set_resolution(scale_pixels_to_logical(mode.w), scale_pixels_to_logical(mode.h));
        platform_renderer_create_render_texture(screen_width(), screen_height());
    }
#endif
}

void platform_screen_t::show_error_message_box(const char* title, const char* message) {
    SDL_ShowSimpleMessageBox(SDL_MESSAGEBOX_ERROR, title, message, as_sdl_window(window));
}

void platform_screen_t::warp_mouse(int* x, int* y) {
    *x = calc_bound(*x, 0, screen_width() - 1);
    *y = calc_bound(*y, 0, screen_height() - 1);
    SDL_WarpMouseInWindow(as_sdl_window(window), scale_logical_to_pixels(*x), scale_logical_to_pixels(*y));
}

vec2i platform_screen_t::get_max_resolution() {
    SDL_DisplayMode mode;
    int index = SDL_GetWindowDisplayIndex(as_sdl_window(window));
    SDL_GetCurrentDisplayMode(index, &mode);
    return {scale_pixels_to_logical(mode.w), scale_pixels_to_logical(mode.h)};
}

float ios_screen_tracker_t::city_zoom_for_load() {
    if (current == IOS_SCREEN_UNKNOWN) {
        return 100.0f;
    }
    float& zoom = zoom_for(current);
    zoom = g_zoom.ftarget();
    return zoom;
}

static xstring __test_ios_screen_window(int width, int height) {
    const int scale = g_ios_screen.on_window_size(width, height);
    char out[128];
    const char *hint = SDL_GetHint(SDL_HINT_ORIENTATIONS);
    snprintf(out, sizeof(out), "%d,%d,%d,%s", (int)g_ios_screen.current, scale, g_camera.sidebar_collapsed ? 1 : 0, hint ? hint : "");
    return xstring(out);
}
ANK_FUNCTION_2(__test_ios_screen_window)

static void __test_ios_screen_reset() {
    g_ios_screen = ios_screen_tracker_t();
}
ANK_FUNCTION(__test_ios_screen_reset)

// Lays the game out for a window of this size (in pixels before the display scale), as a resize event would.
static void __test_screen_resize(int width, int height) {
    g_platform_screen.resize(width, height, 0);
}
ANK_FUNCTION_2(__test_screen_resize)
