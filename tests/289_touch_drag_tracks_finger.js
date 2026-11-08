// A one-finger drag must keep the ground under the finger at any display scale and pinch zoom.
// The camera moved by the raw finger distance whatever the zoom: twice too far zoomed in to 50%,
// half as far zoomed out to 200%.
// Markers:
//   [test-marker] drag_tracks_finger_scale_<pct>_zoom_<pct>

var T289_CASES = [[100, 100], [67, 100], [100, 150], [100, 200], [100, 50], [67, 150]]
var T289_DRAG = 120
var t289_anchor = 0

function t289_center(zoom) {
    __test_camera_center_building(t289_anchor)
    __test_pump_frames(2)
    __zoom_set(zoom)
    __test_pump_frames(3)
}

// Screen pixels the ground moved for a horizontal drag of T289_DRAG pixels, finger still down.
function t289_measure(zoom) {
    t289_center(zoom)
    var start_x = (screen.width / 2 + T289_DRAG / 2) | 0
    var y = (screen.height / 2) | 0
    __test_touch_down(1, start_x, y)
    __test_pump_frames(2)
    var before = __camera.camera_position.x
    for (var i = 1; i <= 6; i++) {
        __test_touch_move(1, start_x - (T289_DRAG * i / 6 | 0), y)
        __test_pump_frames(1)
    }
    __test_pump_frames(2)
    var world = __camera.camera_position.x - before
    __test_touch_up(1, start_x - T289_DRAG, y)
    __test_sleep_ms(1600)
    __test_pump_frames(3)
    return world * 100 / __zoom_percentage()
}

function run_test() {
    test_reload_city_session('data/default.map')
    __camera_rotate_north()
    t289_anchor = __test_building_create(BUILDING_WELL, (__scenario_map.width / 2) | 0, (__scenario_map.height / 2) | 0)
    var zoom_feature = game_features.get('gameui_zoom')
    game_features.set('gameui_zoom', true)
    __test_scroll_set_input(true)
    var saved_scale = __display_options_get_scale()
    var saved_zoom = __zoom_percentage()

    for (var i = 0; i < T289_CASES.length; i++) {
        var scale = T289_CASES[i][0]
        var zoom = T289_CASES[i][1]
        __display_options_set_scale(scale)
        __test_pump_frames(3)
        var moved = t289_measure(zoom)
        __log_info_native('[test:289] scale=' + scale + ' zoom=' + zoom + ' canvas=' + screen.width + ' ground moved '
            + (moved | 0) + ' for a drag of ' + T289_DRAG)
        if (Math.abs(moved - T289_DRAG) <= 6) {
            __log_marker('drag_tracks_finger_scale_' + scale + '_zoom_' + zoom)
        }
    }

    __zoom_set(saved_zoom)
    __test_scroll_set_input(false)
    game_features.set('gameui_zoom', zoom_feature)
    __display_options_set_scale(saved_scale)
    __test_pump_frames(3)
    __test_signal_ready()
}

function check_valid() {
    for (var i = 0; i < T289_CASES.length; i++) {
        if (!__test_find_inlog('[test-marker] drag_tracks_finger_scale_' + T289_CASES[i][0] + '_zoom_' + T289_CASES[i][1])) {
            return false
        }
    }
    return true
}
