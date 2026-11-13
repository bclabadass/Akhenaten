// A scrolling text box's scroll bar moves with the box when its window is re-centred. The text's layout is measured
// once, and the scroll bar used to keep the position from then: after turning the Duo's inner screen it was drawn
// off the side of the mission briefing (portrait) or loose in the middle of a message pop-up (landscape).
// Markers:
//   [test-marker] briefing_bar_follows_portrait
//   [test-marker] briefing_bar_follows_landscape
//   [test-marker] briefing_bar_follows_desktop_resize

var T311_WINDOW = 'mission_briefing_window'

function t311_bar() {
    var p = ('' + __test_window_element_scrollbar(T311_WINDOW, 'description_text')).split(',')
    return { tx: +p[0], ty: +p[1], bx: +p[2], by: +p[3], h: +p[4], max: +p[5] }
}

function t311_attached(bar, first) {
    return bar.max > 0 && bar.bx - bar.tx == first.bx - first.tx && bar.by == bar.ty && bar.h == first.h
}

function run_test() {
    test_reload_city_session('data/default.map')
    var saved_scale = __display_options_get_scale()

    __test_pretend_ios(true)
    __display_options_set_scale(67)
    __test_screen_resize(951, 669)
    __test_pump_frames(3)
    mission_briefing_show(12, true)
    __test_pump_frames(4)
    var land = t311_bar()

    __test_screen_resize(669, 951)
    __test_pump_frames(4)
    var port = t311_bar()

    __test_screen_resize(951, 669)
    __test_pump_frames(4)
    var back = t311_bar()
    __log_info_native('[test:311] window ' + __game_window_get_id() + ' land ' + JSON.stringify(land) + ' port ' + JSON.stringify(port)
        + ' back ' + JSON.stringify(back))
    if (__game_window_get_id() == T311_WINDOW && land.max > 0 && port.tx != land.tx && t311_attached(port, land)) {
        __log_marker('briefing_bar_follows_portrait')
    }
    if (back.tx == land.tx && t311_attached(back, land)) {
        __log_marker('briefing_bar_follows_landscape')
    }

    __test_pretend_ios(false)
    __display_options_set_scale(100)
    __test_screen_resize(800, 600)
    __test_pump_frames(4)
    var small = t311_bar()
    __test_screen_resize(1024, 768)
    __test_pump_frames(4)
    var large = t311_bar()
    __log_info_native('[test:311] desktop 800x600 ' + JSON.stringify(small) + ' 1024x768 ' + JSON.stringify(large))
    if (large.tx != small.tx && t311_attached(large, small)) {
        __log_marker('briefing_bar_follows_desktop_resize')
    }

    ui.window_city_show()
    __test_ios_screen_reset()
    __display_options_set_scale(saved_scale)
    __test_screen_resize(800, 600)
    __test_pump_frames(3)
    __test_signal_ready()
}

function check_valid() {
    var markers = ['briefing_bar_follows_portrait', 'briefing_bar_follows_landscape', 'briefing_bar_follows_desktop_resize']
    for (var i = 0; i < markers.length; i++) {
        if (!__test_find_inlog('[test-marker] ' + markers[i])) {
            return false
        }
    }
    return true
}
