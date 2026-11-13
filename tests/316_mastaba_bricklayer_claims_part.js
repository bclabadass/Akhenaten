// Bricklayers at a mastaba climbed onto the site, found no part to work on and walked back to their guild, so no
// block was ever placed (Men-nefer, Duo save "Duoaoh/MenNefer 11"). The part search took the monument's style from
// the pyramid table, where a mastaba has none, and skipped every part; a mastaba now uses its own style.
// The second half needs the Duo save in Save/Duoaoh/ (real Pharaoh data); without it that half logs a skip.
// Markers:
//   [test-marker] mastaba_bricklayer_claims_part
//   [test-marker] mastaba_save_blocks_placed
//   [test-marker] mastaba_save_skipped

var T316_SAVE = '../Duoaoh/MenNefer 11.svx'

function t316_synthetic() {
    test_reload_city_session('data/default.map')
    __scenario_building_allow(BUILDING_SMALL_MASTABA, true)
    __scenario_building_allow(BUILDING_BRICKLAYERS_GUILD, true)
    __test_set_treasury(500000)

    var cx = (__scenario_map.width / 2) | 0
    var cy = (__scenario_map.height / 2) | 0
    var candidates = [{x: cx - 5, y: cy - 2}, {x: cx - 5, y: cy}, {x: 40, y: 40}, {x: 30, y: 30}]
    var bid = 0
    for (var i = 0; i < candidates.length && !bid; i++) {
        bid = test_building_place(BUILDING_SMALL_MASTABA, candidates[i].x, candidates[i].y)
    }
    var tile = bid ? __building_tile(bid) : null
    var guild = bid ? test_building_place(BUILDING_BRICKLAYERS_GUILD, tile.x + 14, tile.y) : 0
    if (bid && !guild) {
        guild = test_building_place(BUILDING_BRICKLAYERS_GUILD, -1, -1)
    }
    if (!bid || !guild) {
        __log_info_native('[test:316] placement failed mastaba ' + bid + ' guild ' + guild)
        return
    }

    __test_monument_set_phase(bid, 2)
    __pyramid_start_block_phase(bid)

    var fid = __test_figure_create(FIGURE_BRICKLAYER, tile.x, tile.y + 3)
    __test_figure_set_home(fid, guild)
    city.get_building(bid).add_workers(fid)
    if (!__pyramid_claim_bricklayer_task(fid) || !__pyramid_figure_begin_climb(fid)) {
        __log_info_native('[test:316] claim or climb failed')
        return
    }
    // The climb ends in the part search: a part means walk/wait/work, none means back home.
    var seen = []
    var st = -1
    for (var t = 0; t < 400 && __test_figure_is_alive(fid); t++) {
        __test_figures_update()
        st = __test_figure_get_action(fid)
        if (seen[seen.length - 1] !== st) {
            seen.push(st)
        }
        if (st == ACTION_7_BRICKLAYER_WALK_TO_PART || st == ACTION_8_BRICKLAYER_WAIT_FOR_BLOCK || st == ACTION_2_BRICKLAYER_WORK
            || st == ACTION_3_BRICKLAYER_RETURN_HOME || st == ACTION_0_BRICKLAYER_ROAM) {
            break
        }
    }
    __log_info_native('[test:316] bricklayer ' + fid + ' states ' + seen.join('>'))
    if (seen.indexOf(ACTION_5_BRICKLAYER_FIND_PART) >= 0
        && (st == ACTION_7_BRICKLAYER_WALK_TO_PART || st == ACTION_8_BRICKLAYER_WAIT_FOR_BLOCK || st == ACTION_2_BRICKLAYER_WORK)) {
        __log_marker('mastaba_bricklayer_claims_part')
    }
}

function t316_save() {
    if (!__game_load_savegame(T316_SAVE)) {
        __log_marker('mastaba_save_skipped')
        return
    }
    var mon = 0
    for (var b = 1; b < 4000 && !mon; b++) {
        if (__building_is_valid(b) && __building_type(b) == BUILDING_SMALL_MASTABA && __building_main_id(b) == b) {
            mon = b
        }
    }
    var before = mon ? __pyramid_remaining_blocks(mon) : -1
    // Laborers work the floodplain farms first in this save, then bring blocks.
    for (var k = 0; k < 12 && mon && __pyramid_remaining_blocks(mon) >= before; k++) {
        __test_pump_frames(400)
    }
    var after = mon ? __pyramid_remaining_blocks(mon) : -1
    __log_info_native('[test:316] save mastaba ' + mon + ' blocks ' + before + ' -> ' + after)
    if (mon && after < before) {
        __log_marker('mastaba_save_blocks_placed')
    }
}

function run_test() {
    t316_synthetic()
    t316_save()
    test_reload_city_session('data/default.map')
    __test_signal_ready()
}

function check_valid() {
    return __test_find_inlog('[test-marker] mastaba_bricklayer_claims_part')
        && (__test_find_inlog('[test-marker] mastaba_save_blocks_placed') || __test_find_inlog('[test-marker] mastaba_save_skipped'))
}
