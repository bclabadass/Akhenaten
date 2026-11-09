// Touch has no R key. While placing a building that can rotate, an on-screen button does what R
// does. Two-finger tap already cancels, so the cancel button is hidden unless turned on in Options.
// Markers:
//   [test-marker] cancel_setting_listed
//   [test-marker] rotate_takes_top_slot_without_cancel
//   [test-marker] ghost_stays_on_picked_tile
//   [test-marker] no_buttons_for_fixed_buildings
//   [test-marker] rotate_below_cancel_when_enabled
//   [test-marker] cancel_button_works_when_enabled

var t294_rotations = 0

function t294_tap(x, y) {
    __test_touch_down(1, x, y)
    __test_pump_frames(2)
    __test_touch_up(1, x, y)
    __test_pump_frames(8)
    __test_process_events()
}

function t294_tap_top_slot() {
    t294_tap(__camera.size_pixels.x - 44, 56)
}

function t294_tap_second_slot() {
    t294_tap(__camera.size_pixels.x - 44, 92)
}

function t294_setting_listed() {
    window_features_build_pages()
    for (var p = 0; p < window_features.pages.length; p++) {
        var features = window_features.pages[p].features
        for (var f = 0; f < features.length; f++) {
            if (features[f].key == 'gameui_touch_cancel_button') {
                return true
            }
        }
    }
    return false
}

function run_test() {
    test_reload_city_session('data/default.map')
    var original_rotate = city_planner.rotate_by_hotkey
    var manual_prev = game_features.get('gameui_rotate_manually')
    var cancel_prev = game_features.get('gameui_touch_cancel_button')
    city_planner.rotate_by_hotkey = function () { t294_rotations++ }

    if (t294_setting_listed()) {
        __log_marker('cancel_setting_listed')
    }

    // Cancel hidden (the default): R takes the top slot.
    game_features.set('gameui_touch_cancel_button', false)
    game_features.set('gameui_rotate_manually', true)
    test_planner_enter_build_mode(BUILDING_WELL)
    __test_pump_frames(3)
    t294_tap(300, 300)
    __test_pump_frames(3)
    var picked_x = __city_planner.end.x
    var picked_y = __city_planner.end.y

    t294_tap_top_slot()
    __test_pump_frames(3)
    __log_info_native('[test:294] top slot rotations=' + t294_rotations + ' tool=' + __city_planner.build_type
        + ' ghost ' + __city_planner.end.x + ',' + __city_planner.end.y + ' picked ' + picked_x + ',' + picked_y)
    if (t294_rotations == 1 && __city_planner.build_type == BUILDING_WELL) {
        __log_marker('rotate_takes_top_slot_without_cancel')
    }
    if (__city_planner.end.x == picked_x && __city_planner.end.y == picked_y) {
        __log_marker('ghost_stays_on_picked_tile')
    }

    // Nothing to show: a fixed building with cancel hidden leaves that corner to the map.
    game_features.set('gameui_rotate_manually', false)
    __test_pump_frames(3)
    t294_tap_top_slot()
    __log_info_native('[test:294] fixed building rotations=' + t294_rotations + ' tool=' + __city_planner.build_type)
    if (t294_rotations == 1 && __city_planner.build_type == BUILDING_WELL) {
        __log_marker('no_buttons_for_fixed_buildings')
    }

    // Cancel turned back on: R moves below it, and each keeps its own area.
    game_features.set('gameui_rotate_manually', true)
    game_features.set('gameui_touch_cancel_button', true)
    __test_pump_frames(3)
    t294_tap_second_slot()
    t294_tap(__camera.size_pixels.x - 44, 78)
    __log_info_native('[test:294] below cancel rotations=' + t294_rotations + ' tool=' + __city_planner.build_type)
    if (t294_rotations == 3 && __city_planner.build_type == BUILDING_WELL) {
        __log_marker('rotate_below_cancel_when_enabled')
    }
    t294_tap_top_slot()
    __log_info_native('[test:294] cancel tap tool=' + __city_planner.build_type)
    if (__city_planner.build_type == 0) {
        __log_marker('cancel_button_works_when_enabled')
    }

    test_planner_exit_build_mode()
    game_features.set('gameui_rotate_manually', manual_prev)
    game_features.set('gameui_touch_cancel_button', cancel_prev)
    city_planner.rotate_by_hotkey = original_rotate
    __test_signal_ready()
}

function check_valid() {
    return __test_find_inlog('[test-marker] cancel_setting_listed')
        && __test_find_inlog('[test-marker] rotate_takes_top_slot_without_cancel')
        && __test_find_inlog('[test-marker] ghost_stays_on_picked_tile')
        && __test_find_inlog('[test-marker] no_buttons_for_fixed_buildings')
        && __test_find_inlog('[test-marker] rotate_below_cancel_when_enabled')
        && __test_find_inlog('[test-marker] cancel_button_works_when_enabled')
}
