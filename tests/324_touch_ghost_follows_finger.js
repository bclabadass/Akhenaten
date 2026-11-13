// On a touchscreen a non-draggable building is placed with a tap that picks its tile and a tap on the
// ghost that builds it. Once a tile was picked, the ghost stayed on it while a finger moved and only
// jumped to where the finger lifted. It must follow the finger while it moves, keeping where the
// finger took hold of it, and stay where the finger lets go.
// Markers:
//   [test-marker] ghost_follows_while_dragging
//   [test-marker] ghost_stays_where_dropped

// A screen point on the tile: scan the view and map each point back to a tile.
function t324_tile_center(x, y) {
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

function t324_end() {
    return { x: __city_planner.end.x, y: __city_planner.end.y }
}

function run_test() {
    test_reload_city_session('data/default.map')
    // Taps reach the game through the real window, so the canvas must match it: setting the display
    // scale lays the canvas out from the window again (an earlier __test_screen_resize may not match).
    var saved_scale = __display_options_get_scale()
    __log_info_native('[test:324] found scale ' + saved_scale + ' canvas ' + screen.width + 'x' + screen.height
        + ' zoom ' + __zoom_target())
    __display_options_set_scale(100)
    __zoom_set(100)
    __camera_rotate_north()
    __test_set_treasury(100000)
    var cx = (__scenario_map.width / 2) | 0
    var cy = (__scenario_map.height / 2) | 0
    var anchor = __test_building_create(BUILDING_WELL, cx + 4, cy - 4)
    __test_camera_center_building(anchor)
    __test_pump_frames(5)

    test_planner_enter_build_mode(BUILDING_BAZAAR)
    var picked = { x: cx - 2, y: cy }
    var grab = { x: cx - 1, y: cy }
    var target = { x: cx + 1, y: cy + 2 }
    var p_pick = t324_tile_center(picked.x, picked.y)
    var p_grab = t324_tile_center(grab.x, grab.y)
    var p_target = t324_tile_center(target.x, target.y)
    if (!p_pick || !p_grab || !p_target) {
        __log_info_native('[test:324] tiles off screen')
        test_planner_exit_build_mode()
        __display_options_set_scale(saved_scale)
        __test_signal_ready()
        return
    }

    __test_touch_down(1, p_pick.x, p_pick.y)
    __test_pump_frames(2)
    __test_touch_up(1, p_pick.x, p_pick.y)
    __test_pump_frames(6)
    var after_pick = t324_end()

    // Take hold of the ghost one tile in from its picked corner and move it 2 tiles across, 2 down.
    __test_touch_down(1, p_grab.x, p_grab.y)
    __test_pump_frames(2)
    var steps = 6
    for (var i = 1; i <= steps; i++) {
        var x = p_grab.x + ((p_target.x - p_grab.x) * i / steps) | 0
        var y = p_grab.y + ((p_target.y - p_grab.y) * i / steps) | 0
        __test_touch_move(1, x, y)
        __test_pump_frames(2)
    }
    __test_pump_frames(3)
    var while_dragging = t324_end()
    __test_touch_up(1, p_target.x, p_target.y)
    __test_pump_frames(6)
    var after_drop = t324_end()

    var want = { x: picked.x + (target.x - grab.x), y: picked.y + (target.y - grab.y) }
    __log_info_native('[test:324] picked ' + JSON.stringify(after_pick) + ' dragging ' + JSON.stringify(while_dragging)
        + ' dropped ' + JSON.stringify(after_drop) + ' want ' + JSON.stringify(want))
    if (after_pick.x == picked.x && after_pick.y == picked.y && while_dragging.x == want.x && while_dragging.y == want.y) {
        __log_marker('ghost_follows_while_dragging')
    }
    if (after_drop.x == want.x && after_drop.y == want.y) {
        __log_marker('ghost_stays_where_dropped')
    }
    test_planner_exit_build_mode()
    __display_options_set_scale(saved_scale)
    __test_pump_frames(2)
    __test_signal_ready()
}

function check_valid() {
    return __test_find_inlog('[test-marker] ghost_follows_while_dragging')
        && __test_find_inlog('[test-marker] ghost_stays_where_dropped')
}
