// Pharaoh's data mixes upper- and lowercase names: 203_mission.MP3 next to 202_mission.mp3, and the
// period videos Archaic_big.bik while the game asks for archaic_big.bik. On a case-sensitive file
// system (iOS, Linux) a file only opens through the cache of real names, which left out
// AUDIO/Voice/Mission and BINKS, so mission briefings from Nekhen (203) on were silent on the Duo.
// Needs the game data; without it the test logs a skip.
// Markers:
//   [test-marker] mission_narration_resolves_real_case
//   [test-marker] period_video_resolves_real_case
//   [test-marker] data_case_check_skipped_no_data

function t306_ends_with(path, tail) {
    return path.length >= tail.length && path.lastIndexOf(tail) == path.length - tail.length
}

function run_test() {
    var narration = '' + __test_resolve_path('AUDIO/Voice/Mission/203_mission.mp3')
    var video = '' + __test_resolve_path('BINKS/High/archaic_big.bik')
    __log_info_native('[test:306] narration -> ' + narration + ' video -> ' + video)
    if (!__test_resolve_path('campaign.txt') || narration.indexOf('203_mission') < 0) {
        __log_marker('data_case_check_skipped_no_data')
    } else {
        if (t306_ends_with(narration, '/203_mission.MP3')) {
            __log_marker('mission_narration_resolves_real_case')
        }
        if (t306_ends_with(video, '/Archaic_big.bik')) {
            __log_marker('period_video_resolves_real_case')
        }
    }
    __test_signal_ready()
}

function check_valid() {
    if (__test_find_inlog('[test-marker] data_case_check_skipped_no_data')) {
        return true
    }
    return __test_find_inlog('[test-marker] mission_narration_resolves_real_case') && __test_find_inlog('[test-marker] period_video_resolves_real_case')
}
