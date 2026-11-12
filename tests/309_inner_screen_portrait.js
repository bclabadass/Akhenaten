// The iPhone Duo's inner screen held upright: a 669x951 window, canvas 999x1420 at 67%.
// - Which screen the window is on comes from its size in points: turning the inner screen collapses
//   the sidebar, turning back restores it as it was, and only crossing to or from the folded screen
//   changes the display scale. The folded screen is landscape only: leaving portrait, only the preferred
//   landscape (the phone's right side at the bottom) is allowed until the window is landscape, and a
//   launch held upright sets the folded scale again once it is.
// - The inner screen is told by the canvas's short side, so portrait keeps the larger top menu and pop-ups.
// - The top menu stays on one row: Debug and Render are left out, and the status fields are packed by
//   their widths against the right inset.
// - Fixed-size pop-ups too wide for portrait at 1.5x (inner_screen.portrait_fit) are drawn just small
//   enough to fit; the rest keep 1.5x, and landscape is unchanged.
// Markers:
//   [test-marker] screens_told_apart
//   [test-marker] sidebar_follows_orientation
//   [test-marker] folded_prefers_landscape_left
//   [test-marker] portrait_is_inner_screen
//   [test-marker] portrait_menu_one_row
//   [test-marker] portrait_status_packed
//   [test-marker] portrait_popups_fit
//   [test-marker] landscape_popups_unchanged

var T309_FOLDED = 0
var T309_LANDSCAPE = 1
var T309_PORTRAIT = 2

function t309_window(w, h) {
    var p = ('' + __test_ios_screen_window(w, h)).split(',')
    return { screen: +p[0], scale: +p[1], collapsed: +p[2], hint: p[3] }
}

function t309_near(a, b) {
    return Math.abs(a - b) < 0.001
}

function run_test() {
    test_reload_city_session('data/default.map')
    var saved_scale = __display_options_get_scale()
    __test_ios_screen_reset()

    // Folded 678x466, inner landscape 951x669, inner portrait 669x951 (points).
    var land = t309_window(951, 669)
    __camera_sidebar_collapsed(0)
    var port = t309_window(669, 951)
    var back = t309_window(951, 669)
    __camera_sidebar_collapsed(1)
    var port2 = t309_window(669, 951)
    var back2 = t309_window(951, 669)
    var folded = t309_window(678, 466)
    var port3 = t309_window(669, 951)
    __log_info_native('[test:309] land ' + JSON.stringify(land) + ' port ' + JSON.stringify(port) + ' back ' + JSON.stringify(back)
        + ' back2 ' + JSON.stringify(back2) + ' folded ' + JSON.stringify(folded) + ' port3 ' + JSON.stringify(port3))
    if (land.screen == T309_LANDSCAPE && port.screen == T309_PORTRAIT && folded.screen == T309_FOLDED
        && land.scale == 67 && port.scale == 0 && back.scale == 0 && folded.scale == 100 && port3.scale == 67) {
        __log_marker('screens_told_apart')
    }
    if (port.collapsed == 1 && back.collapsed == 0 && port2.collapsed == 1 && back2.collapsed == 1
        && folded.collapsed == 1 && port3.collapsed == 1) {
        __log_marker('sidebar_follows_orientation')
    }
    __test_ios_screen_reset()

    var up = t309_window(466, 678)
    var turned = t309_window(678, 466)
    var again = t309_window(678, 466)
    var inner = t309_window(951, 669)
    __log_info_native('[test:309] folded up ' + JSON.stringify(up) + ' turned ' + JSON.stringify(turned) + ' again ' + JSON.stringify(again)
        + ' inner ' + JSON.stringify(inner))
    if (up.hint == 'LandscapeLeft' && turned.hint == 'LandscapeLeft LandscapeRight' && inner.hint == 'LandscapeLeft LandscapeRight Portrait'
        && up.scale == 100 && turned.scale == 100 && again.scale == 0) {
        __log_marker('folded_prefers_landscape_left')
    }
    __test_ios_screen_reset()

    __test_pretend_ios(true)
    __display_options_set_scale(67)
    __test_screen_resize(669, 951)
    __test_pump_frames(4)
    __log_info_native('[test:309] canvas ' + screen.width + 'x' + screen.height + ' inner=' + __screen_inner_unfolded()
        + ' portrait=' + __screen_portrait() + ' bar=' + __top_menu_height())
    if (screen.width < screen.height && __screen_inner_unfolded() && __screen_portrait() && __top_menu_height() == 50) {
        __log_marker('portrait_is_inner_screen')
    }

    var hidden = []
    var menus = top_menu_widget.menus
    for (var i = 0; i < menus.length; i++) {
        if (!top_menu_header_visible(menus[i])) {
            hidden.push(menus[i].id)
        }
    }
    __log_info_native('[test:309] hidden menus ' + hidden.join(','))
    if (hidden.join(',') == 'debug,debug_render') {
        __log_marker('portrait_menu_one_row')
    }

    // Widths as measured on the Duo; the packed fields end at the inset and clear the headers.
    var fit = top_menu_portrait_status_layout(999, 80, 447, { funds: 114, pop: 91, date: 169 }, 8, 66)
    var tight = top_menu_portrait_status_layout(999, 80, 500, { funds: 114, pop: 91, date: 169 }, 8, 66)
    var p = top_menu_state.portrait_status
    var r = top_menu_status_rects()
    __log_info_native('[test:309] fit ' + JSON.stringify(fit) + ' tight funds ' + tight.funds + ' live ' + (p ? p.funds + '..' + (p.date + p.widths.date) : 'none'))
    if (fit.date + 169 == 919 && fit.funds == 455 && fit.pop == 577 && fit.rot == 676 && tight.funds == 500 && tight.date + 169 == 964
        && p && r.funds.x == p.funds && r.date.x == p.date && r.funds.x >= top_menu_state.headers_right) {
        __log_marker('portrait_status_packed')
    }

    var trade = __test_window_ui_scale_for('trade_prices_window')
    var scen = __test_window_ui_scale_for('window_scenario_selection')
    var chief = __test_window_ui_scale_for('advisor_chief_window')
    __log_info_native('[test:309] portrait scales trade ' + trade + ' scenario ' + scen + ' chief ' + chief)
    if (t309_near(trade, 999 / 896) && t309_near(scen, 999 / 1024) && chief == 1.5) {
        __log_marker('portrait_popups_fit')
    }

    __test_screen_resize(951, 669)
    __test_pump_frames(4)
    var l_trade = __test_window_ui_scale_for('trade_prices_window')
    var l_scen = __test_window_ui_scale_for('window_scenario_selection')
    __log_info_native('[test:309] landscape ' + screen.width + 'x' + screen.height + ' trade ' + l_trade + ' scenario ' + l_scen
        + ' portrait_status ' + top_menu_state.portrait_status)
    if (!__screen_portrait() && l_trade == 1.5 && l_scen == 1.5 && top_menu_state.portrait_status === null) {
        __log_marker('landscape_popups_unchanged')
    }

    __test_ios_screen_reset()
    __test_pretend_ios(false)
    __display_options_set_scale(saved_scale)
    __camera_sidebar_collapsed(0)
    __test_pump_frames(3)
    __test_signal_ready()
}

function check_valid() {
    var markers = ['screens_told_apart', 'sidebar_follows_orientation', 'folded_prefers_landscape_left', 'portrait_is_inner_screen', 'portrait_menu_one_row',
        'portrait_status_packed', 'portrait_popups_fit', 'landscape_popups_unchanged']
    for (var i = 0; i < markers.length; i++) {
        if (!__test_find_inlog('[test-marker] ' + markers[i])) {
            return false
        }
    }
    return true
}
