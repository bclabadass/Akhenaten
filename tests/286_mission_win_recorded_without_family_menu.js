// A won mission must be saved to the current family's progress even when the game was opened
// from the Load dialog or Continue. Only the family menu loaded the profile, so those wins went
// to an empty profile that save() refused, and the campaign never recorded them.
// Markers:
//   [test-marker] win_saved_for_family

var T286_FAMILY = 'Integral Tests'
var T286_SCENARIO = 5

function run_test() {
    test_reload_city_session('data/default.map')

    // As after the Load dialog: a family set, but no profile loaded through the family menu.
    __game_load_player_data('')
    game.dynasty_name = T286_FAMILY
    __game_delete_savegame('progress.dat')

    __game_player_record_mission_win(T286_SCENARIO)

    // Read the profile back from disk.
    __game_load_player_data(T286_FAMILY)
    if (__game_player_scenario_record_nonempty(T286_SCENARIO)) {
        __log_marker('win_saved_for_family')
    } else {
        __log_info_native('[test:286] no record for scenario ' + T286_SCENARIO + ' after reloading the profile')
    }

    __game_delete_savegame('progress.dat')
    __game_load_player_data('')
    __test_signal_ready()
}

function check_valid() {
    return __test_find_inlog('[test-marker] win_saved_for_family')
}
