// Pharaoh's five historical periods open with a video (Pharaoh.exe: pre_dynastic_big, archaic_big,
// old_kingdom_big, middle_kingdom_big, new_king_big) before the briefing of the period's first
// mission; Akhenaten never played them. A tap skips the video and the briefing follows. Needs the
// game data (campaign.txt and BINKS); without it the test logs a skip.
// Markers:
//   [test-marker] period_first_missions_get_their_video
//   [test-marker] period_videos_exist
//   [test-marker] video_then_briefing
//   [test-marker] period_video_check_skipped_no_data

function t307_tap() {
    var x = (screen.width / 2) | 0
    var y = (screen.height / 2) | 0
    __test_touch_down(1, x, y)
    __test_pump_frames(2)
    __test_touch_up(1, x, y)
    __test_pump_frames(4)
}

function run_test() {
    if (!__game_has_campaign_data() || !__test_resolve_path('BINKS/High/pre_dynastic_big.bik')) {
        __log_marker('period_video_check_skipped_no_data')
        __test_signal_ready()
        return
    }

    test_reload_city_session('data/default.map')
    var mode = scenario.scmode
    scenario.scmode = e_scenario_normal
    var want = { 0: 'pre_dynastic', 1: '', 2: '', 3: 'archaic', 4: '', 8: 'old_kingdom', 23: 'middle_kingdom', 32: 'new_king', 38: '' }
    var matched = true
    var exist = true
    for (var id in want) {
        var video = mission_period_video(+id)
        var ok = want[id] ? video.indexOf('/' + want[id] + '_big.bik') > 0 : video == ''
        if (!ok) {
            matched = false
        }
        if (video && !__test_resolve_path(video)) {
            exist = false
        }
        __log_info_native('[test:307] mission ' + id + ' video "' + video + '"')
    }
    if (matched) {
        __log_marker('period_first_missions_get_their_video')
    }
    if (exist) {
        __log_marker('period_videos_exist')
    }

    mission_briefing_on_show_after_load({ scenario_id: 0 })
    __test_pump_frames(4)
    var during = __game_window_get_id()
    t307_tap()
    var after = __game_window_get_id()
    __log_info_native('[test:307] nubt: ' + during + ' then ' + after + ' briefing scenario ' + game.mission_briefing_scenario_id)
    if (during == 'window_victory_video' && after == 'mission_briefing_window' && game.mission_briefing_scenario_id == 0) {
        __log_marker('video_then_briefing')
    }

    scenario.scmode = mode
    __test_signal_ready()
}

function check_valid() {
    if (__test_find_inlog('[test-marker] period_video_check_skipped_no_data')) {
        return true
    }
    var markers = ['period_first_missions_get_their_video', 'period_videos_exist', 'video_then_briefing']
    for (var i = 0; i < markers.length; i++) {
        if (!__test_find_inlog('[test-marker] ' + markers[i])) {
            return false
        }
    }
    return true
}
