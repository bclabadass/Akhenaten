#include "window.h"

#include "core/profiler.h"
#include "graphics/graphics.h"
#include "graphics/screen.h"
#include "window/autoconfig_window.h"
#include "input/cursor.h"
#include "input/scroll.h"
#include "graphics/elements/ui.h"
#include "platform/renderer.h"
#include "core/tokenum.h"
#include "graphics/elements/ui_js.h"
#include "game/game_events.h"

#include <cstring>

windows_manager_t g_window_manager;

xstring windows_manager_t::window_city = "window_city";
xstring windows_manager_t::window_main_menu = "window_main_menu";

struct event_window_back { vec2i pos; };
ANK_REGISTER_STRUCT_WRITER(event_window_back, pos)

namespace {
    float g_ui_scale = 1.0f;
    vec2i g_mouse_canvas;
    float g_last_popup_scale = 1.0f;
} // namespace

float window_ui_scale_for(xstring id) {
    const float scale = screen_popup_scale();
    if (scale == 1.0f || id.empty()) {
        return 1.0f;
    }

    // The city and its HUD keep the canvas scale; the top menu's dropdowns have their own (300).
    static const pcstr unscaled[] = {"window_city", "window_city_military", "window_city_transport",
      "window_city_warship", "window_sliding_sidebar", "top_menu_submenu", "top_menu_editor_submenu",
      "window_intro_video", "window_victory_video"};
    for (pcstr name : unscaled) {
        if (id == name) {
            return 1.0f;
        }
    }
    if (strncmp(id.c_str(), "window_editor", 13) == 0) {
        return 1.0f;
    }

    // Portrait: a fixed-size pop-up too wide for the screen at this scale is drawn just small enough to fit.
    if (screen_portrait()) {
        const int width = screen_portrait_fit_width(id);
        if (width > 0 && width * scale > g_screen.full.x) {
            return g_screen.full.x / (float)width;
        }
    }
    return scale;
}

float window_ui_scale_current() {
    return g_ui_scale;
}

void window_ui_scale_apply(float scale, bool record_for_flush) {
    if (scale == g_ui_scale) {
        return;
    }

    mouse& m = mouse::ref();
    if (g_ui_scale != 1.0f) {
        m.x = g_mouse_canvas.x;
        m.y = g_mouse_canvas.y;
    }
    if (scale != 1.0f) {
        g_mouse_canvas = {m.x, m.y};
        m.x = (int)(m.x / scale);
        m.y = (int)(m.y / scale);
    }
    g_ui_scale = scale;
    screen_set_virtual_scale(scale);
    g_render.set_ui_scale(scale);
    if (record_for_flush) {
        ui::push_ui_scale(scale);
    }
}

static void noop(int) {
}

static void noop_input(const mouse* m, const hotkeys* h) {
}

static void reset_input() {
    mouse::ref().reset_button_state();
    reset_touches(1);
    g_scroll.stop();
}

static void increase_queue_index() {
    auto& data = g_window_manager;
    data.queue_index++;
    if (data.queue_index >= data.window_queue.size())
        data.queue_index = 0;
}

static void decrease_queue_index(void) {
    auto& data = g_window_manager;
    data.queue_index--;
    if (data.queue_index < 0) {
        data.queue_index = data.window_queue.size() - 1;
    }

    auto w = data.window_queue[data.queue_index];
    ui::event(event_window_back{ vec2i{0, 0} }, w.id.c_str(), "on_restore");
}

bool windows_manager_t::window_is(xstring id) {
    return current_window && current_window->id == id;
}

xstring window_get_id() {
    auto& data = g_window_manager;
    return data.current_window->id;
}

void window_show(const window_type* window) {
    auto& data = g_window_manager;
    // push window into queue of screens to render
    reset_input();
    ui::stop_active_input();
    ui::clear_active_elements();
    increase_queue_index();
    data.window_queue[data.queue_index] = *window;
    data.current_window = &data.window_queue[data.queue_index];
    if (!data.current_window->draw_background)
        data.current_window->draw_background = noop;

    if (!data.current_window->draw_foreground)
        data.current_window->draw_foreground = noop;

    if (!data.current_window->handle_input) {
        data.current_window->handle_input = noop_input;
    }
}

void window_go_back() {
    auto& data = g_window_manager;
    // cant exit from city with rmb
    if (data.current_window->id == windows_manager_t::window_city
        || data.current_window->id == windows_manager_t::window_main_menu) {
        return;
    }

    reset_input();
    ui::stop_active_input();
    decrease_queue_index();

    data.current_window = &data.window_queue[data.queue_index];
}

void windows_manager_t::update_input_after() {
    auto& data = g_window_manager;
    reset_touches(0);
    mouse::ref().reset_scroll();
    if (data.current_window) {
        input_cursor_update(data.current_window->id);
    }
    hotkey_reset_state();
}

void windows_manager_t::handle_input(const mouse *m, const hotkeys *h) {
    if (current_window) {
        window_ui_scale_apply(window_ui_scale_for(current_window->id), false);
        current_window->handle_input(m, h);
        window_ui_scale_apply(1.0f, false);
    }
}

void windows_manager_t::handle_tooltip(const mouse *m) {
    if (current_window) {
        tooltip_handle(m, current_window->draw_tooltip);
    }
}

void window_draw(int force) {
    auto& data = g_window_manager;
    if (screen_popup_scale() != g_last_popup_scale) {
        g_last_popup_scale = screen_popup_scale();
        g_screen.layout_stale = true;
    }
    if (g_screen.layout_stale) {
        g_screen.layout_stale = false;
        autoconfig_window::refresh_layout_for_screen();
    }

    // draw the current (top) window in the queue
    ui::begin_frame();

    if (!touch_to_mouse()) {
        mouse::ref().determine_button_state(); // touch overrides mouse
    }

    window_type* w = data.current_window;
    if (!w) {
        return;
    }

    {
        OZZY_PROFILER_SECTION(_, "Render/Frame/Refresh");
        g_render.clear_screen();
    }

    window_ui_scale_apply(window_ui_scale_for(w->id), true);

    {
        OZZY_PROFILER_SECTION(_, "Render/Frame/Window/Background");
        w->draw_background(UiFlags_None);
    }

    {
        OZZY_PROFILER_SECTION(_, "Render/Frame/Foreground");
        w->draw_foreground(UiFlags_None);
    }

    {
        OZZY_PROFILER_SECTION(_, "Render/Frame/Tooltip");
        data.handle_tooltip(&mouse::get());
    }

    window_ui_scale_apply(1.0f, true);
    ui::flush_commands();
}

void window_draw_underlying_window(int flags) {
    auto& data = g_window_manager;
    if (data.underlying_windows_redrawing < data.window_queue.size()) {
        ++data.underlying_windows_redrawing;
        decrease_queue_index();

        window_type* window_behind = &data.window_queue[data.queue_index];
        const float scale_above = g_ui_scale;
        window_ui_scale_apply(window_ui_scale_for(window_behind->id), true);
        if (window_behind->draw_background)
            window_behind->draw_background(flags);

        if (window_behind->draw_foreground)
            window_behind->draw_foreground(flags);

        window_ui_scale_apply(scale_above, true);
        increase_queue_index();
        ui::clear_active_elements();
        --data.underlying_windows_redrawing;
    }
}
