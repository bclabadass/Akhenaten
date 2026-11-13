// A save written by the original game keeps other data where this port keeps a figure's runtime data, so its trade
// caravans loaded with city 255 and crashed when they left the map (Retryohep "Bahariya Oasis 10"). On loading an
// original save, caravans and trade ships now take their city, trader slot and amount bought from the original's
// own fields.
// Needs the original save in Save/Retryohep/ (real Pharaoh data); without it the test logs a skip and passes.
// Markers:
//   [test-marker] original_traders_have_cities
//   [test-marker] original_save_runs_past_caravan_exit
//   [test-marker] original_save_traders_skipped

var T312_SAVE = '../Retryohep/Bahariya Oasis 10.sav'

function t312_traders() {
    var p = ('' + __test_trader_cities()).split(',')
    return { traders: +p[0], valid: +p[1] }
}

function run_test() {
    if (!__game_load_savegame(T312_SAVE)) {
        __log_marker('original_save_traders_skipped')
        __test_signal_ready()
        return
    }

    var loaded = t312_traders()
    __log_info_native('[test:312] after load ' + JSON.stringify(loaded))
    if (loaded.traders > 0 && loaded.valid == loaded.traders) {
        __log_marker('original_traders_have_cities')
    }

    // Before the fix a caravan left the map and crashed within 60 frames.
    __test_pump_frames(240)
    var later = t312_traders()
    __log_info_native('[test:312] after 240 frames ' + JSON.stringify(later) + ' window ' + __game_window_get_id())
    if (later.valid == later.traders) {
        __log_marker('original_save_runs_past_caravan_exit')
    }

    test_reload_city_session('data/default.map')
    __test_signal_ready()
}

function check_valid() {
    if (__test_find_inlog('[test-marker] original_save_traders_skipped')) {
        return true
    }
    return __test_find_inlog('[test-marker] original_traders_have_cities') && __test_find_inlog('[test-marker] original_save_runs_past_caravan_exit')
}
