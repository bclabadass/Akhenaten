#pragma once

#include "graphics/elements/tooltip.h"
#include "input/hotkey.h"
#include "input/mouse.h"
#include "core/xfunction.h"

#include <array>

struct window_type {
    xstring id;
    xfunction <void(int)> draw_background;
    xfunction <void(int)> draw_foreground;
    xfunction <void(const mouse*, const hotkeys*)> handle_input;
    xfunction <void(tooltip_context*)> draw_tooltip;
    xfunction <void()> draw_refresh;
};

struct windows_manager_t {
    std::array<window_type, 6> window_queue;
    int queue_index;
    window_type *current_window;
    int underlying_windows_redrawing;

    void update_input_after();
    void handle_input(const mouse *m, const hotkeys *h);
    void handle_tooltip(const mouse *m);
    bool window_is(xstring id);

    static xstring window_city;
    static xstring window_main_menu;
};

extern windows_manager_t g_window_manager;

void window_draw(int force);

void window_draw_underlying_window(int);

void window_show(const window_type* window);

xstring window_get_id(void);

void window_go_back(void);

// Pop-up windows and the title screen are drawn larger on the iPhone Duo's inner screen
// (screen_popup_scale). While a scaled window lays out, draws or takes input, the screen size and
// the mouse are in its smaller virtual coordinates and the renderer scales its drawing up.
float window_ui_scale_for(xstring id);
float window_ui_scale_current();
void window_ui_scale_apply(float scale, bool record_for_flush);

// Runs a block at a window's scale: its open handler, or the city and its HUD drawn from inside a pop-up (scale 1).
struct window_ui_scale_scope {
    float scale_before;
    explicit window_ui_scale_scope(float scale) : scale_before(window_ui_scale_current()) {
        window_ui_scale_apply(scale, true);
    }
    ~window_ui_scale_scope() { window_ui_scale_apply(scale_before, true); }
};

struct window_ui_canvas_scope : window_ui_scale_scope {
    window_ui_canvas_scope() : window_ui_scale_scope(1.0f) {}
};
