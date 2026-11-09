// Window layouts compute positions from the screen size when scripts load. After the screen
// changed size (folding the iPhone Duo, or the display scale) they stayed at the old values:
// centred windows sat off-centre and corner buttons floated mid-screen. Positions must follow the
// screen, without resetting the window's script state.
// Markers:
//   [test-marker] window_recentred
//   [test-marker] corner_button_follows_screen
//   [test-marker] element_inside_window_unmoved
//   [test-marker] window_state_kept
//   [test-marker] layout_survives_config_reload
//   [test-marker] painted_panel_art_true_size

var T292_WINDOW = 'window_scenario_selection'

function t292_pos(section, id) {
    return __test_window_element_pos(section, id)
}

function run_test() {
    test_reload_city_session('data/default.map')
    var saved_scale = __display_options_get_scale()
    __display_options_set_scale(100)
    __test_pump_frames(3)

    window_scenario_selection.free_play = true
    var before = screen.width
    __display_options_set_scale(67)
    __test_pump_frames(3)
    __log_info_native('[test:292] canvas ' + before + ' -> ' + screen.width)

    var w = __test_window_pos(T292_WINDOW)
    var want_x = ((screen.width - 1024) / 2) | 0
    var want_y = ((screen.height - 768) / 2) | 0
    __log_info_native('[test:292] window at ' + w.x + ',' + w.y + ' want ' + want_x + ',' + want_y)
    if (screen.width != before && w.x == want_x && w.y == want_y) {
        __log_marker('window_recentred')
    }

    var d = t292_pos('window_main_menu', 'discord')
    __log_info_native('[test:292] discord at ' + d.x + ',' + d.y + ' canvas ' + screen.width + 'x' + screen.height)
    if (d.x == screen.width - 100 && d.y == screen.height - 50) {
        __log_marker('corner_button_follows_screen')
    }

    var m = t292_pos(T292_WINDOW, 'scenario_minimap')
    if (m.x == 270 && m.y == 200) {
        __log_marker('element_inside_window_unmoved')
    }

    if (window_scenario_selection.free_play === true) {
        __log_marker('window_state_kept')
    }

    // Both screens use the art with the panel painted in, so it must not be stretched.
    if (window_scenario_selection.ui.img_background.true_size === true
        && window_scenario_selection_campaign.ui.img_history.true_size === true) {
        __log_marker('painted_panel_art_true_size')
    }

    // The Editor and language changes reload window layouts from the stored script data.
    __test_window_configs_reload()
    __test_pump_frames(3)
    var w2 = __test_window_pos(T292_WINDOW)
    var d2 = t292_pos('window_main_menu', 'discord')
    __log_info_native('[test:292] after reload window ' + w2.x + ',' + w2.y + ' discord ' + d2.x + ',' + d2.y)
    if (w2.x == want_x && w2.y == want_y && d2.x == screen.width - 100 && d2.y == screen.height - 50) {
        __log_marker('layout_survives_config_reload')
    }

    window_scenario_selection.free_play = false
    __display_options_set_scale(saved_scale)
    __test_pump_frames(3)
    __test_signal_ready()
}

function check_valid() {
    return __test_find_inlog('[test-marker] window_recentred')
        && __test_find_inlog('[test-marker] corner_button_follows_screen')
        && __test_find_inlog('[test-marker] element_inside_window_unmoved')
        && __test_find_inlog('[test-marker] window_state_kept')
        && __test_find_inlog('[test-marker] layout_survives_config_reload')
        && __test_find_inlog('[test-marker] painted_panel_art_true_size')
}
