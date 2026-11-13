// On the iPhone Duo's inner screen every beaded strip is drawn at 1x. The strip under the top menu is the
// bottom of the bar's image, which the taller bar scaled 1.67x; the collapsed control panel is drawn 2x,
// so its own strip down its left side doubled. Both are now redrawn at 1x: the side strip must match
// the desktop's art pixel for pixel, and the top strip must show no rows repeated by scaling. The
// collapsed panel's city view takes the 7 pixels its thicker strip used. The pixel checks need the
// Pharaoh art; without it they report themselves skipped.
// Markers:
//   [test-marker] strips_skipped
//   [test-marker] top_strip_1x
//   [test-marker] collapsed_strip_1x
//   [test-marker] collapsed_city_takes_strip

var T321_STRIP_WIDTH = 7
// The bar image's beaded strip: its bottom 8 rows.
var T321_TOP_STRIP_ROWS = 8

// The strip rows (bottom of the bar), each as an array of pixels from x0 for n pixels.
function t321_top_strip(x0, n) {
    var strip = T321_TOP_STRIP_ROWS
    var bottom = __top_menu_height()
    var rows = []
    for (var y = bottom - strip; y < bottom; y++) {
        var row = []
        for (var x = x0; x < x0 + n; x++) {
            row.push(__test_screen_pixel(x, y))
        }
        rows.push(row)
    }
    return rows
}

// Adjacent rows that are identical, summed over the block's columns. A strip scaled up repeats source
// rows (1.67x: about three repeats in its bottom 8 rows per column); drawn at 1x it has almost none.
function t321_repeated_rows(rows) {
    var repeats = 0
    for (var r = 1; r < rows.length; r++) {
        for (var k = 0; k < rows[r].length; k++) {
            if (rows[r][k] == rows[r - 1][k]) {
                repeats++
            }
        }
    }
    return repeats
}

function t321_side_strip(left, top) {
    var out = []
    for (var r = 0; r < 16; r++) {
        for (var i = 0; i < T321_STRIP_WIDTH; i++) {
            out.push(__test_screen_pixel(left + i, top + r))
        }
    }
    return out
}

function t321_same(a, b) {
    return a.length == b.length && a.join(',') == b.join(',')
}

function t321_varied(a) {
    for (var i = 1; i < a.length; i++) {
        if (a[i] != a[0]) {
            return true
        }
    }
    return false
}

function run_test() {
    test_reload_city_session('data/default.map')
    var saved_scale = __display_options_get_scale()
    var img = get_image(top_menu_widget.background)

    // At 100% the canvas is the window, so __test_screen_pixel reads canvas pixels on the desktop too.
    __display_options_set_scale(100)
    __test_screen_resize(800, 600)
    __camera_sidebar_collapsed(0)
    __test_pump_frames(4)
    var desk_top = t321_top_strip(0, 24)
    __camera_sidebar_collapsed(1)
    __test_pump_frames(4)
    // Desktop: the relief art starts SIDEBAR_MAIN_SECTION_HEIGHT (450) below the panel's top, at 1x.
    var desk_side = t321_side_strip(__ui_widget_sidebar_city_offset_x(), 450 + __top_menu_height())

    __test_pretend_ios(true)
    __display_options_set_scale(67)
    __test_screen_resize(951, 669)
    __camera_sidebar_collapsed(0)
    __test_pump_frames(4)
    var inner_top = t321_top_strip(Math.floor(screen.width / 2), 24)
    __camera_sidebar_collapsed(1)
    __test_pump_frames(4)
    var left = __ui_widget_sidebar_city_offset_x()
    var inner_side = t321_side_strip(left, __top_menu_height())
    var panel = __test_window_pos('sidebar_window_collapsed')
    var view = __test_viewport_width()
    var inner = __screen_inner_unfolded()

    var top_repeats = t321_repeated_rows(inner_top)
    __log_info_native('[test:321] inner=' + inner + ' panel x ' + panel.x + ' city ' + left + ' view ' + view
        + ' top strip repeated rows ' + top_repeats + ' (desktop ' + t321_repeated_rows(desk_top) + ')')
    if (inner && left == 2 * panel.x + T321_STRIP_WIDTH && view == left) {
        __log_marker('collapsed_city_takes_strip')
    }
    if (!img || !t321_varied(desk_top[desk_top.length - 3]) || !t321_varied(desk_side)) {
        __log_marker('strips_skipped')
    } else {
        if (inner && top_repeats < inner_top[0].length) {
            __log_marker('top_strip_1x')
        }
        if (inner && t321_same(desk_side, inner_side)) {
            __log_marker('collapsed_strip_1x')
        }
    }

    __test_ios_screen_reset()
    __test_pretend_ios(false)
    __display_options_set_scale(saved_scale)
    __test_screen_resize(800, 600)
    __camera_sidebar_collapsed(0)
    __test_pump_frames(3)
    __test_signal_ready()
}

function check_valid() {
    if (!__test_find_inlog('[test-marker] collapsed_city_takes_strip')) {
        return false
    }
    if (__test_find_inlog('[test-marker] strips_skipped')) {
        return true
    }
    return __test_find_inlog('[test-marker] top_strip_1x') && __test_find_inlog('[test-marker] collapsed_strip_1x')
}
