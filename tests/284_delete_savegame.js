// Deleting a save must remove the file. vfs::file_remove passed "Save/<family>/x.svx" to the OS
// as-is, so it resolved against the working directory, not the data folder, and nothing was
// deleted unless the game happened to run from the data folder. vfs::file_rename_os had the
// same problem, which kept campaign progress (progress.tmp -> progress.dat) from saving on iOS.
// Markers:
//   [test-marker] delete_reports_success
//   [test-marker] deleted_save_is_gone

var SAVE_NAME = 'test_284_delete.svx'

function run_test() {
    test_reload_city_session('data/default.map')

    if (!__game_write_savegame(SAVE_NAME)) {
        __log_info_native('[test:284] write_savegame failed')
        __test_signal_ready()
        return
    }

    if (__game_delete_savegame(SAVE_NAME)) {
        __log_marker('delete_reports_success')
    }
    if (!__game_load_savegame(SAVE_NAME)) {
        __log_marker('deleted_save_is_gone')
    } else {
        __log_info_native('[test:284] save still loads after delete')
    }
    __test_signal_ready()
}

function check_valid() {
    return __test_find_inlog('[test-marker] delete_reports_success')
        && __test_find_inlog('[test-marker] deleted_save_is_gone')
}
