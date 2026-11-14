// A god's message (a blessing or a curse) has its own layout: the god's portrait on top, the text panel
// under it and the title at the bottom. Each message's own size was applied over that layout, so a
// smaller message (Osiris's farm blessing is 30x20) shrank the window and pushed the text panel out of it
// over the title, and the portrait was drawn under the panels. The religion advisor drew happy ankhs
// with the bolt image and bolts with the ankh image. The pixel and image checks need the Pharaoh art;
// without it they report themselves skipped.
// Markers:
//   [test-marker] god_message_keeps_layout
//   [test-marker] god_portrait_drawn
//   [test-marker] advisor_ankh_and_bolt_images
//   [test-marker] art_checks_skipped

var T327_SECTION = 'message_dialog_window_god'

function t327_bless(god) {
    city.gods.set_known(god, true)
    __test_god_set_state(god, 95, 2)
    for (var d = 0; d < 120; d++) {
        __test_religion_update_mood(god)
    }
    __test_religion_monthly_blessings(god)
    __test_pump_frames(6)
}

// Dark (ink) pixels in the portrait area: the portraits are ink sketches, the panel under them has none.
function t327_portrait_ink() {
    var win = __test_window_pos(T327_SECTION)
    var dark = 0
    for (var y = win.y + 40; y < win.y + 184; y += 4) {
        for (var x = win.x + 16; x < win.x + 464; x += 4) {
            var c = __test_screen_pixel(x, y)
            if (c >= 0 && ((c >> 16) & 255) + ((c >> 8) & 255) + (c & 255) < 200) {
                dark++
            }
        }
    }
    return dark
}

function t327_size(id) {
    var s = __test_window_element_size(T327_SECTION, id)
    return s.x + 'x' + s.y
}

function run_test() {
    test_reload_city_session('data/default.map')
    var saved_scale = __display_options_get_scale()
    __display_options_set_scale(100)
    __test_pump_frames(5)

    var art = get_image({ pack: PACK_GENERAL, id: 9 }).tid != get_image({ pack: PACK_GENERAL, id: 111 }).tid

    // Osiris's major blessing is one of two messages, sized 30x20 and 30x28; the layout must not follow either.
    t327_bless(GOD_OSIRIS)
    var layout = t327_size('background') + ' panel ' + t327_size('content_panel')
    var osiris_ink = t327_portrait_ink()
    window_go_back()
    __test_pump_frames(3)
    t327_bless(GOD_BAST)
    var bast_layout = t327_size('background') + ' panel ' + t327_size('content_panel')
    var bast_ink = t327_portrait_ink()
    window_go_back()
    __test_pump_frames(3)

    __log_info_native('[test:327] layout osiris ' + layout + ', bast ' + bast_layout + '; portrait ink osiris '
        + osiris_ink + ', bast ' + bast_ink)
    if (layout == '30x28 panel 29x11' && bast_layout == layout) {
        __log_marker('god_message_keeps_layout')
    }

    if (!art) {
        __log_marker('art_checks_skipped')
    } else {
        if (osiris_ink > 20 && bast_ink > 20) {
            __log_marker('god_portrait_drawn')
        }
        var imgs = advisor_religion_get_bolt_angel_images()
        var bolt = get_image({ pack: PACK_GENERAL, id: 111 })
        var ankh = get_image({ pack: PACK_GENERAL, id: 9 })
        __log_info_native('[test:327] advisor bolt ' + imgs.bolt.tid + ' (bolt ' + bolt.tid + '), ankh '
            + imgs.angel.tid + ' (ankh ' + ankh.tid + ')')
        if (imgs.bolt.tid == bolt.tid && imgs.angel.tid == ankh.tid) {
            __log_marker('advisor_ankh_and_bolt_images')
        }
    }

    __test_god_set_state(GOD_OSIRIS, 50, 0)
    __test_god_set_state(GOD_BAST, 50, 0)
    __display_options_set_scale(saved_scale)
    __test_signal_ready()
}

function check_valid() {
    if (!__test_find_inlog('[test-marker] god_message_keeps_layout')) {
        return false
    }
    if (__test_find_inlog('[test-marker] art_checks_skipped')) {
        return true
    }
    return __test_find_inlog('[test-marker] god_portrait_drawn')
        && __test_find_inlog('[test-marker] advisor_ankh_and_bolt_images')
}
