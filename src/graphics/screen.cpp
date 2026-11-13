#include "screen.h"

#include "graphics/image.h"
#include "city/city_warnings.h"
#include "graphics/view/view.h"
#include "platform/renderer.h"
#include "graphics/graphics.h"
#include "window.h"
#include "js/js_game.h"
#include "platform/platform.h"
#include <algorithm>
#include <unordered_map>

screen_t g_screen;

void screen_t::set_resolution(int w, int h) {
    layout_stale = layout_stale || (width > 0 && (width != w || height != h));
    width = w;
    height = h;
    full = {w, h};
    dialog_offset.x = (width - 640) / 2;
    dialog_offset.y = (height - 480) / 2;

    g_render.clear_screen();
    g_render.set_clip_rectangle({ 0, 0 }, width, height);

    g_camera.set_screen_size(width, height);
    g_warning_manager.clear_all();
}

namespace {
    struct top_menu_sizes_t {
        int height = 30;
        int unfolded_height = 30;
        int unfolded_min_short_side = 900;
    };
    top_menu_sizes_t g_top_menu_sizes;
    float g_popup_scale = 1.0f;
    float g_collapsed_sidebar_scale = 1.0f;
    std::unordered_map<xstring, int> g_portrait_fit_widths;
    bool g_pretend_ios = false;
} // namespace

void ANK_REGISTER_CONFIG_ITERATOR(config_load_top_menu_sizes) {
    g_config_arch.r_section("top_menu_widget", [](archive arch) {
        g_top_menu_sizes.height = arch.r_int("height", 30);
        g_top_menu_sizes.unfolded_height = arch.r_int("unfolded_height", g_top_menu_sizes.height);
        g_top_menu_sizes.unfolded_min_short_side = arch.r_int("unfolded_min_short_side", 900);
    });
    g_config_arch.r_section("inner_screen", [](archive arch) {
        g_popup_scale = arch.r_float("popup_scale", 1.0f);
        g_collapsed_sidebar_scale = arch.r_float("collapsed_sidebar_scale", 1.0f);
        g_portrait_fit_widths.clear();
        arch.r_objects("portrait_fit",
          [](pcstr id, archive window) { g_portrait_fit_widths[xstring(id)] = window.r_int("width"); });
    });
}

void screen_pretend_ios(bool on) {
    g_pretend_ios = on;
    g_camera.set_screen_size(g_screen.width, g_screen.height);
}

bool screen_is_ios() {
    return platform.is_ios() || g_pretend_ios;
}

bool screen_inner_unfolded() {
    return screen_is_ios() && std::min(g_screen.full.x, g_screen.full.y) >= g_top_menu_sizes.unfolded_min_short_side;
}

bool screen_portrait() {
    return g_screen.full.y > g_screen.full.x;
}

int screen_portrait_fit_width(xstring id) {
    auto it = g_portrait_fit_widths.find(id);
    return it == g_portrait_fit_widths.end() ? 0 : it->second;
}

int top_menu_height() {
    return screen_inner_unfolded() ? g_top_menu_sizes.unfolded_height : g_top_menu_sizes.height;
}

float screen_popup_scale() {
    return screen_inner_unfolded() ? g_popup_scale : 1.0f;
}

float screen_collapsed_sidebar_scale() {
    return screen_inner_unfolded() ? g_collapsed_sidebar_scale : 1.0f;
}

void screen_set_virtual_scale(float s) {
    g_screen.width = (int)(g_screen.full.x / s);
    g_screen.height = (int)(g_screen.full.y / s);
    g_screen.dialog_offset.x = (g_screen.width - 640) / 2;
    g_screen.dialog_offset.y = (g_screen.height - 480) / 2;
}
