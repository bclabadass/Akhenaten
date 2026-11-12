// A storage yard without road access is left out of the city's storage totals, but the yards after it
// must still be counted. The count stopped at the first yard without a road, so later yards' goods were
// missing from yards_stored and event_warehouse_filled never fired; Perwadjyt, Nekhen and Mennefer
// check their stockpile goals on that event.
// Markers:
//   [test-marker] roaded_yard_counted
//   [test-marker] unroaded_yard_skipped
//   [test-marker] filled_event_fires

var t301_filled = []

function t301_on_filled(ev) {
    t301_filled.push(ev.bid)
}

function run_test() {
    test_reload_city_session('data/default.map')
    var cx = (__scenario_map.width / 2) | 0
    var cy = (__scenario_map.height / 2) | 0

    var no_road = __test_building_create(BUILDING_STORAGE_YARD, cx - 12, cy)
    var roaded = __test_building_create(BUILDING_STORAGE_YARD, cx + 4, cy)
    for (var x = cx + 3; x <= cx + 8; x++) {
        __test_make_road(x, cy + 3)
    }
    __test_storage_yard_add_resource(no_road, RESOURCE_BEER, 100)
    __test_storage_yard_add_resource(roaded, RESOURCE_POTTERY, 200)
    __test_js_add_event_handler('event_warehouse_filled', 't301_on_filled')
    // Adding goods also updates the totals through queued events; let those land before the recount.
    __test_pump_frames(2)

    __test_calculate_storageyard_stocks()
    var pottery = __test_yards_stored(RESOURCE_POTTERY)
    var beer = __test_yards_stored(RESOURCE_BEER)
    __test_pump_frames(2)
    __log_info_native('[test:301] yards ' + no_road + ' (no road) ' + roaded + ' (road) pottery=' + pottery + ' beer=' + beer
        + ' filled=' + JSON.stringify(t301_filled))
    if (no_road && roaded && no_road < roaded && pottery == 200) {
        __log_marker('roaded_yard_counted')
    }
    if (beer == 0) {
        __log_marker('unroaded_yard_skipped')
    }
    if (t301_filled.indexOf(roaded) >= 0) {
        __log_marker('filled_event_fires')
    }
    __test_signal_ready()
}

function check_valid() {
    var markers = ['roaded_yard_counted', 'unroaded_yard_skipped', 'filled_event_fires']
    for (var i = 0; i < markers.length; i++) {
        if (!__test_find_inlog('[test-marker] ' + markers[i])) {
            return false
        }
    }
    return true
}
