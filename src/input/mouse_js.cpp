#include "mouse.h"

#include "input/touch.h"
#include "graphics/window.h"
#include "js/js_game.h"

void ank_global_obj_bind_field(js_State *J, js_StringNode name, mouse_button *ptr) {
    J->newobject();
    ank_global_obj_bind_field(J, js_intern("is_down"), &ptr->is_down);
    ank_global_obj_bind_field(J, js_intern("went_down"), &ptr->went_down);
    ank_global_obj_bind_field(J, js_intern("went_up"), &ptr->went_up);
    ank_global_obj_bind_field(J, js_intern("double_click"), &ptr->double_click);
    ank_global_obj_bind_field(J, js_intern("system_change"), &ptr->system_change);
    js_setproperty(J, -2, name);
}

ANK_GLOBAL_OBJECT(g_mouse, __mouse,
    x,
    y,
    scrolled,
    left,
    middle,
    right,
    is_inside_window,
    is_touch);

void __mouse_reset_up_state() { mouse::ref().reset_up_state(); }
ANK_FUNCTION(__mouse_reset_up_state)

// In the current window's pixels, like __mouse: touches are recorded in canvas pixels, and a window drawn at a
// larger UI scale (the inner screen's pop-ups) lays itself out in smaller units.
vec2i __touch_earliest_current() {
    const vec2i p = get_earliest_touch()->current_point;
    const float scale = window_ui_scale_current();
    return scale == 1.0f ? p : vec2i{(int)(p.x / scale), (int)(p.y / scale)};
}
ANK_FUNCTION(__touch_earliest_current)

int __touch_earliest_has_started() {
    return get_earliest_touch()->has_started;
}
ANK_FUNCTION(__touch_earliest_has_started)

int __touch_earliest_has_ended() {
    return get_earliest_touch()->has_ended;
}
ANK_FUNCTION(__touch_earliest_has_ended)

int __touch_earliest_was_click() {
    return touch_was_click(get_earliest_touch());
}
ANK_FUNCTION(__touch_earliest_was_click)
