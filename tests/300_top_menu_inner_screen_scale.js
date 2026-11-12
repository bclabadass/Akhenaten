// On the iPhone Duo's inner screen the top menu bar is 50 pixels tall instead of 30, with its text 1.5x
// and bold, and its dropdowns scaled to match. The city view and sidebar start below the taller bar.
// The folded screen and desktop keep the original 30-pixel bar.
// Markers:
//   [test-marker] inner_bar_50
//   [test-marker] inner_view_below_bar
//   [test-marker] inner_sidebar_moved
//   [test-marker] inner_status_scaled
//   [test-marker] inner_headers_scaled
//   [test-marker] inner_dropdown_scaled
//   [test-marker] narrow_follows_width_rule
//   [test-marker] desktop_bar_30

function t300_file_header_width() {
    top_menu_draw()
    var layout = top_menu_header_layout('file')
    return layout ? layout.x_end - layout.x_start : 0
}

function t300_dropdown_rows() {
    var menu = top_menu_find_menu('options')
    top_menu_calc_menu_size(menu)
    return top_menu_menu_size('options').height_blocks
}

function run_test() {
    test_reload_city_session('data/default.map')
    __camera_sidebar_collapsed(0)
    var saved_scale = __display_options_get_scale()
    __display_options_set_scale(100)
    __test_pretend_ios(false)
    __test_pump_frames(3)
    var desktop_header = t300_file_header_width()
    var desktop_rows = t300_dropdown_rows()
    var desktop_date_h = top_menu_status_rects().date.h
    if (__top_menu_height() == 30 && __test_viewport_y() == 30) {
        __log_marker('desktop_bar_30')
    }

    __display_options_set_scale(67)
    __test_pretend_ios(true)
    __test_pump_frames(3)
    var inner_header = t300_file_header_width()
    var inner_rows = t300_dropdown_rows()
    var sidebar = __test_window_pos('sidebar_window_expanded')
    __log_info_native('[test:300] canvas ' + screen.width + ' unfolded=' + __screen_inner_unfolded() + ' bar=' + __top_menu_height()
        + ' view_y=' + __test_viewport_y() + ' sidebar_y=' + sidebar.y + ' date_h ' + desktop_date_h + '->' + top_menu_status_rects().date.h
        + ' File ' + desktop_header + '->' + inner_header + ' options rows ' + desktop_rows + '->' + inner_rows)
    if (__screen_inner_unfolded() && __top_menu_height() == 50) {
        __log_marker('inner_bar_50')
    }
    if (__test_viewport_y() == 50) {
        __log_marker('inner_view_below_bar')
    }
    if (sidebar.y == 20) {
        __log_marker('inner_sidebar_moved')
    }
    if (top_menu_status_rects().date.h == Math.round(desktop_date_h * 50 / 30)) {
        __log_marker('inner_status_scaled')
    }
    if (inner_header >= Math.floor(desktop_header * 1.5) && inner_header <= Math.ceil(desktop_header * 1.5) + 2) {
        __log_marker('inner_headers_scaled')
    }
    if (inner_rows > desktop_rows) {
        __log_marker('inner_dropdown_scaled')
    }

    __display_options_set_scale(100)
    __test_pump_frames(3)
    var want = Math.min(screen.width, screen.height) >= top_menu_widget.unfolded_min_short_side ? 50 : 30
    __log_info_native('[test:300] scale 100 canvas ' + screen.width + ' bar=' + __top_menu_height() + ' want ' + want)
    if (__top_menu_height() == want && __test_viewport_y() == want) {
        __log_marker('narrow_follows_width_rule')
    }

    __test_pretend_ios(false)
    __display_options_set_scale(saved_scale)
    __test_pump_frames(3)
    __test_signal_ready()
}

function check_valid() {
    var markers = ['inner_bar_50', 'inner_view_below_bar', 'inner_sidebar_moved', 'inner_status_scaled', 'inner_headers_scaled',
        'inner_dropdown_scaled', 'narrow_follows_width_rule', 'desktop_bar_30']
    for (var i = 0; i < markers.length; i++) {
        if (!__test_find_inlog('[test-marker] ' + markers[i])) {
            return false
        }
    }
    return true
}
