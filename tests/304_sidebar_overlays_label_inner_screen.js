// On the iPhone Duo's inner screen the sidebar's Overlays label is drawn at the top menu bar's text
// size (1.5x, not bold), 20 pixels from the sidebar's edge and 5 pixels higher than the link's own
// text, over the sidebar (ui_draw_after). The link keeps the tap area, widened to cover the larger text.
// Desktop and the folded screen keep the link's own text. The drawn label itself was checked by
// screenshot; the tests run without the game's images.
// Markers:
//   [test-marker] desktop_link_keeps_text
//   [test-marker] inner_link_text_drawn_separately
//   [test-marker] inner_link_covers_label

function t304_link() {
    return {
        text: __test_window_element_text('sidebar_window_expanded', 'show_overlays'),
        pos: __test_window_element_pos('sidebar_window_expanded', 'show_overlays'),
        size: __test_window_element_size('sidebar_window_expanded', 'show_overlays')
    }
}

function run_test() {
    test_reload_city_session('data/default.map')
    __camera_sidebar_collapsed(0)
    var saved_scale = __display_options_get_scale()
    __display_options_set_scale(100)
    __test_pretend_ios(false)
    __test_pump_frames(4)
    var desktop = t304_link()
    var label = ui.sidebar_overlay_link_text()
    __log_info_native('[test:304] desktop text "' + desktop.text + '" label "' + label + '" size ' + desktop.size.x)
    if (desktop.text == label) {
        __log_marker('desktop_link_keeps_text')
    }

    __display_options_set_scale(67)
    __test_pretend_ios(true)
    __test_pump_frames(4)
    var inner = t304_link()
    var want = sidebar_window_expanded.overlays_text_x - inner.pos.x + Math.ceil(__ui_text_width(label, FONT_NORMAL_BLACK_ON_LIGHT) * top_menu_text_scale())
    __log_info_native('[test:304] inner unfolded=' + __screen_inner_unfolded() + ' text "' + inner.text + '" size ' + inner.size.x + ' want >= ' + want
        + ' text_x ' + sidebar_window_expanded.overlays_text_x)
    if (__screen_inner_unfolded() && inner.text == '' && sidebar_window_expanded.overlays_text_x == 20 && sidebar_window_expanded.overlays_text_dy == -3) {
        __log_marker('inner_link_text_drawn_separately')
    }
    if (inner.size.x >= want) {
        __log_marker('inner_link_covers_label')
    }

    __test_pretend_ios(false)
    __display_options_set_scale(saved_scale)
    __test_pump_frames(3)
    __test_signal_ready()
}

function check_valid() {
    var markers = ['desktop_link_keeps_text', 'inner_link_text_drawn_separately', 'inner_link_covers_label']
    for (var i = 0; i < markers.length; i++) {
        if (!__test_find_inlog('[test-marker] ' + markers[i])) {
            return false
        }
    }
    return true
}
