// The suite runs with no family chosen. Its saves go to a family of their own,
// Save/Integral Tests/, instead of loose in Save/, and load back from there.
// Markers:
//   Save game: OK Save/Integral Tests/test_281_family.svx   (logged by the save itself)
//   [test-marker] test_save_loads_from_family

var SAVE_NAME = 'test_281_family.svx'

function run_test() {
    test_reload_city_session('data/default.map')

    if (game.dynasty_name) {
        __log_info_native('[test:281] a family is selected (' + game.dynasty_name + '), nothing to check')
        __test_signal_ready()
        return
    }

    if (!__game_write_savegame(SAVE_NAME)) {
        __log_info_native('[test:281] write_savegame failed')
        __test_signal_ready()
        return
    }
    if (__game_load_savegame(SAVE_NAME)) {
        __log_marker('test_save_loads_from_family')
    }
    __game_delete_savegame(SAVE_NAME)
    __test_signal_ready()
}

function check_valid() {
    return __test_find_inlog('Save game: OK Save/Integral Tests/' + SAVE_NAME)
        && __test_find_inlog('[test-marker] test_save_loads_from_family')
}
