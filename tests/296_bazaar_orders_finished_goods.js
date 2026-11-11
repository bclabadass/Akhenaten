// A bazaar's Orders list only lets you stop buying goods the city can get. Pottery and beer
// counted only when the empire listed the city as selling them, not when it could make them from
// its own clay and barley. In Nekhen (empire off) both rows were grayed out and ignored taps, so
// bazaars kept buying beer and the mission's 300 beer stockpile never grew.
// Markers:
//   [test-marker] market_lists_pottery
//   [test-marker] market_lists_beer
//   [test-marker] market_omits_linen
//   [test-marker] bazaar_stops_buying_pottery
//   [test-marker] bazaar_stops_buying_beer

function t296_has(map, res) {
    for (var name in map) {
        if (map[name] == res) {
            return true
        }
    }
    return false
}

function run_test() {
    __game_load_mission(3)
    __test_pump_frames(5)

    var market = city.resources.available_market
    if (t296_has(market, RESOURCE_POTTERY)) {
        __log_marker('market_lists_pottery')
    }
    if (t296_has(market, RESOURCE_BEER)) {
        __log_marker('market_lists_beer')
    }
    if (!t296_has(market, RESOURCE_LINEN)) {
        __log_marker('market_omits_linen')
    }

    var bid = __test_building_create(BUILDING_BAZAAR, -1, -1)
    __test_show_tile_info(bid)
    __test_pump_frames(4)
    emit event_show_window{ id: "bazaar_orders_window" }
    __test_pump_frames(4)

    var bazaar = city.get_bazaar(bid)
    var goods = [[RESOURCE_POTTERY, 'pottery'], [RESOURCE_BEER, 'beer']]
    for (var i = 0; i < goods.length; i++) {
        var res = goods[i][0]
        var was = bazaar.res_accepted(res)
        bazaar_orders_list_on_click_item({ user_data: res })
        var now = bazaar.res_accepted(res)
        __log_info_native('[test:296] ' + goods[i][1] + ' accepted ' + was + ' -> ' + now)
        if (was && !now) {
            __log_marker('bazaar_stops_buying_' + goods[i][1])
        }
    }

    window_go_back()
    __test_pump_frames(2)
    window_go_back()
    __test_pump_frames(2)
    __test_signal_ready()
}

function check_valid() {
    var markers = ['market_lists_pottery', 'market_lists_beer', 'market_omits_linen', 'bazaar_stops_buying_pottery',
        'bazaar_stops_buying_beer']
    for (var i = 0; i < markers.length; i++) {
        if (!__test_find_inlog('[test-marker] ' + markers[i])) {
            return false
        }
    }
    return true
}
