#include "window_city.h"

#include "overlays/city_overlay.h"
#include "building/construction/build_planner.h"
#include "city/city_message.h"
#include "game/game_events.h"
#include "city/city.h"
#include "city/city_warnings.h"
#include "core/profiler.h"
#include "dev/debug.h"
#include "game/game.h"
#include "figure/formation.h"
#include "graphics/graphics.h"
#include "graphics/elements/lang_text.h"
#include "graphics/elements/panel.h"
#include "graphics/image.h"
#include "graphics/screen.h"
#include "graphics/text.h"
#include "graphics/window.h"
#include "graphics/view/lookup.h"
#include "grid/grid.h"
#include "scenario/scenario.h"
#include "scenario/criteria.h"
#include "widget/widget_sidebar.h"
#include "widget/widget_city.h"
#include "widget/widget_figure_follow.h"
#include "window/window_advisors.h"
#include "core/log.h"
#include "graphics/elements/button.h"
#include "graphics/elements/image_button.h"
#include "graphics/elements/ui.h"
#include "graphics/image_groups.h"
#include "game/game_config.h"
#include "input/hotkey.h"
#include "input/mouse.h"
#include "input/touch.h"
#include "input/scroll.h"
#include "platform/platform.h"
#include "building/building.h"
#include "window/window_info.h"
#include <climits>
#include <iterator>

window_city g_window_city;

static void button_cancel_construction(int, int) {
    logs::info("[build-btn] CANCEL callback build_type=%d in_progress=%d", (int)g_city_planner.build_type,
               g_city_planner.in_progress ? 1 : 0);
    g_city_planner.construction_cancel();
    logs::info("[build-btn] CANCEL done build_type=%d", (int)g_city_planner.build_type);
}

static void button_confirm_construction(int, int) {
    logs::info("[build-btn] CONFIRM callback build_type=%d in_progress=%d draggable=%d sel=%d cur=%d",
               (int)g_city_planner.build_type, g_city_planner.in_progress ? 1 : 0,
               g_city_planner.draggable() ? 1 : 0, g_screen_city.selected_tile.grid_offset(),
               g_screen_city.current_tile.grid_offset());
    g_screen_city.confirm_construction_placement();
    logs::info("[build-btn] CONFIRM done build_type=%d in_progress=%d", (int)g_city_planner.build_type,
               g_city_planner.in_progress ? 1 : 0);
}

static void button_rotate_construction(int, int) {
    events::emit(event_rotate_building{1});
}

// Hit boxes match the 3x2 panels (48x32); drawn image stays 39x26 via image_buttons_draw.
static image_button construction_buttons[] = {
  {-4, -4, 48, 32, IB_NORMAL, GROUP_OK_CANCEL_SCROLL_BUTTONS, 4, button_cancel_construction, button_none, 0, 0, 1},
  {-4, 32, 48, 32, IB_NORMAL, GROUP_OK_CANCEL_SCROLL_BUTTONS, 0, button_confirm_construction, button_none, 0, 0, 1},
  {-20, 32, 64, 43, IB_NORMAL, GROUP_OK_CANCEL_SCROLL_BUTTONS, 0, button_rotate_construction, button_none, 0, 0, 0},
};

static int construction_button_pressed = -1;

// mouse::is_touch only holds while a finger is down, and a button has to be there to be tapped.
static bool touch_only_platform() {
    return platform.is_android() || platform.is_ios();
}

static int construction_buttons_count();
static bool construction_rotate_visible();

static bool construction_buttons_visible() {
    if (!(touch_only_platform() || mouse::get().is_touch) || !g_city_planner.build_type) {
        return false;
    }
    return construction_buttons_count() > 0 || construction_rotate_visible();
}

// The top menu bar is taller on the unfolded inner screen; the buttons keep the same gap below it.
static vec2i construction_buttons_base_pos() {
    return {g_camera.size_pixels.x - 4 * 16, top_menu_height() + 14};
}

// Slots used by the icon buttons. Two-finger tap already cancels, so outside Android (which has
// its confirm button there too) cancel only shows if turned on in Options.
static int construction_buttons_count() {
    if (platform.is_android()) {
        return 2;
    }
    return !!game_features::gameui_touch_cancel_button ? 1 : 0;
}

// Sits in the first free slot below the placement buttons, and is drawn separately: it has text
// rather than an icon.
static bool construction_rotate_visible() {
    return g_city_planner.can_rotate() && !g_city_planner.in_progress;
}

static void update_construction_rotate_button() {
    construction_buttons[2].enabled = construction_rotate_visible();
    construction_buttons[2].y = -4 + 36 * construction_buttons_count();
}

// Padded touch areas overlap between buttons, so a tap goes to the nearest one.
static int construction_button_at(vec2i pt) {
    const vec2i base = construction_buttons_base_pos();
    const int padding = 12; // Touch padding for touchscreen interactions
    int nearest = -1;
    int nearest_distance = INT_MAX;
    for (int i = 0; i < (int)std::size(construction_buttons); i++) {
        const image_button &btn = construction_buttons[i];
        if (!btn.enabled)
            continue;
        const int x0 = base.x + btn.x - padding;
        const int x1 = base.x + btn.x + btn.width + padding;
        const int y0 = base.y + btn.y - padding;
        const int y1 = base.y + btn.y + btn.height + padding;
        if (pt.x < x0 || pt.x >= x1 || pt.y < y0 || pt.y >= y1)
            continue;
        const int dx = pt.x - (base.x + btn.x + btn.width / 2);
        const int dy = pt.y - (base.y + btn.y + btn.height / 2);
        const int distance = dx * dx + dy * dy;
        if (distance < nearest_distance) {
            nearest_distance = distance;
            nearest = i;
        }
    }
    return nearest;
}

bool is_in_construction_buttons_region(vec2i pt) {
    if (!construction_buttons_visible())
        return false;
    const vec2i base = construction_buttons_base_pos();
    const int count = construction_buttons_count();
    const int x0 = base.x - 32;
    const int x1 = base.x + 60;
    const int y0 = base.y - 24;
    const int slots = count + (construction_rotate_visible() ? 1 : 0);
    const int y1 = base.y + 36 + 44 * (slots - 1) + (construction_rotate_visible() ? 12 : 0);
    return pt.x >= x0 && pt.x < x1 && pt.y >= y0 && pt.y < y1;
}


int window_city::draw_background(UiFlags flags) {
    OZZY_PROFILER_FUNCTION();
    autoconfig_window::draw_background(flags);
    return 0;
}

void window_city::draw_paused_panel() {
    ui::dispatch_autoconfig_es_event(&g_window_city, __func__, {});
}

void window_city_draw_time_left_panel() {
    if (scenario_criteria_time_limit_enabled() && !g_scenario.has_won) {
        int years;
        if (scenario_criteria_max_year() <= game.simtime.year + 1) {
            years = 0;
        } else {
            years = scenario_criteria_max_year() - game.simtime.year - 1;
        }
        int total_months = 12 - game.simtime.month + simulation_time_t::months_in_year * years;
        small_panel_draw({ 1, 25 }, 15, 1);
        int width = lang_text_draw(6, 2, 6, 29, FONT_NORMAL_BLACK_ON_LIGHT);
        text_draw_number(total_months, '@', " ", 6 + width, 29, FONT_NORMAL_BLACK_ON_LIGHT);
        //        city_view_dirty = 1;
    } else if (scenario_criteria_survival_enabled() && !g_scenario.has_won) {
        int years;
        if (scenario_criteria_max_year() <= game.simtime.year + 1) {
            years = 0;
        } else {
            years = scenario_criteria_max_year() - game.simtime.year - 1;
        }
        int total_months = simulation_time_t::months_in_year - game.simtime.month + simulation_time_t::months_in_year * years;
        small_panel_draw({ 1, 25 }, 15, 1);
        int width = lang_text_draw(6, 3, 6, 29, FONT_NORMAL_BLACK_ON_LIGHT);
        text_draw_number(total_months, '@', " ", 6 + width, 29, FONT_NORMAL_BLACK_ON_LIGHT);
    }
}

static void draw_construction_buttons() {
    if (!construction_buttons_visible()) {
        return;
    }

    const vec2i base = construction_buttons_base_pos();
    const int count = construction_buttons_count();
    if (count > 0) {
        inner_panel_draw({base.x - 4, base.y - 4}, {3, 2});
    }
    if (count > 1) {
        inner_panel_draw({base.x - 4, base.y + 32}, {3, 2});
    }
    image_buttons_draw(base, construction_buttons, count);

    update_construction_rotate_button();
    if (construction_buttons[2].enabled) {
        const image_button& rotate = construction_buttons[2];
        const vec2i pos = base + vec2i{rotate.x, rotate.y};
        outer_panel_draw_exact(pos, {rotate.width, rotate.height});
        const int pressed_offset = rotate.pressed ? 1 : 0;
        text_draw_centered((const uint8_t*)"R", pos.x + pressed_offset, pos.y + 11 + pressed_offset, rotate.width,
          FONT_LARGE_BLACK_ON_LIGHT, COLOR_MASK_NONE);
    }
}

static bool handle_construction_buttons(const mouse *m) {
    if (!construction_buttons_visible()) {
        construction_button_pressed = -1;
        return false;
    }

    const int count = construction_buttons_count();
    construction_buttons[0].enabled = count > 0;
    construction_buttons[1].enabled = count > 1;
    update_construction_rotate_button();

    const vec2i base = construction_buttons_base_pos();
    // get_earliest_touch() hides fingers for ~150ms (start_delayed). Button downs
    // in that window never latched; use the raw finger and decide by start_point.
    const touch_t* t = (m->is_touch || touch_only_platform()) ? get_earliest_touch_raw() : nullptr;
    if (!t || !t->in_use) {
        construction_button_pressed = -1;
        construction_buttons[0].pressed = 0;
        construction_buttons[1].pressed = 0;
        construction_buttons[2].pressed = 0;
        return false;
    }

    auto fire = [] (int which) {
        if (which == 0)
            button_cancel_construction(0, 0);
        else if (which == 1)
            button_confirm_construction(0, 0);
        else if (which == 2)
            button_rotate_construction(0, 0);
    };

    const int hit_start = construction_button_at(t->start_point);
    const int hit_cur = construction_button_at(t->current_point);
    const bool in_region = is_in_construction_buttons_region(t->start_point)
                        || is_in_construction_buttons_region(t->current_point);

    if (t->has_started || t->has_ended) {
        logs::info(
            "[build-btn] touch start=(%d,%d) cur=(%d,%d) hit_start=%d hit_cur=%d in_region=%d "
            "started=%d ended=%d moved=%d click=%d base=(%d,%d) view=(%d,%d) "
            "btns={cancel:(%d,%d,%dx%d) confirm:(%d,%d,%dx%d)} build=%d progress=%d",
            t->start_point.x, t->start_point.y, t->current_point.x, t->current_point.y, hit_start, hit_cur, in_region ? 1 : 0,
            t->has_started, t->has_ended, t->has_moved, touch_was_click(t), base.x, base.y, g_camera.size_pixels.x,
            g_camera.size_pixels.y, base.x, base.y, construction_buttons[0].width, construction_buttons[0].height,
            base.x + construction_buttons[1].x, base.y + construction_buttons[1].y, construction_buttons[1].width,
            construction_buttons[1].height, (int)g_city_planner.build_type, g_city_planner.in_progress ? 1 : 0);
    }

    // Whole gesture: only steal if finger began on or in region of buttons.
    if (hit_start < 0 && !in_region) {
        construction_button_pressed = -1;
        return false;
    }

    const int active_btn = (hit_start >= 0) ? hit_start : (hit_cur >= 0 ? hit_cur : -1);

    if (active_btn >= 0) {
        construction_button_pressed = active_btn;
        construction_buttons[active_btn].pressed = 1;
        construction_buttons[active_btn].hovered = 2;
    } else {
        construction_button_pressed = -1;
        construction_buttons[0].pressed = 0;
        construction_buttons[1].pressed = 0;
        construction_buttons[2].pressed = 0;
    }

    if (t->has_ended) {
        construction_button_pressed = -1;
        construction_buttons[0].pressed = 0;
        construction_buttons[1].pressed = 0;
        construction_buttons[2].pressed = 0;
        if (active_btn >= 0) {
            logs::info("[build-btn] gesture click which=%d start=(%d,%d) end=(%d,%d)", active_btn, t->start_point.x,
                       t->start_point.y, t->current_point.x, t->current_point.y);
            fire(active_btn);
        }
    }
    return true;
}

// Touch has no right-click to open a company's orders, so while a company is selected to move, a
// button where the rotate button sits during placement opens them.
static bool company_orders_button_pressed = false;

static bool company_orders_button_visible() {
    return touch_only_platform() || mouse::get().is_touch;
}

static pcstr company_orders_button_text() {
    return lang_text_from_key("#company_orders_button");
}

static rect company_orders_button_rect() {
    const vec2i base = construction_buttons_base_pos();
    const image_button& rotate = construction_buttons[2];
    const int width
      = std::max<int>(rotate.width, text_get_width(company_orders_button_text(), FONT_LARGE_BLACK_ON_LIGHT) + 20);
    const int right = base.x + rotate.x + rotate.width;
    return {vec2i{right - width, base.y - 4}, vec2i{right, base.y - 4 + rotate.height}};
}

vec2i window_city_company_orders_button_center() {
    const rect r = company_orders_button_rect();
    return {(r.mn.x + r.mx.x) / 2, (r.mn.y + r.mx.y) / 2};
}

int window_city_company_orders_button_top() {
    return company_orders_button_rect().mn.y;
}

int window_city_construction_rotate_button_top() {
    update_construction_rotate_button();
    return construction_buttons_base_pos().y + construction_buttons[2].y;
}

void window_city_draw_company_orders_button() {
    if (!company_orders_button_visible()) {
        return;
    }

    const rect r = company_orders_button_rect();
    const vec2i size{r.w(), r.h()};
    outer_panel_draw_exact(r.mn, size);
    const int pressed_offset = company_orders_button_pressed ? 1 : 0;
    text_draw_centered((const uint8_t*)company_orders_button_text(), r.mn.x + pressed_offset,
      r.mn.y + 11 + pressed_offset, size.x, FONT_LARGE_BLACK_ON_LIGHT, COLOR_MASK_NONE);
}

bool window_city_handle_company_orders_button(const mouse* m, int formation_id) {
    const touch_t* t = (m->is_touch || touch_only_platform()) ? get_earliest_touch_raw() : nullptr;
    if (!t || !t->in_use) {
        company_orders_button_pressed = false;
        return false;
    }

    const int padding = 12;
    const rect r = company_orders_button_rect();
    auto on_button = [&](vec2i pt) {
        return pt.x >= r.mn.x - padding && pt.x < r.mx.x + padding && pt.y >= r.mn.y - padding
               && pt.y < r.mx.y + padding;
    };
    if (!on_button(t->start_point)) {
        company_orders_button_pressed = false;
        return false;
    }

    company_orders_button_pressed = on_button(t->current_point);
    if (t->has_ended) {
        const bool fire = company_orders_button_pressed;
        company_orders_button_pressed = false;
        const formation* f = formation_get(formation_id);
        building* fort = (fire && f && f->in_use) ? building_get(f->building_id) : nullptr;
        if (fort && fort->is_valid() && fort->is_fort()) {
            events::emit(event_show_tile_info{fort->tile, false, SOURCE_LOCATION, true});
        }
    }
    return true;
}

bool window_city_draw_construction_cost_and_size() {
    if (!g_city_planner.in_progress) {
        return false;
    }

    if (g_scroll.in_progress()) {
        return false;
    }

    int size_x, size_y;
    int cost = g_city_planner.total_cost;
    int has_size = g_city_planner.get_total_drag_size(&size_x, &size_y);
    if (!cost && !has_size) {
        return false;
    }

    painter ctx = game.painter();
    set_city_clip_rectangle(ctx);
    screen_tile screen = g_camera.selected_tile;
    int inverted_scale = calc_percentage<int>(100, g_zoom.get_percentage());
    int x = calc_adjust_with_percentage(screen.x, inverted_scale);
    int y = calc_adjust_with_percentage(screen.y, inverted_scale);

    if (cost) {
        color color;
        if (cost <= g_city.finance.treasury) // Color blind friendly
            color = g_scenario.is_desert() ? COLOR_FONT_ORANGE : COLOR_FONT_ORANGE_LIGHT;
        else
            color = COLOR_FONT_RED;
        text_draw_number_colored(cost, '@', " ", x + 58 + 1, y + 1, FONT_SMALL_PLAIN, COLOR_BLACK);
        text_draw_number_colored(cost, '@', " ", x + 58, y, FONT_SMALL_PLAIN, color);
    }

    if (has_size) {
        int width = -text_get_width(string_from_ascii("  "), FONT_SMALL_PLAIN);
        width += text_draw_number_colored(size_x, '@', "x", x - 15 + 1, y + 25 + 1, FONT_SMALL_PLAIN, COLOR_BLACK);
        text_draw_number_colored(size_x, '@', "x", x - 15, y + 25, FONT_SMALL_PLAIN, COLOR_FONT_YELLOW);
        text_draw_number_colored(size_y, '@', " ", x - 15 + width + 1, y + 25 + 1, FONT_SMALL_PLAIN, COLOR_BLACK);
        text_draw_number_colored(size_y, '@', " ", x - 15 + width, y + 25, FONT_SMALL_PLAIN, COLOR_FONT_YELLOW);
    }

    graphics_reset_clip_rectangle();
    return true;
}

void window_city::draw_foreground(UiFlags flags) {
    OZZY_PROFILER_FUNCTION();

    window_city_draw();
    widget_sidebar_city_draw_foreground();
    ui::dispatch_autoconfig_es_event(this, __func__, {});

    if (window_is_city_view()) {
        draw_paused_panel();
        window_city_draw_time_left_panel();
        draw_construction_buttons();
        g_figure_follow.draw_panel();
    }

    window_city_draw_construction_cost_and_size();
    if (g_window_manager.window_is("window_city")) {
        city_message_process_queue();
    }
}

static void cycle_legion(void) {
    static int current_legion_id = 1;
    if (g_window_manager.window_is("window_city")) {
        int legion_id = current_legion_id;
        current_legion_id = 0;
        for (int i = 1; i < MAX_FORMATIONS; i++) {
            legion_id++;
            if (legion_id > MAX_BATALIONS)
                legion_id = 1;

            const formation* m = formation_get(legion_id);
            if (m->in_use && !m->is_herd && m->own_batalion) {
                if (current_legion_id == 0) {
                    current_legion_id = legion_id;
                    break;
                }
            }
        }

        if (current_legion_id > 0) {
            const formation* m = formation_get(current_legion_id);
            g_camera.go_to_mappoint(m->home);
        }
    }
}

bool city_has_loaded = false;

void window_city_handle_hotkeys(const hotkeys* h) {
}

int window_city::handle_mouse(const mouse* m) {
    return 0;
}

void window_city::handle_input(const mouse* m, const hotkeys* h) {
    window_city_handle_hotkeys(h);

    if (h && h->escape_pressed && g_city_planner.build_type) {
        g_city_planner.construction_cancel();
        city_has_loaded = true;
        return;
    }

    if (g_figure_follow.handle_escape(h)) {
        city_has_loaded = true;
        return;
    }

    if (!g_city_planner.in_progress) {
        ui::dispatch_autoconfig_es_event(this, "handle_top_menu", {});
    }

    if (handle_construction_buttons(m)) {
        city_has_loaded = true;
        return;
    }

    if (g_figure_follow.handle_mouse(m)) {
        city_has_loaded = true;
        return;
    }

    g_screen_city.handle_input(m, h);
    city_has_loaded = true;
}

void window_city::draw_all() {
    draw_background(UiFlags_None);
    draw_foreground(UiFlags_None);
}

void window_city_draw_all() {
    g_window_city.draw_all();
}

void window_city_draw_panels() {
    g_window_city.draw_background(UiFlags_None);
}

bool window_is_city_view() {
    return g_window_manager.window_is("window_city")
        || g_window_manager.window_is("window_city_military")
        || g_window_manager.window_is("window_city_warship");
}

void window_city_draw() {
    OZZY_PROFILER_FUNCTION();
    g_figure_follow.capture_if_due();
    painter ctx = game.painter();
    g_screen_city.draw(ctx);

    g_warning_manager.draw_foreground(0);
}

void window_city::init_city() {
    widget_sidebar_city_init();

    events::subscribe([] (event_toggle_legion ev) {
        cycle_legion();
    });
}

window_city &window_city::instance() {
    return g_window_city;
}

void window_city::show() {
    static window_type window = {
        "window_city",
        [](int flags) { instance().draw_background(flags); },
        [](int flags) { instance().draw_foreground(flags); },
        [](const mouse *m, const hotkeys *h) { instance().handle_input(m, h); },
        [](tooltip_context *c) { g_screen_city.draw_tooltip(c); }
    };

    instance().init_city();
    window_show(&window);
    city_has_loaded = false;
}

void window_city_show() {
    window_city::show();
}
