// The menu bar moves in from both ends on the iPhone Duo's inner screen, clear of its curved
// corners, in landscape and portrait (the inner screen is told by its short side). The folded screen
// and other platforms keep the original positions.
// Markers:
//   [test-marker] top_menu_inset_ok
//   [test-marker] top_menu_status_inset_ok

function run_test() {
    var unfolded = top_menu_edge_inset(999, true)
    var folded = top_menu_edge_inset(466, true)
    var desktop = top_menu_edge_inset(999, false)
    __log_info_native('[test:293] unfolded=' + unfolded + ' folded=' + folded + ' desktop=' + desktop
        + ' headers_x=' + top_menu_headers_x())
    if (unfolded == 80 && folded == 0 && desktop == 0 && top_menu_headers_x() == top_menu_widget.offset.x) {
        __log_marker('top_menu_inset_ok')
    }

    var funds_right = top_menu_widget.status_funds.right
    var s_unfolded = top_menu_status_shift_for(1420, 999, true, 450, funds_right)
    var s_folded = top_menu_status_shift_for(699, 466, true, 416, funds_right)
    var s_desktop = top_menu_status_shift_for(1420, 999, false, 450, funds_right)
    var s_tight = top_menu_status_shift_for(1000, 999, true, 600, funds_right)
    __log_info_native('[test:293] shift unfolded=' + s_unfolded + ' folded=' + s_folded + ' desktop=' + s_desktop
        + ' tight=' + s_tight)
    if (s_unfolded == -80 && s_folded == 416 - (699 + funds_right) && s_desktop == 0 && s_tight == 600 - (1000 + funds_right)) {
        __log_marker('top_menu_status_inset_ok')
    }
    __test_signal_ready()
}

function check_valid() {
    return __test_find_inlog('[test-marker] top_menu_inset_ok')
        && __test_find_inlog('[test-marker] top_menu_status_inset_ok')
}
