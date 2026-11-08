// A mission's own win conditions ("reasons", e.g. Perwadjyt's pottery steps) are set by
// handlers of event_update_victory_state, which emit only queues. The victory check ran right
// after emitting it, so straight after a load or reset it saw no reasons, counted that as all
// met, and showed the victory dialog for a mission that wasn't won (Perwadjyt on the Duo).
// Markers:
//   [test-marker] no_false_victory_after_reset
//   [test-marker] victory_when_reasons_met

var t288_reason_met = false
var T288_CRITERIA = ['population', 'culture', 'prosperity', 'monuments', 'kingdom', 'housing_count', 'housing_level',
    'time_limit', 'survival_time']

function t288_reason_handler(ev) {
    city.victory.set_reason('t288_step', t288_reason_met)
}

function t288_close_popups() {
    for (var i = 0; i < 3 && !ui.window_is('window_city') && !ui.window_is('window_victory_dialog'); i++) {
        window_go_back()
        __test_pump_frames(3)
    }
}

function run_test() {
    test_reload_city_session('data/default.map')
    // The test map is open play, which never checks victory.
    var was_open_play = scenario.is_open_play
    scenario.is_open_play = false

    // Only a population goal of 0 (always met) and the test reason; the map's own criteria
    // (survival and time limits decide on their own once their year has passed) are off.
    var saved = {}
    for (var i = 0; i < T288_CRITERIA.length; i++) {
        saved[T288_CRITERIA[i]] = city.winning[T288_CRITERIA[i]].enabled
        city.winning[T288_CRITERIA[i]].enabled = false
    }
    city.winning.population.enabled = true
    city.winning.population.goal = 0
    city.mission.victory_message_shown = false
    __test_js_add_event_handler('event_update_victory_state', 't288_reason_handler')

    // As after loading a save: reasons cleared, then a check before any update was processed.
    __city_victory_reset()
    __test_process_events()
    city_victory_on_check({})
    var false_victory = ui.window_is('window_victory_dialog')
    for (var k = 0; k < 6 && !false_victory; k++) {
        __test_pump_frames(120)
        t288_close_popups()
        false_victory = ui.window_is('window_victory_dialog')
    }
    if (!false_victory && city.victory.state != 1) {
        __log_marker('no_false_victory_after_reset')
    } else {
        __log_info_native('[test:288] victory dialog shown with an unmet reason')
        window_go_back()
    }

    t288_reason_met = true
    var won = false
    for (var j = 0; j < 8 && !won; j++) {
        __test_pump_frames(120)
        t288_close_popups()
        won = ui.window_is('window_victory_dialog')
    }
    if (won) {
        __log_marker('victory_when_reasons_met')
        window_go_back()
    } else {
        __log_info_native('[test:288] no victory after the reason was met, state=' + city.victory.state)
    }

    for (var j2 = 0; j2 < T288_CRITERIA.length; j2++) {
        city.winning[T288_CRITERIA[j2]].enabled = saved[T288_CRITERIA[j2]]
    }
    scenario.is_open_play = was_open_play
    __test_signal_ready()
}

function check_valid() {
    return __test_find_inlog('[test-marker] no_false_victory_after_reset')
        && __test_find_inlog('[test-marker] victory_when_reasons_met')
}
