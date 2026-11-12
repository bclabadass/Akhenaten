// On the iPhone Duo's inner screen, pop-up windows and the title screen are drawn 1.5x larger
// (inner_screen.popup_scale) while the city, its top menu bar and sidebar keep the canvas scale.
// A scaled window lays out on a virtual screen 1.5x smaller and its taps are scaled to match, so
// taps land on what is drawn. The folded screen and desktop are unchanged.
// Markers:
//   [test-marker] desktop_unscaled
//   [test-marker] inner_scales_popups_not_city
//   [test-marker] menu_laid_out_on_virtual_screen
//   [test-marker] menu_tap_hits_scaled_button
//   [test-marker] advisor_laid_out_on_virtual_screen
//   [test-marker] advisor_back_tap_closes
//   [test-marker] info_window_on_screen
//   [test-marker] renderer_scale_reset_after_frame

var T302_SCALE = 1.5

function t302_tap(x, y) {
    x = x | 0
    y = y | 0
    __test_touch_down(1, x, y)
    __test_pump_frames(2)
    __test_touch_up(1, x, y)
    __test_pump_frames(6)
}

function t302_near(a, b) {
    return Math.abs(a - b) <= 1
}

function run_test() {
    var saved_scale = __display_options_get_scale()
    __display_options_set_scale(100)
    __test_pretend_ios(false)
    __test_pump_frames(4)
    window_show_by_id('window_main_menu')
    __test_pump_frames(4)
    var desk_quit = __test_window_element_pos('window_main_menu', 'quit_game')
    __log_info_native('[test:302] desktop canvas ' + screen.width + 'x' + screen.height + ' quit ' + desk_quit.x + ',' + desk_quit.y)
    if (__test_window_ui_scale_for('window_main_menu') == 1 && __test_window_ui_scale_for('advisor_labors_window') == 1
        && t302_near(desk_quit.y, Math.floor(screen.height / 2 - 100 + 40 * 7))) {
        __log_marker('desktop_unscaled')
    }

    __test_pretend_ios(true)
    __display_options_set_scale(67)
    __test_pump_frames(4)
    var vw = (screen.width / T302_SCALE) | 0
    var vh = (screen.height / T302_SCALE) | 0
    var unfolded = __screen_inner_unfolded()
    if (unfolded && __test_window_ui_scale_for('window_main_menu') == T302_SCALE
        && __test_window_ui_scale_for('advisor_labors_window') == T302_SCALE
        && __test_window_ui_scale_for('window_building_info') == T302_SCALE
        && __test_window_ui_scale_for('window_city') == 1 && __test_window_ui_scale_for('top_menu_submenu') == 1) {
        __log_marker('inner_scales_popups_not_city')
    }

    window_show_by_id('window_main_menu')
    __test_pump_frames(4)
    var quit = __test_window_element_pos('window_main_menu', 'quit_game')
    var free = __test_window_element_pos('window_main_menu', 'free_play')
    __log_info_native('[test:302] canvas ' + screen.width + 'x' + screen.height + ' virtual ' + vw + 'x' + vh
        + ' quit ' + quit.x + ',' + quit.y + ' free ' + free.x + ',' + free.y)
    if (t302_near(quit.y, Math.floor(vh / 2 - 100 + 40 * 7))) {
        __log_marker('menu_laid_out_on_virtual_screen')
    }
    t302_tap((free.x + 20) * T302_SCALE, (free.y + 12) * T302_SCALE)
    var after_menu_tap = __game_window_get_id()
    __log_info_native('[test:302] tap free play -> ' + after_menu_tap)
    if (after_menu_tap.indexOf('window_scenario_selection') == 0) {
        __log_marker('menu_tap_hits_scaled_button')
    }

    test_reload_city_session('data/default.map')
    __camera_sidebar_collapsed(0)
    __test_pump_frames(4)
    city.set_advisor_available(ADVISOR_LABOR, 1)
    game.last_advisor = ADVISOR_LABOR
    window_advisors_show()
    __test_pump_frames(4)
    var adv = __test_window_pos('advisor_labors_window')
    var back = __test_window_element_pos('advisor_labors_window', 'back_btn')
    __log_info_native('[test:302] advisor ' + __game_window_get_id() + ' pos ' + adv.x + ',' + adv.y + ' back ' + back.x + ',' + back.y)
    if (t302_near(adv.x + back.x, Math.floor((vw - 640) / 2 + 588)) && t302_near(adv.y + back.y, Math.floor(vh / 2 + 418 / 2))) {
        __log_marker('advisor_laid_out_on_virtual_screen')
    }
    t302_tap((adv.x + back.x + 20) * T302_SCALE, (adv.y + back.y + 16) * T302_SCALE)
    __log_info_native('[test:302] tap back -> ' + __game_window_get_id())
    if (__game_window_get_id() == 'window_city') {
        __log_marker('advisor_back_tap_closes')
    }

    var view = __camera.size_pixels
    var tap_x = view.x - 60
    var tap_y = screen.height - 60
    __test_mouse_right_click(tap_x, tap_y)
    __test_pump_frames(4)
    var off = __test_info_offset()
    var bg = __test_info_bgsize()
    var right = (off.x + bg.x * 16) * T302_SCALE
    var bottom = (off.y + bg.y * 16) * T302_SCALE
    __log_info_native('[test:302] info ' + __game_window_get_id() + ' offset ' + off.x + ',' + off.y + ' blocks ' + bg.x + 'x' + bg.y
        + ' drawn to ' + right + ',' + bottom + ' view ' + view.x + 'x' + screen.height)
    if (__game_window_get_id() == 'window_building_info' && off.x >= 0 && off.y >= 0 && right <= view.x && bottom <= screen.height) {
        __log_marker('info_window_on_screen')
    }
    if (__test_render_ui_scale() == 1) {
        __log_marker('renderer_scale_reset_after_frame')
    }

    __test_pretend_ios(false)
    __display_options_set_scale(saved_scale)
    __test_pump_frames(3)
    __test_signal_ready()
}

function check_valid() {
    var markers = ['desktop_unscaled', 'inner_scales_popups_not_city', 'menu_laid_out_on_virtual_screen', 'menu_tap_hits_scaled_button',
        'advisor_laid_out_on_virtual_screen', 'advisor_back_tap_closes', 'info_window_on_screen', 'renderer_scale_reset_after_frame']
    for (var i = 0; i < markers.length; i++) {
        if (!__test_find_inlog('[test-marker] ' + markers[i])) {
            return false
        }
    }
    return true
}
