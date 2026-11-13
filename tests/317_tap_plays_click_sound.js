// Buttons click when pressed. The interface sounds (click, build, message fanfares) lost their
// files when the city sounds moved to a config table, so play_effect found nothing to play, with a
// mouse or a tap. A tap on an overseer button must load and play the click (Wavs/BUTTON.WAV).
// Needs the Pharaoh data and a working audio device; without them (--nosound, --no-resource, or no
// device: SDL_AUDIODRIVER=dummy stands in for one) the test reports itself skipped.
// Markers:
//   [test-marker] click_sound_skipped
//   [test-marker] interface_sounds_registered
//   [test-marker] tap_plays_click

function t317_tap(x, y) {
    __test_touch_down(1, x, y)
    __test_pump_frames(2)
    __test_touch_up(1, x, y)
    __test_pump_frames(8)
    __test_process_events()
}

function run_test() {
    test_reload_city_session('data/default.map')
    __test_pump_frames(4)

    if (!__test_sound_ready() || __test_sound_channel_file(SOUND_CHANNEL_CITY_HOUSE_SLUM) == '') {
        __log_marker('click_sound_skipped')
        __test_signal_ready()
        return
    }

    var effects = [SOUND_EFFECT_PANEL, SOUND_EFFECT_SIDEBAR, SOUND_EFFECT_ICON, SOUND_EFFECT_BUILD,
                   SOUND_EFFECT_FANFARE, SOUND_EFFECT_FANFARE_URGENT]
    var registered = 0
    for (var i = 0; i < effects.length; i++) {
        var file = __test_sound_channel_file(effects[i])
        __log_info_native('[test:317] effect ' + effects[i] + ' -> ' + file)
        if (file != '') {
            registered++
        }
    }
    if (registered == effects.length) {
        __log_marker('interface_sounds_registered')
    }

    city.set_advisor_available(ADVISOR_LABOR, 1)
    game.last_advisor = ADVISOR_LABOR
    window_advisors_show()
    __test_pump_frames(4)
    var loaded_before = __test_sound_channel_loaded(SOUND_EFFECT_ICON)
    var adv = __test_window_pos('advisor_labors_window')
    var back = __test_window_element_pos('advisor_labors_window', 'back_btn')
    t317_tap(adv.x + back.x + 20, adv.y + back.y + 16)

    // The channel loads its file on a worker task.
    var loaded_after = false
    for (var f = 0; f < 60 && !loaded_after; f++) {
        __test_pump_frames(1)
        loaded_after = __test_sound_channel_loaded(SOUND_EFFECT_ICON)
    }
    __log_info_native('[test:317] click loaded before ' + loaded_before + ' after ' + loaded_after
        + ' window ' + __game_window_get_id())
    if (!loaded_before && loaded_after && __game_window_get_id() == 'window_city') {
        __log_marker('tap_plays_click')
    }
    __test_signal_ready()
}

function check_valid() {
    if (__test_find_inlog('[test-marker] click_sound_skipped')) {
        return true
    }
    return __test_find_inlog('[test-marker] interface_sounds_registered')
        && __test_find_inlog('[test-marker] tap_plays_click')
}
