#include "screen.h"

#include "graphics/image.h"
#include "city/city_warnings.h"
#include "graphics/view/view.h"
#include "platform/renderer.h"
#include "graphics/graphics.h"
#include "window.h"
#include "js/js_game.h"
#include "platform/platform.h"

screen_t g_screen;

void screen_t::set_resolution(int w, int h) {
    layout_stale = layout_stale || (width > 0 && (width != w || height != h));
    width = w;
    height = h;
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
        int unfolded_min_width = 1000;
    };
    top_menu_sizes_t g_top_menu_sizes;
    bool g_pretend_ios = false;
} // namespace

void ANK_REGISTER_CONFIG_ITERATOR(config_load_top_menu_sizes) {
    g_config_arch.r_section("top_menu_widget", [](archive arch) {
        g_top_menu_sizes.height = arch.r_int("height", 30);
        g_top_menu_sizes.unfolded_height = arch.r_int("unfolded_height", g_top_menu_sizes.height);
        g_top_menu_sizes.unfolded_min_width = arch.r_int("unfolded_min_width", 1000);
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
    return screen_is_ios() && g_screen.width >= g_top_menu_sizes.unfolded_min_width;
}

int top_menu_height() {
    return screen_inner_unfolded() ? g_top_menu_sizes.unfolded_height : g_top_menu_sizes.height;
}
