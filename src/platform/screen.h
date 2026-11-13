#pragma once

#include "platform/platform.h"
#include "core/vec2i.h"
#include "core/xstring.h"

struct platform_screen_t {
    vec2i pos;
    int centered = 0;
    vec2i minimum = {640, 480};
    int scale_percentage = 100;

    int scale_logical_to_pixels(int logical_value) const { return logical_value * scale_percentage / 100; }
    // Ceil so the logical→pixel round-trip never undershoots the window (avoids a 1px letterbox gap).
    int scale_pixels_to_logical(int pixel_value) const {
        if (scale_percentage <= 0) {
            return pixel_value;
        }
        return (pixel_value * 100 + scale_percentage - 1) / scale_percentage;
    }
    int get_scale() const { return scale_percentage; }

    int create(const xstring& title, const xstring& renderer, bool fullscreen, int display_scale_percentage,
      vec2i screen_size);
    void destroy();
    bool resize(int pixel_width, int pixel_height, int save);
    void move(int x, int y);
    void set_fullscreen();
    void set_windowed();
    void set_window_size(int pixel_width, int pixel_height);
    void center_window();
    void show_error_message_box(const char* title, const char* message);
    void warp_mouse(int* x, int* y);
    void* surface_format();
    vec2i get_max_resolution();
    void recreate_texture();
    int scale_display(int display_scale_percentage);
    bool ignore_window_size_changed() const { return ignore_size_changed; }
    vec2i get_window_size() const;

private:
    void* window = nullptr;
    bool ignore_size_changed = false;

    void set_scale_percentage(int new_scale, int pixel_width, int pixel_height);
};

extern platform_screen_t g_platform_screen;

// The iPhone Duo's screens, told apart by the window's size in points.
enum e_ios_screen { IOS_SCREEN_UNKNOWN = -1, IOS_SCREEN_FOLDED, IOS_SCREEN_INNER_LANDSCAPE, IOS_SCREEN_INNER_PORTRAIT };
e_ios_screen ios_screen_for(int width, int height);

struct ios_screen_tracker_t {
    e_ios_screen current = IOS_SCREEN_UNKNOWN;
    bool tall = false;
    bool landscape_sidebar_collapsed = false;
    // The city zoom kept for each screen. The inner screen draws the game at 67%, so it starts at 150%
    // to show buildings at the folded screen's size.
    float zoom_folded = 100.0f;
    float zoom_inner = 150.0f;

    float& zoom_for(e_ios_screen screen) { return screen == IOS_SCREEN_FOLDED ? zoom_folded : zoom_inner; }

    // On a move between the screens or a turn of the inner one: sets the sidebar, the allowed
    // orientations and the city zoom, and returns the display scale to switch to, or 0 to keep it.
    int on_window_size(int width, int height);

    // The zoom a city starts at: 100% off the Duo, else the current screen's (keeping its latest pinch).
    float city_zoom_for_load();
};
extern ios_screen_tracker_t g_ios_screen;