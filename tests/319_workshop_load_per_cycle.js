// A workshop turns one load of raw material into one load of goods, and its cart leaves with that
// load (Pharaoh: carts carry full loads of 100). A brickworks uses 100 clay and 25 straw per load. Production made 20 (pottery, bricks, lamps, paint)
// or 50 (papyrus, beer) per 100 used, and carts left with those part loads, which then sat in storage
// yard spaces as odd amounts. Chariots are left out: their quantities are counted singly.
// Markers:
//   [test-marker] workshop_<type>_load_per_cycle

var T319_WORKSHOPS = [
    { type: BUILDING_POTTERY_WORKSHOP, name: 'pottery', input: [RESOURCE_CLAY], output: RESOURCE_POTTERY },
    { type: BUILDING_PAPYRUS_WORKSHOP, name: 'papyrus', input: [RESOURCE_REEDS], output: RESOURCE_PAPYRUS },
    { type: BUILDING_BREWERY_WORKSHOP, name: 'brewery', input: [RESOURCE_BARLEY], output: RESOURCE_BEER },
    { type: BUILDING_BRICKS_WORKSHOP, name: 'bricks', input: [RESOURCE_CLAY, RESOURCE_STRAW], used: [100, 25], output: RESOURCE_BRICKS },
    { type: BUILDING_BRICKS_WORKSHOP, name: 'bricks_25_straw', input: [RESOURCE_CLAY, RESOURCE_STRAW], stock: [100, 25], used: [100, 25], output: RESOURCE_BRICKS },
    { type: BUILDING_LAMP_WORKSHOP, name: 'lamps', input: [RESOURCE_OIL, RESOURCE_POTTERY], output: RESOURCE_LAMPS },
    { type: BUILDING_PAINT_WORKSHOP, name: 'paint', input: [RESOURCE_HENNA], output: RESOURCE_PAINT },
]

function t319_cycle(w) {
    __scenario_building_allow(w.type, true)
    var bid = test_building_place(w.type, -1, -1)
    if (!bid) {
        __log_info_native('[test:319] ' + w.name + ' placement failed')
        return
    }
    var b = city.get_building(bid)
    // A load of each input unless the case says otherwise; a cycle uses 100 of each, bricks 25 straw.
    for (var i = 0; i < w.input.length; i++) {
        b.consume_resource(w.input[i], -(w.stock ? w.stock[i] : 100))
    }
    b.progress = 0
    __test_building_update_day(bid)
    b = city.get_building(bid)
    var started = b.progress > 0
    b.progress = b.progress_max
    __test_building_update_day(bid)
    b = city.get_building(bid)
    var made = b.stored_resource(w.output)
    var used_ok = true
    var used = []
    for (var j = 0; j < w.input.length; j++) {
        var want = w.used ? w.used[j] : 100
        var spent = (w.stock ? w.stock[j] : 100) - b.stored_resource(w.input[j])
        used.push(spent)
        used_ok = used_ok && spent == want
    }
    __log_info_native('[test:319] ' + w.name + ' started ' + started + ' made ' + made + ' used ' + used.join('+'))
    if (started && made == 100 && used_ok) {
        __log_marker('workshop_' + w.name + '_load_per_cycle')
    }
}

function run_test() {
    test_reload_city_session('data/default.map')
    __test_set_treasury(500000)
    for (var i = 0; i < T319_WORKSHOPS.length; i++) {
        t319_cycle(T319_WORKSHOPS[i])
    }
    __test_signal_ready()
}

function check_valid() {
    for (var i = 0; i < T319_WORKSHOPS.length; i++) {
        if (!__test_find_inlog('[test-marker] workshop_' + T319_WORKSHOPS[i].name + '_load_per_cycle')) {
            return false
        }
    }
    return true
}
