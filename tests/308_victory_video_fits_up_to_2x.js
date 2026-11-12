// The period and end-of-campaign videos are 560x333 and were drawn at that size in the middle of
// the screen, small on a large one. They are now drawn as large as fits, up to 2x, centered and
// keeping their shape; on a screen smaller than the video they shrink to fit.
// Markers:
//   [test-marker] large_screen_draws_2x
//   [test-marker] mid_screen_fits_width
//   [test-marker] small_screen_shrinks_to_fit

function t308_rect(sw, sh) {
    var r = '' + __test_victory_video_rect(sw, sh, 560, 333)
    __log_info_native('[test:308] ' + sw + 'x' + sh + ' -> ' + r)
    return r
}

function run_test() {
    if (t308_rect(1420, 999) == '150,166,1120,666') {
        __log_marker('large_screen_draws_2x')
    }
    if (t308_rect(1000, 800) == '0,102,1000,595') {
        __log_marker('mid_screen_fits_width')
    }
    if (t308_rect(400, 300) == '0,31,400,238') {
        __log_marker('small_screen_shrinks_to_fit')
    }
    __test_signal_ready()
}

function check_valid() {
    var markers = ['large_screen_draws_2x', 'mid_screen_fits_width', 'small_screen_shrinks_to_fit']
    for (var i = 0; i < markers.length; i++) {
        if (!__test_find_inlog('[test-marker] ' + markers[i])) {
            return false
        }
    }
    return true
}
