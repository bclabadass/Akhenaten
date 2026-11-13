// On the iPhone Duo's inner screen the collapsed control panel is drawn at inner_screen.collapsed_sidebar_scale (2x),
// in both orientations: the city view narrows to match and taps land on the larger buttons. The 24-pixel strip at the
// screen's edge, the expanded panel and the folded screen keep the canvas scale.
// Markers:
//   [test-marker] desktop_collapsed_1x
//   [test-marker] landscape_collapsed_2x
//   [test-marker] collapsed_2x_tap_selects_road
//   [test-marker] expanded_unchanged
//   [test-marker] portrait_collapsed_2x
//   [test-marker] folded_collapsed_1x

function t310_layout() {
    var x = __ui_widget_sidebar_city_offset_x()
    return { x: x, width: screen.width - x, view: __test_viewport_width(), screen: screen.width }
}

var T310_EDGE_STRIP = 24

function t310_wide(desktop_width) {
    return 2 * (desktop_width - T310_EDGE_STRIP) + T310_EDGE_STRIP
}

function t310_tap_road(x, y) {
    __ui_city_planner_reset()
    __test_mouse_click(x, y)
    __test_pump_frames(4)
    var type = city_planner.build_type
    ui.window_city_show()
    __ui_city_planner_reset()
    __test_pump_frames(2)
    return type
}

function t310_near(a, b) {
    return Math.abs(a - b) <= 1
}

function run_test() {
    test_reload_city_session('data/default.map')
    var saved_scale = __display_options_get_scale()

    __camera_sidebar_collapsed(0)
    __test_pump_frames(3)
    var expanded_desktop = t310_layout()
    __camera_sidebar_collapsed(1)
    __test_pump_frames(3)
    var desktop = t310_layout()
    __log_info_native('[test:310] desktop ' + JSON.stringify(desktop) + ' expanded ' + JSON.stringify(expanded_desktop))
    if (desktop.width > 0 && desktop.view == desktop.screen - desktop.width && expanded_desktop.width > desktop.width) {
        __log_marker('desktop_collapsed_1x')
    }
    var desktop_pos = __test_window_pos('sidebar_window_collapsed')
    var desktop_road = t310_tap_road(desktop_pos.x + 21, desktop_pos.y + 99)

    __test_pretend_ios(true)
    __display_options_set_scale(67)
    __test_screen_resize(951, 669)
    __camera_sidebar_collapsed(1)
    __test_pump_frames(4)
    var land = t310_layout()
    __log_info_native('[test:310] landscape ' + JSON.stringify(land) + ' inner=' + __screen_inner_unfolded())
    if (__screen_inner_unfolded() && land.width == t310_wide(desktop.width) && land.view == land.screen - land.width) {
        __log_marker('landscape_collapsed_2x')
    }

    // The road button's middle is (21, 99) in the panel's own coordinates; taps are in canvas pixels.
    var pos = __test_window_pos('sidebar_window_collapsed')
    var road_1x = t310_tap_road(pos.x + 21, pos.y + 99)
    var road_2x = t310_tap_road(2 * (pos.x + 21), 2 * (pos.y + 99))
    __log_info_native('[test:310] panel pos ' + JSON.stringify(pos) + ' desktop road ' + desktop_road + ' 1x spot ' + road_1x + ' 2x spot ' + road_2x)
    if (desktop_road > 0 && road_2x == desktop_road && road_1x != desktop_road) {
        __log_marker('collapsed_2x_tap_selects_road')
    }

    __camera_sidebar_collapsed(0)
    __test_pump_frames(3)
    var expanded = t310_layout()
    __log_info_native('[test:310] expanded ' + JSON.stringify(expanded))
    if (expanded.width == expanded_desktop.width && expanded.view == expanded.screen - expanded.width) {
        __log_marker('expanded_unchanged')
    }

    __test_screen_resize(669, 951)
    __camera_sidebar_collapsed(1)
    __test_pump_frames(4)
    var port = t310_layout()
    __log_info_native('[test:310] portrait ' + JSON.stringify(port) + ' ' + screen.width + 'x' + screen.height)
    if (__screen_portrait() && t310_near(port.width, t310_wide(desktop.width)) && port.view == port.screen - t310_wide(desktop.width)) {
        __log_marker('portrait_collapsed_2x')
    }

    __display_options_set_scale(100)
    __test_screen_resize(678, 466)
    __camera_sidebar_collapsed(1)
    __test_pump_frames(4)
    var folded = t310_layout()
    __log_info_native('[test:310] folded ' + JSON.stringify(folded) + ' inner=' + __screen_inner_unfolded())
    if (!__screen_inner_unfolded() && folded.width == desktop.width && folded.view == folded.screen - folded.width) {
        __log_marker('folded_collapsed_1x')
    }

    __test_ios_screen_reset()
    __test_pretend_ios(false)
    __display_options_set_scale(saved_scale)
    __test_screen_resize(800, 600)
    __camera_sidebar_collapsed(0)
    __test_pump_frames(3)
    __test_signal_ready()
}

function check_valid() {
    var markers = ['desktop_collapsed_1x', 'landscape_collapsed_2x', 'collapsed_2x_tap_selects_road', 'expanded_unchanged',
        'portrait_collapsed_2x', 'folded_collapsed_1x']
    for (var i = 0; i < markers.length; i++) {
        if (!__test_find_inlog('[test-marker] ' + markers[i])) {
            return false
        }
    }
    return true
}
