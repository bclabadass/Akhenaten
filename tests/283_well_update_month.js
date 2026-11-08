// A well's monthly update (fancy look by desirability) must run without a script error.
// It read the tile as well.tile.x() and threw a TypeError every month for every well.
// Markers:
//   [test-marker] well_month_passed

function run_test() {
    test_reload_city_session('data/default.map')
    var bid = __test_building_create(BUILDING_WELL, -1, -1)
    if (!bid) {
        __log_info_native('[test:283] could not create a well')
        __test_signal_ready()
        return
    }

    // A month is well under 48 days; the driver's log scan fails the test on a TypeError.
    var start = game.absolute_day
    for (var k = 0; k < 20 && game.absolute_day < start + 48; k++) {
        __test_pump_frames(240)
    }
    __log_info_native('[test:283] days ' + start + ' -> ' + game.absolute_day)
    if (game.absolute_day >= start + 48) {
        __log_marker('well_month_passed')
    }
    __test_signal_ready()
}

function check_valid() {
    return __test_find_inlog('[test-marker] well_month_passed')
}
