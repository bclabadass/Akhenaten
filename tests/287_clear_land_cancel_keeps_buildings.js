// Cancelling a clear-land selection must leave its buildings standing. Measuring the drag marks
// them DELETED_BY_PLAYER as a preview; cancel never restored them and the daily state update
// demolished them anyway, also while the selection was still open. On touch the selection stays
// open between taps, so a two-finger tap to drop the tool destroyed whatever it covered.
// Markers:
//   [test-marker] cancel_keeps_buildings
//   [test-marker] open_selection_survives_days
//   [test-marker] confirm_still_demolishes
//   [test-marker] touch_cancel_keeps_buildings

function t287_wells_row(cx, y) {
    for (var x = cx - 3; x <= cx + 3; x++) {
        __test_building_create(BUILDING_WELL, x, y)
    }
}

function t287_count_wells(cx, y) {
    var n = 0
    for (var x = cx - 3; x <= cx + 3; x++) {
        var b = __building_at(x, y)
        if (b && __building_type(b) == BUILDING_WELL) {
            n++
        }
    }
    return n
}

function t287_open_selection(cx, y) {
    test_planner_enter_build_mode(BUILDING_CLEAR_LAND)
    city_planner.update(cx - 2, y)
    city_planner.construction_start(cx - 2, y)
    city_planner.update(cx + 2, y)
    city_planner.construction_update(cx + 2, y)
}

function t287_let_days_pass() {
    for (var k = 0; k < 4; k++) {
        __test_pump_frames(240)
    }
}

// A screen point on the tile: scan the view and map each point back to a tile.
function t287_tile_center(x, y) {
    var sum_x = 0
    var sum_y = 0
    var n = 0
    for (var py = 40; py < screen.height - 40; py += 3) {
        for (var px = 10; px < screen.width - 200; px += 6) {
            var st = __pixel_to_screentile({ x: px, y: py })
            if (st.x == -1 || st.y == -1) {
                continue
            }
            var t = __screen_to_tile(st)
            if (t.x == x && t.y == y) {
                sum_x += px
                sum_y += py
                n++
            }
        }
    }
    return n ? { x: (sum_x / n) | 0, y: (sum_y / n) | 0 } : null
}

function run_test() {
    test_reload_city_session('data/default.map')
    __camera_rotate_north()
    __test_set_treasury(100000)
    __scenario_building_allow(BUILDING_CLEAR_LAND, true)

    var cx = (__scenario_map.width / 2) | 0
    var cy = (__scenario_map.height / 2) | 0

    t287_wells_row(cx, cy)
    t287_open_selection(cx, cy)
    city_planner.construction_cancel()
    test_planner_exit_build_mode()
    t287_let_days_pass()
    if (t287_count_wells(cx, cy) == 7) {
        __log_marker('cancel_keeps_buildings')
    }

    var y2 = cy + 4
    t287_wells_row(cx, y2)
    t287_open_selection(cx, y2)
    t287_let_days_pass()
    city_planner.construction_cancel()
    test_planner_exit_build_mode()
    t287_let_days_pass()
    if (t287_count_wells(cx, y2) == 7) {
        __log_marker('open_selection_survives_days')
    }

    var y3 = cy + 8
    t287_wells_row(cx, y3)
    t287_open_selection(cx, y3)
    city_planner.construction_finalize()
    test_planner_exit_build_mode()
    t287_let_days_pass()
    if (t287_count_wells(cx, y3) == 2) {
        __log_marker('confirm_still_demolishes')
    }

    // Touch: a tap opens the selection, then a two-finger tap drops the tool.
    var y4 = cy - 4
    t287_wells_row(cx, y4)
    var anchor = __test_building_create(BUILDING_WELL, cx, y4 - 3)
    __test_camera_center_building(anchor)
    __test_pump_frames(5)
    var p = t287_tile_center(cx - 1, y4)
    var q = t287_tile_center(cx + 2, y4)
    if (p && q) {
        test_planner_enter_build_mode(BUILDING_CLEAR_LAND)
        __test_pump_frames(3)
        __test_touch_down(1, p.x, p.y)
        __test_pump_frames(2)
        __test_touch_up(1, p.x, p.y)
        __test_pump_frames(8)
        __test_touch_down(1, p.x, p.y)
        __test_touch_down(2, q.x, q.y)
        __test_pump_frames(2)
        __test_touch_up(1, p.x, p.y)
        __test_pump_frames(2)
        __test_touch_up(2, q.x, q.y)
        __test_pump_frames(8)
        test_planner_exit_build_mode()
        t287_let_days_pass()
        if (t287_count_wells(cx, y4) == 7) {
            __log_marker('touch_cancel_keeps_buildings')
        } else {
            __log_info_native('[test:287] touch: wells ' + t287_count_wells(cx, y4) + ' of 7 left')
        }
    } else {
        __log_info_native('[test:287] touch row is off screen')
    }

    __test_signal_ready()
}

function check_valid() {
    return __test_find_inlog('[test-marker] cancel_keeps_buildings')
        && __test_find_inlog('[test-marker] open_selection_survives_days')
        && __test_find_inlog('[test-marker] confirm_still_demolishes')
        && __test_find_inlog('[test-marker] touch_cancel_keeps_buildings')
}
