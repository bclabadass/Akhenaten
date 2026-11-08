// A city can win while in debt. final_funds is stored unsigned, and the score read it that way,
// so -5514 became about 4.29 billion (Perwadjyt on the Duo scored 1073740792). The record's score
// must match the win screen's formula, and scores saved by older builds are repaired on load.
// Markers:
//   [test-marker] negative_funds_score
//   [test-marker] old_score_repaired
//   [test-marker] positive_funds_score
//   [test-marker] positive_record_keeps_stored_score

var T290_FAMILY = 'Integral Tests'
var T290_SCENARIO = 6

function t290_expected() {
    var s = T290_SCENARIO
    return mission_won_calc_score(__game_player_scenario_record_final_funds(s),
        __game_player_scenario_record_final_population(s),
        __game_player_scenario_record_rating_culture(s),
        __game_player_scenario_record_rating_prosperity(s),
        __game_player_scenario_record_rating_kingdom(s),
        __game_player_scenario_record_completion_months(s),
        __game_player_scenario_record_difficulty(s))
}

function t290_score() {
    return __game_player_scenario_record_score(T290_SCENARIO)
}

function t290_win_with_funds(funds) {
    __test_set_treasury(funds)
    __game_player_record_mission_win(T290_SCENARIO)
    __log_info_native('[test:290] funds=' + __game_player_scenario_record_final_funds(T290_SCENARIO)
        + ' score=' + t290_score() + ' expected=' + t290_expected())
    return t290_score() == t290_expected()
}

function run_test() {
    test_reload_city_session('data/default.map')
    __game_load_player_data('')
    game.dynasty_name = T290_FAMILY
    __game_delete_savegame('progress.dat')

    if (t290_win_with_funds(-5514)) {
        __log_marker('negative_funds_score')
    }

    __test_player_set_record_score(T290_SCENARIO, 1073740792)
    __game_load_player_data(T290_FAMILY)
    if (t290_score() == t290_expected()) {
        __log_marker('old_score_repaired')
    }

    if (t290_win_with_funds(5000) && t290_score() > 0) {
        __log_marker('positive_funds_score')
    }

    __test_player_set_record_score(T290_SCENARIO, 777)
    __game_load_player_data(T290_FAMILY)
    if (t290_score() == 777) {
        __log_marker('positive_record_keeps_stored_score')
    }

    __game_delete_savegame('progress.dat')
    __game_load_player_data('')
    __test_signal_ready()
}

function check_valid() {
    return __test_find_inlog('[test-marker] negative_funds_score')
        && __test_find_inlog('[test-marker] old_score_repaired')
        && __test_find_inlog('[test-marker] positive_funds_score')
        && __test_find_inlog('[test-marker] positive_record_keeps_stored_score')
}
