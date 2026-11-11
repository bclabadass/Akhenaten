// Tapping Orders on a granary must open a working Orders window. On the iPhone Duo the window
// came up without its granary: its button text failed every frame, and each failure left a
// value on the MuJS stack until it overflowed and took the top menu, sidebar, build menu and
// game tick timer down with it. A failing script callback must report its real message and
// leave the stack as it found it.
// Markers:
//   [test-marker] orders_window_has_granary
//   [test-marker] failing_textfn_keeps_stack
//   [test-marker] failing_textfn_reports_message
//   [test-marker] game_tick_handler_survives

var T295_FRAMES = 30

function run_test() {
    test_reload_city_session('data/default.map')
    var bid = __test_building_create(BUILDING_GRANARY, -1, -1)

    __test_show_tile_info(bid)
    __test_pump_frames(4)
    var orders = __test_info_ui_screen_pos('orders')
    var x = orders.x + 135
    var y = orders.y + 12
    granary_orders_window.granary = null
    __test_touch_down(1, x, y)
    __test_pump_frames(2)
    __test_touch_up(1, x, y)
    __test_pump_frames(4)
    if (granary_orders_window.granary && granary_orders_window.granary.id == bid) {
        __log_marker('orders_window_has_granary')
    }

    // The state the Duo was in: the button's textfn throws on every draw.
    granary_orders_window.granary = null
    var growth = __test_window_textfn_stack_growth('granary_orders_window', 'empty_all', T295_FRAMES)
    __log_info_native('[test:295] stack grew by ' + growth + ' over ' + T295_FRAMES + ' failing textfn calls')
    if (growth == 0) {
        __log_marker('failing_textfn_keeps_stack')
    }
    if (__test_find_inlog('JS textfn callback error: cannot convert null to object')
        && !__test_find_inlog('JS textfn callback error: undefined')) {
        __log_marker('failing_textfn_reports_message')
    }

    window_go_back()
    __test_pump_frames(2)
    window_go_back()
    __test_pump_frames(2)

    if (!__test_find_inlog('handler event_update_game_tick_timer_handler disabled')) {
        __log_marker('game_tick_handler_survives')
    }
    __test_signal_ready()
}

function check_valid() {
    var markers = ['orders_window_has_granary', 'failing_textfn_keeps_stack', 'failing_textfn_reports_message',
        'game_tick_handler_survives']
    for (var i = 0; i < markers.length; i++) {
        if (!__test_find_inlog('[test-marker] ' + markers[i])) {
            return false
        }
    }
    return true
}
