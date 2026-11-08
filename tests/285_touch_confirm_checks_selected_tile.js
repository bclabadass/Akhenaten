// Touch places a non-draggable building in two taps: the first picks the tile, a second tap on
// or next to the ghost confirms, and the building goes on the first tile. The placement check
// ran wherever the confirming finger was, so confirming one row over could build across a road
// (a hunting lodge on the Duo). The check and the ghost must follow the picked tile, and while
// the ghost is red a tap beside it moves it (a booth fits only one tile at a crossroads).
// Markers:
//   [test-marker] setup_blocked_and_free
//   [test-marker] confirm_beside_blocked_tile_refused
//   [test-marker] red_ghost_moved_then_built
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
    // Earlier tests may leave the camera rotated; tile picks below assume north.
    __camera_rotate_north()
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

    // Pick the blocked tile, then tap the free one beside it: a red ghost can't be confirmed,
    // so the tap moves it (the old check followed the finger and built across the road).
    var lodges = t285_count(BUILDING_HUNTING_LODGE)
    t285_tap(pa)
    t285_tap(pb)
    if (t285_count(BUILDING_HUNTING_LODGE) == lodges) {
        __log_marker('confirm_beside_blocked_tile_refused')
    } else {
        __log_info_native('[test:285] lodge was built on the blocked tile')
    }
    // The ghost now sits on the free tile; tapping it builds there.
    t285_tap(pb)
    var built = __building_at(b.x, b.y)
    if (t285_count(BUILDING_HUNTING_LODGE) == lodges + 1 && built && __building_type(built) == BUILDING_HUNTING_LODGE) {
        __log_marker('red_ghost_moved_then_built')
    } else {
        __log_info_native('[test:285] no lodge after moving the ghost to ' + b.x + ',' + b.y)
    }

    // The other way round, along the road: pick a free tile, confirm on the blocked one beside it.
    // Same blocked/free layout a few tiles along, clear of the first lodge and on screen.
    var a2 = null
    var b2 = null
    var pa2 = null
    var pb2 = null
    var shifts = [3, -3, 4, -4, 5, -5]
    for (var k = 0; k < shifts.length && !pa2; k++) {
        var ta2 = { x: a.x + shifts[k], y: a.y }
        var tb2 = { x: b.x + shifts[k], y: b.y }
        city_planner.update(ta2.x, ta2.y)
        var a2_blocked = city_planner.can_be_placed() != CAN_PLACE
        city_planner.update(tb2.x, tb2.y)
        if (!a2_blocked || city_planner.can_be_placed() != CAN_PLACE) {
            continue
        }
        var qa = t285_tile_center(ta2.x, ta2.y)
        var qb = t285_tile_center(tb2.x, tb2.y)
        if (qa && qb) {
            a2 = ta2
            b2 = tb2
            pa2 = qa
            pb2 = qb
        }
    }
    lodges = t285_count(BUILDING_HUNTING_LODGE)
    if (pa2 && pb2) {
        t285_tap(pb2)
        t285_tap(pa2)
    }
    var built2 = b2 ? __building_at(b2.x, b2.y) : 0
    if (t285_count(BUILDING_HUNTING_LODGE) == lodges + 1 && built2 && __building_type(built2) == BUILDING_HUNTING_LODGE) {
        __log_marker('confirm_beside_free_tile_builds')
    } else {
        __log_info_native('[test:285] no lodge on a picked free tile ' + (b2 ? b2.x + ',' + b2.y : '(none on screen)'))
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
        && __test_find_inlog('[test-marker] red_ghost_moved_then_built')
        && __test_find_inlog('[test-marker] confirm_beside_free_tile_builds')
        && __test_find_inlog('[test-marker] road_kept')
}
