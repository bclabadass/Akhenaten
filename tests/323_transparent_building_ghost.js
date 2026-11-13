// While placing a building the preview (ghost) can be see-through, so the tiles, roads and buildings
// under it stay visible; a finger on the Duo already hides the spot. The option (gameui_transparent_ghost,
// on by default on iOS) draws every fully opaque piece of the preview at 60%, and leaves pieces that
// are already translucent, like the 30% footprint tiles, as they are.
// Markers:
//   [test-marker] ghost_option_listed
//   [test-marker] ghost_faded_when_on
//   [test-marker] ghost_opaque_when_off

function t323_tap(x, y) {
    __test_touch_down(1, x, y)
    __test_pump_frames(2)
    __test_touch_up(1, x, y)
    __test_pump_frames(8)
    __test_process_events()
}

function t323_stats() {
    __test_pump_frames(3)
    var parts = __test_ghost_fade_stats().split(',')
    return { drawn: parseInt(parts[0]), faded: parseInt(parts[1]), kept: parseInt(parts[2]) }
}

function t323_option_listed() {
    window_features_build_pages()
    for (var p = 0; p < window_features.pages.length; p++) {
        var features = window_features.pages[p].features
        for (var f = 0; f < features.length; f++) {
            if (features[f].key == 'gameui_transparent_ghost') {
                return true
            }
        }
    }
    return false
}

function run_test() {
    test_reload_city_session('data/default.map')
    var option_prev = game_features.get('gameui_transparent_ghost') === true
    if (t323_option_listed()) {
        __log_marker('ghost_option_listed')
    }

    test_planner_enter_build_mode(BUILDING_GRANARY)
    __test_pump_frames(3)
    t323_tap(400, 300)

    game_features.set('gameui_transparent_ghost', true)
    var on = t323_stats()
    game_features.set('gameui_transparent_ghost', false)
    var off = t323_stats()
    __log_info_native('[test:323] granary preview on ' + JSON.stringify(on) + ' off ' + JSON.stringify(off))
    if (on.drawn > 0 && on.faded > 0 && on.faded + on.kept == on.drawn) {
        __log_marker('ghost_faded_when_on')
    }
    if (off.drawn > 0 && off.faded == 0) {
        __log_marker('ghost_opaque_when_off')
    }

    game_features.set('gameui_transparent_ghost', option_prev)
    __ui_city_planner_reset()
    __test_pump_frames(2)
    __test_signal_ready()
}

function check_valid() {
    return __test_find_inlog('[test-marker] ghost_option_listed')
        && __test_find_inlog('[test-marker] ghost_faded_when_on')
        && __test_find_inlog('[test-marker] ghost_opaque_when_off')
}
