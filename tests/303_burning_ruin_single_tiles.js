// Each tile of a burning building becomes its own 1x1 burning ruin. In Nubt V (Duo, 2026-11-11) the
// ruins of a burned 2x2 house were left on the house's 2x2 tile layout, so the city drew one ruin as
// the corner of a 2x2 building and skipped the other three tiles, which showed black. Ruins now keep
// their tiles 1x1 on every tick and on load. Loading a save also restores the fire animation, which
// is chosen when the ruin is created and isn't saved.
// Markers:
//   [test-marker] ruins_created
//   [test-marker] ruin_tiles_repaired_on_tick
//   [test-marker] ruin_tiles_repaired_on_load
//   [test-marker] ruin_fire_restored_on_load

function t303_tiles_single(x, y) {
    for (var dy = 0; dy < 2; dy++) {
        for (var dx = 0; dx < 2; dx++) {
            if (__test_map_multi_tile_size(x + dx, y + dy) != 1 || __test_map_multi_tile_xy(x + dx, y + dy) != 0
                || !__test_map_is_draw_tile(x + dx, y + dy)) {
                return false
            }
        }
    }
    return true
}

function t303_ruin_ids(x, y) {
    var ids = []
    for (var dy = 0; dy < 2; dy++) {
        for (var dx = 0; dx < 2; dx++) {
            var b = city.get_building_at(x + dx, y + dy)
            if (b && b.type == BUILDING_BURNING_RUIN) {
                ids.push(b.id)
            }
        }
    }
    return ids
}

function run_test() {
    test_reload_city_session('data/default.map')
    var x = ((__scenario_map.width / 2) | 0) - 8
    var y = ((__scenario_map.height / 2) | 0) - 8
    var bid = __test_building_create(BUILDING_BAZAAR, x, y)
    var bazaar = city.get_building(bid)
    if (!bid || bazaar.size != 2) {
        __log_info_native('[test:303] bazaar create failed id=' + bid)
        __test_signal_ready()
        return
    }
    x = bazaar.tile.x
    y = bazaar.tile.y
    bazaar.destroy_by_fire()
    __test_pump_frames(2)
    var ruins = t303_ruin_ids(x, y)
    __log_info_native('[test:303] ruins ' + ruins.join(',') + ' at ' + x + ',' + y)
    if (ruins.length == 4 && t303_tiles_single(x, y)) {
        __log_marker('ruins_created')
    }

    __test_map_set_2x2_layout(x, y)
    var broken = !t303_tiles_single(x, y)
    __test_city_buildings_update_tick()
    if (broken && t303_tiles_single(x, y)) {
        __log_marker('ruin_tiles_repaired_on_tick')
    }

    __test_map_set_2x2_layout(x, y)
    var save_name = 'test_303_burning_ruins.svx'
    if (__game_write_savegame(save_name) && __game_load_savegame(save_name)) {
        __test_pump_frames(2)
        var keys = []
        var loaded = t303_ruin_ids(x, y)
        for (var i = 0; i < loaded.length; i++) {
            keys.push(__test_building_anim_key(loaded[i]))
        }
        __log_info_native('[test:303] after load ruins ' + loaded.join(',') + ' fire ' + keys.join(','))
        if (loaded.length == 4 && t303_tiles_single(x, y)) {
            __log_marker('ruin_tiles_repaired_on_load')
        }
        var fire = loaded.length == 4
        for (var j = 0; j < keys.length; j++) {
            fire = fire && /^fire[0-9]$/.test(keys[j])
        }
        if (fire) {
            __log_marker('ruin_fire_restored_on_load')
        }
    }
    __game_delete_savegame(save_name)
    __test_signal_ready()
}

function check_valid() {
    var markers = ['ruins_created', 'ruin_tiles_repaired_on_tick', 'ruin_tiles_repaired_on_load', 'ruin_fire_restored_on_load']
    for (var i = 0; i < markers.length; i++) {
        if (!__test_find_inlog('[test-marker] ' + markers[i])) {
            return false
        }
    }
    return true
}
