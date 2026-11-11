#pragma once

#include "core/vec2i.h"

struct screen_t {
    int width;
    int height;
    vec2i dialog_offset;

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

inline int screen_dialog_offset_x() { return g_screen.dialog_offset.x; }
inline int screen_dialog_offset_y() { return g_screen.dialog_offset.y; }
