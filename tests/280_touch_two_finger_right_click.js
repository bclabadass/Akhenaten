// Touch has no right button. A two-finger tap (or holding one finger and tapping another)
// is right-click everywhere, not just in the city view, so windows that close on
// right-click can be closed by touch. One-finger taps and two-finger drags must not.
// Markers:
//   [test-marker] one_finger_tap_keeps_window
//   [test-marker] two_finger_drag_keeps_window
//   [test-marker] two_finger_tap_closes_window
//   [test-marker] staggered_tap_closes_window
//   [test-marker] hold_and_tap_closes_window

var X = 100
var Y = 100
var GAP = 60
var SUB_WINDOW = 'window_player_selection'

function open_sub_window() {
    window_show_by_id('window_main_menu')
    __test_pump_frames(3)
    window_show_by_id(SUB_WINDOW)
    __test_pump_frames(3)
    return ui.window_is(SUB_WINDOW)
}

function one_finger_tap() {
    __test_touch_down(1, X, Y)
    __test_pump_frames(2)
    __test_touch_up(1, X, Y)
    __test_pump_frames(6)
}

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
        __test_touch_move(1, X, Y + 10 * i)
        __test_touch_move(2, X + GAP, Y + 10 * i)
        __test_pump_frames(1)
    }
    __test_touch_up(1, X, Y + 50)
    __test_touch_up(2, X + GAP, Y + 50)
    __test_pump_frames(6)
}

// Fingers rarely lift in the same frame. With the first finger up first, the old mapping
// saw only the second finger left and turned the gesture into a left click.
function staggered_two_finger_tap() {
    __test_touch_down(1, X, Y)
    __test_touch_down(2, X + GAP, Y)
    __test_pump_frames(2)
    __test_touch_up(1, X, Y)
    __test_pump_frames(2)
    __test_touch_up(2, X + GAP, Y)
    __test_pump_frames(6)
}

// The second finger taps and lifts while the first stays down; the first lifts frames later.
function hold_and_tap() {
    __test_touch_down(1, X, Y)
    __test_pump_frames(3)
    __test_touch_down(2, X + GAP, Y)
    __test_pump_frames(1)
    __test_touch_up(2, X + GAP, Y)
    __test_pump_frames(3)
    __test_touch_up(1, X, Y)
    __test_pump_frames(6)
}

function check_closes(gesture, marker) {
    if (!open_sub_window()) {
        __log_info_native('[test:280] could not open ' + SUB_WINDOW)
        return
    }
    gesture()
    if (!ui.window_is(SUB_WINDOW)) {
        __log_marker(marker)
    } else {
        __log_info_native('[test:280] ' + SUB_WINDOW + ' still open after ' + marker)
    }
}

function check_keeps(gesture, marker) {
    if (!open_sub_window()) {
        __log_info_native('[test:280] could not open ' + SUB_WINDOW)
        return
    }
    gesture()
    if (ui.window_is(SUB_WINDOW)) {
        __log_marker(marker)
    } else {
        __log_info_native('[test:280] ' + SUB_WINDOW + ' closed, expected ' + marker)
    }
}

function run_test() {
    check_keeps(one_finger_tap, 'one_finger_tap_keeps_window')
    check_keeps(two_finger_drag, 'two_finger_drag_keeps_window')
    check_closes(two_finger_tap, 'two_finger_tap_closes_window')
    check_closes(staggered_two_finger_tap, 'staggered_tap_closes_window')
    check_closes(hold_and_tap, 'hold_and_tap_closes_window')
    __test_signal_ready()
}

function check_valid() {
    return __test_find_inlog('[test-marker] one_finger_tap_keeps_window')
        && __test_find_inlog('[test-marker] two_finger_drag_keeps_window')
        && __test_find_inlog('[test-marker] two_finger_tap_closes_window')
        && __test_find_inlog('[test-marker] staggered_tap_closes_window')
        && __test_find_inlog('[test-marker] hold_and_tap_closes_window')
}
