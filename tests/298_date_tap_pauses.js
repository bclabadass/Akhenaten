// On a phone the Pause key is out of reach, so a tap on the date in the top menu pauses the game and
// a second tap resumes it. Desktop keeps the original behaviour: a left click on the date does nothing.
// Markers:
//   [test-marker] date_tap_pauses
//   [test-marker] date_tap_resumes
//   [test-marker] desktop_date_click_ignored

function t298_tap() {
    var r = top_menu_status_rects().date
    var x = (r.x + r.w / 2) | 0
    var y = (r.y + r.h / 2) | 0
    __test_touch_down(1, x, y)
    __test_pump_frames(2)
    __test_touch_up(1, x, y)
    __test_pump_frames(3)
}

function run_test() {
    test_reload_city_session('data/default.map')
    __camera_sidebar_collapsed(0)
    __test_pump_frames(3)
    game.paused = false

    var platform_check = top_menu_date_tap_pauses
    top_menu_date_tap_pauses = function() { return true }
    t298_tap()
    if (game.paused) {
        __log_marker('date_tap_pauses')
    }
    t298_tap()
    if (!game.paused) {
        __log_marker('date_tap_resumes')
    }

    top_menu_date_tap_pauses = platform_check
    t298_tap()
    __log_info_native('[test:298] desktop tap paused=' + game.paused)
    if (!game.paused) {
        __log_marker('desktop_date_click_ignored')
    }

    game.paused = false
    __test_signal_ready()
}

function check_valid() {
    var markers = ['date_tap_pauses', 'date_tap_resumes', 'desktop_date_click_ignored']
    for (var i = 0; i < markers.length; i++) {
        if (!__test_find_inlog('[test-marker] ' + markers[i])) {
            return false
        }
    }
    return true
}
