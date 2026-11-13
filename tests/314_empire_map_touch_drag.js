// The world map scrolls with a finger on the Duo's inner screen. The empire window is drawn at 1.5x there, and it
// checked the touch point (canvas pixels) against its map area (window pixels), so a drag starting in the lower part
// of the screen counted as outside the map and the map stayed at the top. __touch_earliest_current now returns window
// pixels like __mouse, and a touch drag on the map moves it in window pixels. On the Mac, test touches go through the
// real window, so this checks that dragging scrolls the map at both scales; the 1.5x split was confirmed on the Duo.
// Markers:
//   [test-marker] empire_drag_from_low_on_screen_scrolls
//   [test-marker] empire_drag_desktop_scrolls

function t314_drag(x, y0, y1) {
    var before = __empire_map_get_scroll().y
    __test_touch_down(0, x, y0)
    __test_pump_frames(3)
    var steps = 8
    for (var i = 1; i <= steps; i++) {
        __test_touch_move(0, x, Math.round(y0 + (y1 - y0) * i / steps))
        __test_pump_frames(1)
    }
    __test_touch_up(0, x, y1)
    __test_pump_frames(6)
    return __empire_map_get_scroll().y - before
}

function run_test() {
    test_reload_city_session('data/default.map')
    var saved_scale = __display_options_get_scale()
    __test_scroll_set_input(true)

    __test_pretend_ios(true)
    __display_options_set_scale(67)
    __test_screen_resize(951, 669)
    __test_pump_frames(3)
    sidebar_window_expanded_on_show_empire({})
    __test_pump_frames(6)
    __empire_map_scroll_map({ x: 0, y: -2000 })
    __test_pump_frames(2)
    // Low on the screen: inside the map in window pixels, past its bottom edge in canvas pixels.
    var moved = t314_drag(300, 560, 300)
    __log_info_native('[test:314] inner landscape window ' + __game_window_get_id() + ' ui_scale ' + __test_window_ui_scale_for('empire_window')
        + ' scrolled ' + moved)
    if (moved > 0) {
        __log_marker('empire_drag_from_low_on_screen_scrolls')
    }

    ui.window_city_show()
    __test_pretend_ios(false)
    __display_options_set_scale(saved_scale)
    __test_screen_resize(800, 600)
    __test_pump_frames(3)
    sidebar_window_expanded_on_show_empire({})
    __test_pump_frames(6)
    __empire_map_scroll_map({ x: 0, y: -2000 })
    __test_pump_frames(2)
    var dc = empire_window.camera
    var desk = t314_drag(dc.clip.x + (dc.area.x / 2 | 0), dc.clip.y + (dc.area.y * 0.8 | 0), dc.clip.y + (dc.area.y * 0.2 | 0))
    __log_info_native('[test:314] desktop window ' + __game_window_get_id() + ' screen ' + screen.width + 'x' + screen.height
        + ' area ' + JSON.stringify(dc.area) + ' vp ' + JSON.stringify(dc.viewport) + ' scrolled ' + desk)
    if (desk > 0) {
        __log_marker('empire_drag_desktop_scrolls')
    }

    ui.window_city_show()
    __test_scroll_set_input(false)
    __test_ios_screen_reset()
    __test_pump_frames(3)
    __test_signal_ready()
}

function check_valid() {
    return __test_find_inlog('[test-marker] empire_drag_from_low_on_screen_scrolls') && __test_find_inlog('[test-marker] empire_drag_desktop_scrolls')
}
