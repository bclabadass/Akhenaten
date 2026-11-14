// Which sound each event asks for, as confirmed by ear on the Duo (Sound check, 2026-11-13): placing a
// building plays BUILD and nothing else; clearing land or demolishing plays DIG (it played BUILD); a
// building catching fire plays FIRE (it played the collapse CRASH); a collapse or enemy damage still plays
// CRASH; a digit typed in the number pad plays the button click (it played BUILD).
// Markers:
//   [test-marker] place_plays_build
//   [test-marker] clear_plays_dig
//   [test-marker] fire_plays_fire
//   [test-marker] collapse_and_wreck_play_crash
//   [test-marker] digit_plays_click

// A screen point on the tile: scan the view and map each point back to a tile.
function t328_tile_center(x, y) {
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

// Taps reach the city through the canvas, which earlier tests may leave out of step with the window
// (a mouse click can then land a tile or two off).
var T328_PLACED = BUILDING_SMALL_STATUE

function t328_tap(p) {
    __test_touch_down(1, p.x, p.y)
    __test_pump_frames(2)
    __test_touch_up(1, p.x, p.y)
    __test_pump_frames(6)
}

function t328_effects() {
    var s = __test_sound_effects_requested()
    return s ? s.split(',').map(function (v) { return parseInt(v) }) : []
}

// The statue placed on or next to the tile.
function t328_find_placed(x, y) {
    for (var r = 0; r <= 3; r++) {
        for (var dy = -r; dy <= r; dy++) {
            for (var dx = -r; dx <= r; dx++) {
                var b = __building_at(x + dx, y + dy)
                if (b && __building_type(b) == T328_PLACED) {
                    return { id: b, x: x + dx, y: y + dy }
                }
            }
        }
    }
    return null
}

function t328_has(list, effect) {
    return list.indexOf(effect) >= 0
}

function t328_destroyed_with(type, how) {
    var bid = __test_building_create(type, -1, -1)
    t328_effects()
    __test_building_destroy(bid, how)
    return t328_effects()
}

function run_test() {
    test_reload_city_session('data/default.map')
    var saved_scale = __display_options_get_scale()
    __display_options_set_scale(100)
    __zoom_set(100)
    __camera_rotate_north()
    __test_set_treasury(100000)
    var cx = (__scenario_map.width / 2) | 0
    var cy = (__scenario_map.height / 2) | 0
    var anchor = __test_building_create(BUILDING_WELL, cx + 4, cy - 4)
    __test_camera_center_building(anchor)
    __test_pump_frames(5)

    // A free tile near the middle.
    test_planner_enter_build_mode(T328_PLACED)
    var target = null
    for (var r = 1; r <= 5 && !target; r++) {
        for (var dx = -r; dx <= r && !target; dx++) {
            city_planner.update(cx - 2 + dx, cy + r - 3)
            if (city_planner.can_be_placed() == CAN_PLACE) {
                target = { x: cx - 2 + dx, y: cy + r - 3 }
            }
        }
    }
    test_planner_exit_build_mode()
    var spot = target ? t328_tile_center(target.x, target.y) : null
    if (!spot) {
        __log_info_native('[test:328] no free tile on screen')
        __display_options_set_scale(saved_scale)
        __test_signal_ready()
        return
    }

    test_planner_enter_build_mode(T328_PLACED)
    __test_pump_frames(2)
    t328_effects()
    // A tap picks the tile, a second tap on the ghost builds.
    t328_tap(spot)
    t328_tap(spot)
    var place = t328_effects()
    var statue = t328_find_placed(target.x, target.y)
    test_planner_exit_build_mode()

    test_planner_enter_build_mode(BUILDING_CLEAR_LAND)
    __test_pump_frames(2)
    t328_effects()
    var statue_spot = statue ? t328_tile_center(statue.x, statue.y) : spot
    // A click runs the whole clear-land stroke. After some earlier tests it can land a tile off the
    // statue; clearing empty land plays the same sound, so the statue going is logged, not required.
    __test_mouse_click(statue_spot.x, statue_spot.y)
    __test_pump_frames(4)
    var clear = t328_effects()
    var after_clear = statue != null && __building_at(statue.x, statue.y) != statue.id
    test_planner_exit_build_mode()

    __log_info_native('[test:328] place ' + JSON.stringify(place) + ' (statue ' + (statue ? statue.x + ',' + statue.y : 'none')
        + ' for ' + target.x + ',' + target.y + '), clear ' + JSON.stringify(clear) + ' (cleared ' + after_clear + ')')
    if (statue && t328_has(place, SOUND_EFFECT_BUILD) && !t328_has(place, SOUND_EFFECT_DIG)) {
        __log_marker('place_plays_build')
    }
    if (t328_has(clear, SOUND_EFFECT_DIG) && !t328_has(clear, SOUND_EFFECT_BUILD)
        && !t328_has(clear, SOUND_EFFECT_EXPLOSION)) {
        __log_marker('clear_plays_dig')
    }

    var fire = t328_destroyed_with(BUILDING_POTTERY_WORKSHOP, 'fire')
    var collapse = t328_destroyed_with(BUILDING_POTTERY_WORKSHOP, 'collapse')
    var wreck = t328_destroyed_with(BUILDING_POTTERY_WORKSHOP, 'enemy')
    __log_info_native('[test:328] fire ' + JSON.stringify(fire) + ', collapse ' + JSON.stringify(collapse)
        + ', enemy ' + JSON.stringify(wreck))
    if (t328_has(fire, SOUND_EFFECT_FIRE) && !t328_has(fire, SOUND_EFFECT_EXPLOSION)) {
        __log_marker('fire_plays_fire')
    }
    if (t328_has(collapse, SOUND_EFFECT_EXPLOSION) && t328_has(wreck, SOUND_EFFECT_EXPLOSION)
        && !t328_has(collapse, SOUND_EFFECT_FIRE) && !t328_has(wreck, SOUND_EFFECT_FIRE)) {
        __log_marker('collapse_and_wreck_play_crash')
    }

    // The number pad's "1" is 21,51 from its corner, 25 pixels square.
    __test_numeric_input_show(100, 100)
    __test_pump_frames(3)
    t328_effects()
    __test_mouse_click(100 + 33, 100 + 63)
    __test_pump_frames(3)
    var digit = t328_effects()
    var typed = __test_numeric_input_value()
    window_go_back()
    __test_pump_frames(2)
    __log_info_native('[test:328] digit ' + JSON.stringify(digit) + ' value ' + typed)
    if (typed == 1 && t328_has(digit, SOUND_EFFECT_ICON) && !t328_has(digit, SOUND_EFFECT_BUILD)) {
        __log_marker('digit_plays_click')
    }

    __display_options_set_scale(saved_scale)
    __test_signal_ready()
}

function check_valid() {
    var markers = ['place_plays_build', 'clear_plays_dig', 'fire_plays_fire', 'collapse_and_wreck_play_crash',
        'digit_plays_click']
    for (var i = 0; i < markers.length; i++) {
        if (!__test_find_inlog('[test-marker] ' + markers[i])) {
            return false
        }
    }
    return true
}
