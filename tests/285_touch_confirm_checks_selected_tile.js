// Touch places a non-draggable building in two taps: the first picks the tile, a second tap on
// or next to the ghost confirms, and the building goes on the first tile. The placement check
// ran wherever the confirming finger was, so confirming one row over could build across a road
// (a hunting lodge on the Duo). The check and the ghost must follow the picked tile.
// Markers:
//   [test-marker] setup_blocked_and_free
//   [test-marker] confirm_beside_blocked_tile_refused
//   [test-marker] confirm_beside_free_tile_builds
//   [test-marker] road_kept

function t285_drag(type, x0, y0, x1, y1) {
    test_planner_enter_build_mode(type)
    city_planner.update(x0, y0)
    city_planner.construction_start(x0, y0)
    city_planner.construction_update(x1, y1)
    city_planner.construction_finalize()
    test_planner_exit_build_mode()
}

// A screen point on the tile: scan the view and map each point back to a tile.
function t285_tile_center(x, y) {
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

function t285_tap(p) {
    __test_touch_down(1, p.x, p.y)
    __test_pump_frames(2)
    __test_touch_up(1, p.x, p.y)
    __test_pump_frames(6)
}

function t285_count(type) {
    var n = 0
    for (var i = 1; i < 2000; i++) {
        if (__building_type(i) == type) {
            n++
        }
    }
    return n
}

function run_test() {
    test_reload_city_session('data/default.map')
    __test_set_treasury(100000)
    __scenario_building_allow(BUILDING_ROAD, true)
    __scenario_building_allow(BUILDING_HUNTING_LODGE, true)

    var cx = (__scenario_map.width / 2) | 0
    var ry = (__scenario_map.height / 2) | 0
    t285_drag(BUILDING_ROAD, cx - 6, ry, cx + 6, ry)

    var anchor = __test_building_create(BUILDING_WELL, cx + 4, ry - 4)
    __test_camera_center_building(anchor)
    __test_pump_frames(5)

    // Find a picked tile A that blocks (lodge across the road) with a free tile B beside it.
    test_planner_enter_build_mode(BUILDING_HUNTING_LODGE)
    var a = null
    var b = null
    for (var dy = -2; dy <= 1 && !a; dy++) {
        var ta = { x: cx, y: ry + dy }
        city_planner.update(ta.x, ta.y)
        if (city_planner.can_be_placed() == CAN_PLACE) {
            continue
        }
        var near = [{ x: cx, y: ry + dy - 1 }, { x: cx - 1, y: ry + dy }, { x: cx, y: ry + dy + 1 }]
        for (var i = 0; i < near.length; i++) {
            city_planner.update(near[i].x, near[i].y)
            if (city_planner.can_be_placed() == CAN_PLACE) {
                a = ta
                b = near[i]
                break
            }
        }
    }
    if (!a) {
        __log_info_native('[test:285] no blocked/free tile pair beside the road')
        test_planner_exit_build_mode()
        __test_signal_ready()
        return
    }
    __log_marker('setup_blocked_and_free')

    var pa = t285_tile_center(a.x, a.y)
    var pb = t285_tile_center(b.x, b.y)
    if (!pa || !pb) {
        __log_info_native('[test:285] picked or confirm tile is off screen')
        test_planner_exit_build_mode()
        __test_signal_ready()
        return
    }
    __log_info_native('[test:285] picked ' + a.x + ',' + a.y + ' @' + pa.x + ',' + pa.y + ' confirm ' + b.x + ','
        + b.y + ' @' + pb.x + ',' + pb.y)

    var lodges = t285_count(BUILDING_HUNTING_LODGE)
    t285_tap(pa)
    t285_tap(pb)
    if (t285_count(BUILDING_HUNTING_LODGE) == lodges) {
        __log_marker('confirm_beside_blocked_tile_refused')
    } else {
        __log_info_native('[test:285] lodge was built on the blocked tile')
    }

    // The other way round: pick the free tile, confirm on the blocked one beside it.
    lodges = t285_count(BUILDING_HUNTING_LODGE)
    t285_tap(pb)
    t285_tap(pa)
    var built = __building_at(b.x, b.y)
    if (t285_count(BUILDING_HUNTING_LODGE) == lodges + 1 && built && __building_type(built) == BUILDING_HUNTING_LODGE) {
        __log_marker('confirm_beside_free_tile_builds')
    } else {
        __log_info_native('[test:285] no lodge on the picked free tile')
    }

    var road_ok = true
    for (var x = cx - 6; x <= cx + 6; x++) {
        var bid = __building_at(x, ry)
        if (!__map_terrain_is({ x: x, y: ry }, TERRAIN_ROAD) || (bid && __building_type(bid) != BUILDING_ROAD)) {
            road_ok = false
        }
    }
    if (road_ok) {
        __log_marker('road_kept')
    }

    test_planner_exit_build_mode()
    __test_signal_ready()
}

function check_valid() {
    return __test_find_inlog('[test-marker] setup_blocked_and_free')
        && __test_find_inlog('[test-marker] confirm_beside_blocked_tile_refused')
        && __test_find_inlog('[test-marker] confirm_beside_free_tile_builds')
        && __test_find_inlog('[test-marker] road_kept')
}
