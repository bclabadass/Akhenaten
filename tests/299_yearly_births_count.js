// Yearly births must add as many people as the birth rates give. add_to_houses() ignored how many
// it was asked for and gave every house with room one person on each of its ten calls (one per age
// decade), so a 600-person Perwadjyt had 187 births a year instead of about 40.
// Markers:
//   [test-marker] births_match_rate
//   [test-marker] houses_gain_births

var T299_HOUSES = 20
var T299_ADULTS = 100

function run_test() {
    test_reload_city_session('data/default.map')
    var ids = []
    var cx = (__scenario_map.width / 2) | 0
    var cy = (__scenario_map.height / 2) | 0
    for (var i = 0; i < T299_HOUSES; i++) {
        var hid = __test_building_create(BUILDING_HOUSE_CRUDE_HUT, cx - 10 + i, cy)
        if (!hid || ids.indexOf(hid) >= 0) break
        __test_house_set_population(hid, 1)
        __test_building_set_distance_from_entry(hid, 1)
        ids.push(hid)
    }

    for (var a = 0; a < 100; a++) city.population_stats.set_at_age(a, 0)
    city.population_stats.set_at_age(25, T299_ADULTS)

    var births = __test_population_yearly_births()
    var people = 0
    for (var j = 0; j < ids.length; j++) people += __test_house_population(ids[j])
    var want = (T299_ADULTS * 16 / 100) | 0
    __log_info_native('[test:299] houses=' + ids.length + ' births=' + births + ' want ' + want + ' people in houses ' + people
        + ' (started with ' + ids.length + ')')
    if (ids.length == T299_HOUSES && births == want) {
        __log_marker('births_match_rate')
    }
    if (people == ids.length + want) {
        __log_marker('houses_gain_births')
    }
    __test_signal_ready()
}

function check_valid() {
    return __test_find_inlog('[test-marker] births_match_rate') && __test_find_inlog('[test-marker] houses_gain_births')
}
