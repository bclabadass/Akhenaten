#pragma once

#include "core/vec2i.h"

struct screen_t {
    int width;
    int height;
    vec2i dialog_offset;
    // The game canvas. width, height and dialog_offset shrink to the virtual screen while a scaled window is active.
    vec2i full;

    vec2i size() const { return {width, height}; }
    bool layout_stale = false;

    void set_resolution(int width, int height);
};

extern screen_t g_screen;

inline int screen_width() { return g_screen.width; }
inline int screen_height() { return g_screen.height; }

// The iPhone Duo's inner screen: an iOS screen at least top_menu_widget.unfolded_min_width wide.
bool screen_inner_unfolded();
int top_menu_height();
void screen_pretend_ios(bool on);
bool screen_is_ios();
// How much larger pop-up windows and the title screen are drawn: inner_screen.popup_scale on the inner screen, else 1.
float screen_popup_scale();
// A window scaled by s lays itself out on a screen s times smaller; 1 restores the canvas size.
void screen_set_virtual_scale(float s);

inline int screen_dialog_offset_x() { return g_screen.dialog_offset.x; }
inline int screen_dialog_offset_y() { return g_screen.dialog_offset.y; }
