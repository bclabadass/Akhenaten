// With zoom enabled, a pinch must zoom and leave the camera at the pinched zoom after the
// fingers lift. Both fingers land in the same millisecond, as iOS often delivers them; that
// used to make the earliest and latest touch the same finger, so the pinch never zoomed.
// Markers:
//   [test-marker] pinch_zoom_changed
//   [test-marker] pinch_zoom_holds

var X = 260
var Y = 280
var START_GAP = 60

function run_test() {
    var zoom_prev = game_features.get('gameui_zoom') === true
    game_features.set('gameui_zoom', true)
    test_reload_city_session('data/default.map')
    __zoom_set(100)
    __test_pump_frames(4)

    __test_touch_down(1, X, Y)
    __test_touch_down(2, X + START_GAP, Y)
    __test_pump_frames(2)
    for (var i = 1; i <= 8; i++) {
        __test_touch_move(1, X - 8 * i, Y)
        __test_touch_move(2, X + START_GAP + 8 * i, Y)
        __test_pump_frames(1)
    }
    var during = __zoom_percentage()
    __test_touch_up(1, X - 64, Y)
    __test_touch_up(2, X + START_GAP + 64, Y)
    __test_pump_frames(2)
    var just_after = __zoom_percentage()
    __test_pump_frames(30)
    var settled = __zoom_percentage()
    __log_info_native('[test:279] zoom during=' + during + ' just_after=' + just_after + ' settled=' + settled)

    if (during != 100) {
        __log_marker('pinch_zoom_changed')
    }
    if (just_after != 100 && Math.abs(settled - just_after) <= 1) {
        __log_marker('pinch_zoom_holds')
    }

    __zoom_set(100)
    game_features.set('gameui_zoom', zoom_prev)
    __test_signal_ready()
}

function check_valid() {
    return __test_find_inlog('[test-marker] pinch_zoom_changed')
        && __test_find_inlog('[test-marker] pinch_zoom_holds')
}
