// Pharaoh has no per-mission win videos: the balcony/senate names came from the Caesar 3 code this
// project descends from. A normal win goes straight to the won window, and only finishing the
// campaign plays a video, the one Pharaoh ships.
// Markers:
//   [test-marker] normal_win_has_no_video
//   [test-marker] campaign_end_plays_pharaoh_video

var T291_WIN_VIDEO = 'BINKS/High/win_grand_big.bik'
var t291_videos = []

function t291_close_won_window() {
    for (var i = 0; i < 3 && !ui.window_is('window_city'); i++) {
        window_go_back()
        __test_pump_frames(3)
    }
}

function run_test() {
    test_reload_city_session('data/default.map')

    var saved_show = __game_victory_video_show
    var saved_choice = mission_has_post_victory_choice
    var saved_next = mission_end_compute_next_scenario_id
    var saved_scmode = scenario.scmode
    __game_victory_video_show = function (file, w, h, on_done) {
        t291_videos.push(file)
        mission_end_after_video()
    }
    mission_has_post_victory_choice = function () { return false }
    scenario.scmode = e_scenario_normal

    mission_end_compute_next_scenario_id = function () { return 3 }
    mission_end_show(MISSION_END_STATE_WON)
    __test_pump_frames(3)
    __log_info_native('[test:291] normal win videos=[' + t291_videos.join(',') + '] window='
        + ui.window_is('window_mission_won'))
    if (t291_videos.length == 0 && ui.window_is('window_mission_won')) {
        __log_marker('normal_win_has_no_video')
    }
    t291_close_won_window()

    t291_videos = []
    mission_end_compute_next_scenario_id = function () { return -1 }
    mission_end_show(MISSION_END_STATE_WON)
    __test_pump_frames(3)
    __log_info_native('[test:291] campaign end videos=[' + t291_videos.join(',') + ']')
    if (t291_videos.length == 1 && t291_videos[0] == T291_WIN_VIDEO && ui.window_is('window_mission_won')) {
        __log_marker('campaign_end_plays_pharaoh_video')
    }
    t291_close_won_window()

    __game_victory_video_show = saved_show
    mission_has_post_victory_choice = saved_choice
    mission_end_compute_next_scenario_id = saved_next
    scenario.scmode = saved_scmode
    __test_signal_ready()
}

function check_valid() {
    return __test_find_inlog('[test-marker] normal_win_has_no_video')
        && __test_find_inlog('[test-marker] campaign_end_plays_pharaoh_video')
}
