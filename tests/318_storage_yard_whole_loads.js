// Storage yards send whole loads (100 units). Two paths sent part loads and left odd amounts in yard
// spaces (Men-nefer: 292 bricks, 390 papyrus):
// - Monument sleds hauled needed - on_site, with on_site rebuilt from the whole-percent resources_pct:
//   8 loads of 100 into a 900-brick mastaba phase read as 88% = 792, so the sled took 108.
// - Papyrus went to a scribal school short by any amount, 10 at a time as it used it up.
// Markers:
//   [test-marker] sled_hauls_whole_load
//   [test-marker] sled_waits_for_load_in_flight
//   [test-marker] papyrus_waits_for_room_for_a_load
//   [test-marker] papyrus_sends_whole_loads

function t318_place_mastaba() {
    var cx = (__scenario_map.width / 2) | 0
    var cy = (__scenario_map.height / 2) | 0
    var candidates = [{x: cx - 5, y: cy - 2}, {x: cx - 5, y: cy}, {x: 40, y: 40}, {x: 30, y: 30}]
    for (var i = 0; i < candidates.length; i++) {
        var bid = test_building_place(BUILDING_SMALL_MASTABA, candidates[i].x, candidates[i].y)
        if (bid) {
            return bid
        }
    }
    return 0
}

function t318_sled() {
    test_reload_city_session('data/default.map')
    __scenario_building_allow(BUILDING_SMALL_MASTABA, true)
    __test_set_treasury(500000)

    var mastaba = t318_place_mastaba()
    var yard = mastaba ? test_building_place(BUILDING_STORAGE_YARD, -1, -1) : 0
    if (!mastaba || !yard) {
        __log_info_native('[test:318] placement failed mastaba ' + mastaba + ' yard ' + yard)
        return
    }
    __test_monument_set_phase(mastaba, 2)
    __test_storage_yard_add_resource(yard, RESOURCE_BRICKS, 400)
    for (var i = 0; i < 8; i++) {
        __test_monument_add_resource(mastaba, RESOURCE_BRICKS, 100)
    }
    var pct = __test_monument_resource_pct(mastaba, RESOURCE_BRICKS)
    var first = __test_storageyard_monument_task_amount(yard)
    __test_monument_add_delivery(mastaba, 9999, RESOURCE_BRICKS, first)
    var second = __test_storageyard_monument_task_amount(yard)
    __log_info_native('[test:318] mastaba ' + mastaba + ' bricks ' + pct + '% sled ' + first + ', then with it on the way ' + second)
    if (pct == 88 && first == 100) {
        __log_marker('sled_hauls_whole_load')
    }
    if (first == 100 && second == 0) {
        __log_marker('sled_waits_for_load_in_flight')
    }
}

function t318_papyrus() {
    test_reload_city_session('data/default.map')
    __test_set_treasury(100000)

    var school = test_building_place(BUILDING_SCRIBAL_SCHOOL, -1, -1)
    if (!school) {
        __log_info_native('[test:318] scribal school placement failed')
        return
    }
    var st = __building_tile(school)
    for (var x = st.x - 1; x <= st.x + 6; x++) {
        terrain.add({ x: x, y: st.y + 2 }, TERRAIN_ROAD)
    }
    var yard = __test_building_create(BUILDING_STORAGE_YARD, st.x + 3, st.y + 3)
    __test_update_road_network()
    __test_check_kingdome_access()
    __test_building_set_workers(school, 10)
    // The test road doesn't reach the map entry; the asker search skips buildings at distance 0.
    __test_building_set_distance_from_entry(school, 10)
    __test_building_set_distance_from_entry(yard, 10)
    __test_storage_yard_add_resource(yard, RESOURCE_PAPYRUS, 400)

    var b = city.get_building(school)
    var cap = __test_building_need_resource_amount(school, RESOURCE_PAPYRUS)
    b.consume_resource(RESOURCE_PAPYRUS, -(cap - 10))
    var short_10 = __test_storageyard_papyrus_task_amount(yard)
    b.consume_resource(RESOURCE_PAPYRUS, cap - 10 - (cap - 150))
    var short_150 = __test_storageyard_papyrus_task_amount(yard)
    __log_info_native('[test:318] school ' + school + ' yard ' + yard + ' capacity ' + cap
        + ' short by 10 -> ' + short_10 + ', short by 150 -> ' + short_150)
    if (cap > 150 && short_10 == 0 && short_150 > 0) {
        __log_marker('papyrus_waits_for_room_for_a_load')
    }
    if (short_150 == 100) {
        __log_marker('papyrus_sends_whole_loads')
    }
}

function run_test() {
    t318_sled()
    t318_papyrus()
    __test_signal_ready()
}

function check_valid() {
    return __test_find_inlog('[test-marker] sled_hauls_whole_load')
        && __test_find_inlog('[test-marker] sled_waits_for_load_in_flight')
        && __test_find_inlog('[test-marker] papyrus_waits_for_room_for_a_load')
        && __test_find_inlog('[test-marker] papyrus_sends_whole_loads')
}
