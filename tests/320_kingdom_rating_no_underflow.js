// The kingdom rating is a uint8_t. The yearly update subtracted its penalties (early-mission
// decline, salary above rank, missed milestone) straight from it, so a rating of 0 or 1 wrapped
// to about 255 and passed the kingdom win criterion (Men-nefer victory with "Final Kingdom Rating
// 255"); the next monthly clamp then left it at the cap, 100. Penalties now stop at 0.
// Markers:
//   [test-marker] kingdom_rating_stops_at_zero
//   [test-marker] kingdom_rating_stays_zero_next_month

function run_test() {
    test_reload_city_session('data/default.map')
    // Open play pins the rating at 50 every month.
    var was_open_play = scenario.is_open_play
    scenario.is_open_play = false
    __city_kingdome.player_rank = 2
    __city_kingdome.salary_rank = 5
    __test_kingdom_set_rating(1)

    __test_run_console_command('updatekingdome 1')
    var after_year = __test_kingdom_rating()
    __test_run_console_command('updatekingdome 0')
    var after_month = __test_kingdom_rating()
    __log_info_native('[test:320] rating 1, salary 3 ranks too high: after the year ' + after_year
        + ', after the next month ' + after_month + ' (penalty ' + __city_kingdome.kingdom_salary_penalty + ')')
    if (after_year == 0) {
        __log_marker('kingdom_rating_stops_at_zero')
    }
    if (after_month == 0) {
        __log_marker('kingdom_rating_stays_zero_next_month')
    }
    scenario.is_open_play = was_open_play
    __test_signal_ready()
}

function check_valid() {
    return __test_find_inlog('[test-marker] kingdom_rating_stops_at_zero')
        && __test_find_inlog('[test-marker] kingdom_rating_stays_zero_next_month')
}
