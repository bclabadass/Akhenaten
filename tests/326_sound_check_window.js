// Sound options has a Sound check window for confirming each sound effect by ear: every row names the
// event that plays a sound, with Play, Right and Wrong buttons. The rows must cover every effect the
// game plays, each with the file sounds.js gives its channel (an effect added without a row is caught),
// keep the two sections on separate pages, take a verdict from a tap and clear it with a second tap on
// the same button. With Pharaoh's audio and a sound device, every listen-only file must be found and play.
// Markers:
//   [test-marker] rows_cover_played_effects
//   [test-marker] pages_split_by_section
//   [test-marker] window_opens_from_sound_options
//   [test-marker] tap_marks_and_clears
//   [test-marker] summary_lists_wrong
//   [test-marker] listen_files_play
//   [test-marker] listen_files_skipped

// Effects in the table that nothing in the game plays.
var T326_UNPLAYED = [SOUND_EFFECT_PANEL, SOUND_EFFECT_HORSE]

function t326_tap(x, y) {
    __test_touch_down(1, x, y)
    __test_pump_frames(2)
    __test_touch_up(1, x, y)
    __test_pump_frames(4)
}

function t326_rows_cover_effects(rows) {
    var shown = {}
    for (var i = 0; i < rows.length; i++) {
        if (!rows[i].file) {
            __log_info_native('[test:326] row ' + rows[i].number + ' has no file')
            return false
        }
        if (rows[i].channel !== undefined) {
            shown[rows[i].channel] = rows[i].file
        }
    }
    for (var e = 0; e < sound_effects.length; e++) {
        var c = sound_effects[e].c
        if (T326_UNPLAYED.indexOf(c) >= 0) {
            continue
        }
        if (shown[c] != sound_effects[e].p) {
            __log_info_native('[test:326] channel ' + c + ' (' + sound_effects[e].p + ') shown as ' + shown[c])
            return false
        }
    }
    return sound_check_effect_file(9999) == ''
}

function run_test() {
    test_reload_city_session('data/default.map')
    var saved_scale = __display_options_get_scale()
    __display_options_set_scale(100)
    sound_check_verdicts = {}

    var rows = sound_check_rows()
    var covered = t326_rows_cover_effects(rows)
    // An effect added to the table without a row must be caught.
    sound_effects.push({ c: 9998, p: 'Wavs/NEW.WAV' })
    var caught = !t326_rows_cover_effects(rows)
    sound_effects.pop()
    if (covered && caught) {
        __log_marker('rows_cover_played_effects')
    }

    var pages = sound_check_pages()
    var split = pages.length > 1
    var listen_start = -1
    for (var p = 0; p < pages.length; p++) {
        split = split && pages[p].rows.length <= SOUND_CHECK_ROWS_PER_PAGE
        for (var r = 0; r < pages[p].rows.length; r++) {
            split = split && pages[p].rows[r].section == pages[p].section
        }
        if (listen_start < 0 && pages[p].section == 1) {
            listen_start = p
            split = split && pages[p].rows[0].number == sound_check_sections[0].rows.length + 1
        }
    }
    if (split && listen_start > 0) {
        __log_marker('pages_split_by_section')
    }

    emit event_show_window{ id: "sound_options_window" }
    __test_pump_frames(3)
    var options_button = __test_window_element_pos('sound_options_window', 'btn_sound_check')
    sound_options_btn_sound_check()
    __test_pump_frames(3)
    sound_check_window.page = 0
    __test_pump_frames(3)
    var page_text = __test_window_element_text('sound_check_window', 'page_label')
    __log_info_native('[test:326] options button ' + JSON.stringify(options_button) + ' open '
        + ui.window_is('sound_check_window') + ' page "' + page_text + '"')
    if (options_button.x >= 0 && ui.window_is('sound_check_window') && page_text == '1 / ' + pages.length) {
        __log_marker('window_opens_from_sound_options')
    }

    // Row 2's Right button, 164 in from the window's right edge.
    var win = __test_window_pos('sound_check_window')
    var right_x = win.x + 640 - 164 + 35
    var right_y = win.y + SOUND_CHECK_ROWS_TOP + SOUND_CHECK_ROW_HEIGHT + 2 + 14
    t326_tap(right_x, right_y)
    var marked = sound_check_verdicts[2]
    t326_tap(right_x, right_y)
    var cleared = sound_check_verdicts[2]
    __log_info_native('[test:326] tap at ' + right_x + ',' + right_y + ': ' + marked + ', again: ' + cleared)
    if (marked == 'right' && cleared === undefined) {
        __log_marker('tap_marks_and_clears')
    }

    sound_check_mark(3, 'right')
    sound_check_mark(5, 'wrong')
    sound_check_mark(7, 'wrong')
    var summary = sound_check_summary()
    __test_pump_frames(2)
    var shown = __test_window_element_text('sound_check_window', 'summary')
    __log_info_native('[test:326] summary "' + summary + '" shown "' + shown + '"')
    if (summary == 'Right 1   Wrong 2   Unchecked ' + (rows.length - 3) + '   Wrong: 5, 7' && shown == summary) {
        __log_marker('summary_lists_wrong')
    }

    if (__test_sound_ready()) {
        var missing = []
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].channel === undefined && !sound_check_play(rows[i].number)) {
                missing.push(rows[i].file)
            }
        }
        __game_sound.speech_stop()
        __log_info_native('[test:326] listen-only files that did not play: ' + JSON.stringify(missing))
        if (missing.length == 0) {
            __log_marker('listen_files_play')
        }
    } else {
        __log_marker('listen_files_skipped')
    }

    sound_check_verdicts = {}
    window_go_back()
    __test_pump_frames(2)
    window_go_back()
    __test_pump_frames(2)
    __display_options_set_scale(saved_scale)
    __test_signal_ready()
}

function check_valid() {
    var markers = ['rows_cover_played_effects', 'pages_split_by_section', 'window_opens_from_sound_options',
        'tap_marks_and_clears', 'summary_lists_wrong']
    for (var i = 0; i < markers.length; i++) {
        if (!__test_find_inlog('[test-marker] ' + markers[i])) {
            return false
        }
    }
    return __test_find_inlog('[test-marker] listen_files_play') || __test_find_inlog('[test-marker] listen_files_skipped')
}
