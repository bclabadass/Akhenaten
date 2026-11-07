// Touch has no right button. In the city view a two-finger tap stands in for right-click and
// drops the build tool; a two-finger drag (pan or pinch) must keep it. Before this, touch
// players had no way out of build mode.
// Markers:
//   [test-marker] two_finger_tap_cancels_road
//   [test-marker] two_finger_tap_cancels_well
//   [test-marker] two_finger_drag_keeps_tool

var X = 300
var Y = 280
var GAP = 80

function two_finger_tap() {
    __test_touch_down(1, X, Y)
    __test_touch_down(2, X + GAP, Y)
    __test_pump_frames(2)
    __test_touch_up(1, X, Y)
    __test_touch_up(2, X + GAP, Y)
    __test_pump_frames(6)
}

function two_finger_drag() {
    __test_touch_down(1, X, Y)
    __test_touch_down(2, X + GAP, Y)
    __test_pump_frames(2)
    for (var i = 1; i <= 5; i++) {
        __test_touch_move(1, X - 10 * i, Y)
        __test_touch_move(2, X + GAP + 10 * i, Y)
        __test_pump_frames(1)
    }
    __test_touch_up(1, X - 50, Y)
    __test_touch_up(2, X + GAP + 50, Y)
    __test_pump_frames(6)
}

function check_tap_cancels(type, marker) {
    if (!test_planner_enter_build_mode(type)) {
        __log_info_native('[test:278] could not enter build mode ' + type)
        return
    }
    two_finger_tap()
    if (city_planner.build_type == BUILDING_NONE) {
        __log_marker(marker)
    } else {
        __log_info_native('[test:278] tool still ' + city_planner.build_type + ' after two-finger tap')
        test_planner_exit_build_mode()
    }
}

function run_test() {
    test_reload_city_session('data/default.map')

    check_tap_cancels(BUILDING_ROAD, 'two_finger_tap_cancels_road')
    check_tap_cancels(BUILDING_WELL, 'two_finger_tap_cancels_well')

    if (test_planner_enter_build_mode(BUILDING_WELL)) {
        two_finger_drag()
        if (city_planner.build_type == BUILDING_WELL) {
            __log_marker('two_finger_drag_keeps_tool')
        } else {
            __log_info_native('[test:278] two-finger drag dropped the tool')
        }
        test_planner_exit_build_mode()
    }

    __test_signal_ready()
}

function check_valid() {
    return __test_find_inlog('[test-marker] two_finger_tap_cancels_road')
        && __test_find_inlog('[test-marker] two_finger_tap_cancels_well')
        && __test_find_inlog('[test-marker] two_finger_drag_keeps_tool')
}
