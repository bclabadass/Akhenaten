// A mission's trade partners must trade up to the yearly limits its script sets. Starting a mission
// built the cities from the empire map objects a second time after the script had been applied, which
// set every limit from the objects' trade amounts: none for the cities Timna's script defines, so its
// routes showed "0 of 0" for everything. A route the mission opens later (Men-nefer in Timna, after a
// request) must open with limits too. Every campaign mission from Men-nefer on defines its trade
// partners this way, so a sweep of them must find no traded good without a limit.
// Markers:
//   [test-marker] timna_partners_have_limits
//   [test-marker] timna_scripted_limit_kept
//   [test-marker] opened_route_has_limits
//   [test-marker] missions_have_limits

var T329_TRADING = [EMPIRE_CITY_PHARAOH_TRADING, EMPIRE_CITY_EGYPTIAN_TRADING, EMPIRE_CITY_FOREIGN_TRADING]

function t329_city_on_route(route) {
    for (var i = 0; i < 64; i++) {
        var c = empire.get_city(i)
        if (c && c.in_use && c.route_id == route && c.type != EMPIRE_CITY_OURS) {
            return c
        }
    }
    return null
}

// "route:resource" for each good a trading city trades with no yearly limit; count of trading cities.
function t329_unlimited() {
    var missing = []
    var trading = 0
    for (var i = 0; i < 64; i++) {
        var c = empire.get_city(i)
        if (!c || !c.in_use || T329_TRADING.indexOf(c.type) < 0) {
            continue
        }
        trading++
        for (var r = RESOURCE_GRAIN; r <= RESOURCE_MARBLE; r++) {
            if ((c.city_sells_resource(r) || c.city_buys_resource(r)) && c.trade_route_limit(r) <= 0) {
                missing.push(c.route_id + ':' + r)
            }
        }
    }
    return { trading: trading, missing: missing }
}

function t329_goods_limits(c) {
    var out = []
    for (var r = RESOURCE_GRAIN; r <= RESOURCE_MARBLE; r++) {
        if (c.city_sells_resource(r) || c.city_buys_resource(r)) {
            out.push(c.trade_route_limit(r))
        }
    }
    return out
}

function run_test() {
    __game_load_mission(5, 1)
    __test_pump_frames(3)
    var timna = t329_unlimited()
    var nekhen = t329_city_on_route(4)
    var nekhen_pottery = nekhen ? nekhen.trade_route_limit(RESOURCE_POTTERY) : -1
    __log_info_native('[test:329] timna trading cities ' + timna.trading + ', goods without a limit '
        + JSON.stringify(timna.missing) + ', nekhen pottery ' + nekhen_pottery)
    if (timna.trading >= 3 && timna.missing.length == 0) {
        __log_marker('timna_partners_have_limits')
    }
    // Timna's script gives Nekhen's pottery 2500, not the 1500 default.
    if (nekhen && nekhen.city_sells_resource(RESOURCE_POTTERY) && nekhen_pottery == 2500) {
        __log_marker('timna_scripted_limit_kept')
    }

    var mennefer = t329_city_on_route(5)
    var before_type = mennefer ? mennefer.type : -1
    city.create_chain_event({
        tag_id: 32901,
        type: EVENT_TYPE_CITY_STATUS_CHANGE,
        subtype: EVENT_SUBTYPE_NEW_TRADE_ROUTE,
        city: "Men-nefer",
        amount: 0,
        trigger: EVENT_TRIGGER_ONCE
    }).execute()
    __test_pump_frames(2)
    var opened = mennefer ? t329_goods_limits(mennefer) : []
    __log_info_native('[test:329] men-nefer type ' + before_type + ' -> ' + (mennefer ? mennefer.type : -1)
        + ', open ' + (mennefer ? mennefer.is_open : false) + ', limits ' + JSON.stringify(opened))
    var all_set = opened.length > 0
    for (var i = 0; i < opened.length; i++) {
        all_set = all_set && opened[i] > 0
    }
    if (mennefer && before_type == EMPIRE_CITY_PHARAOH && mennefer.type == EMPIRE_CITY_PHARAOH_TRADING && all_set) {
        __log_marker('opened_route_has_limits')
    }

    // Every campaign mission with trade (Men-nefer on) defines its partners in its script.
    var sweep = [4, 6, 10, 13, 16, 19]
    var sweep_ok = true
    for (var m = 0; m < sweep.length; m++) {
        __game_load_mission(sweep[m], 1)
        __test_pump_frames(2)
        var res = t329_unlimited()
        __log_info_native('[test:329] mission ' + sweep[m] + ' trading cities ' + res.trading
            + ', goods without a limit ' + JSON.stringify(res.missing))
        sweep_ok = sweep_ok && res.trading > 0 && res.missing.length == 0
    }
    if (sweep_ok) {
        __log_marker('missions_have_limits')
    }

    test_reload_city_session('data/default.map')
    __test_signal_ready()
}

function check_valid() {
    var markers = ['timna_partners_have_limits', 'timna_scripted_limit_kept', 'opened_route_has_limits',
        'missions_have_limits']
    for (var i = 0; i < markers.length; i++) {
        if (!__test_find_inlog('[test-marker] ' + markers[i])) {
            return false
        }
    }
    return true
}
