// The iPhone Duo's inner screen draws the game at 67%, so at the same city zoom buildings looked a third
// smaller than on the folded screen. Each screen now keeps its own city zoom: the inner screen starts
// at 150% (buildings at the folded size), a pinch is kept for that screen across folding, turning and
// loading a city, and off the Duo a city still starts at 100%.
// Markers:
//   [test-marker] desktop_city_at_100
//   [test-marker] unfold_zooms_in
//   [test-marker] fold_restores_folded_zoom
//   [test-marker] unfold_restores_pinch
//   [test-marker] portrait_keeps_inner_zoom
//   [test-marker] load_keeps_screen_zoom

var T322_FOLDED = [852, 393]
var T322_INNER = [951, 669]
var T322_INNER_PORTRAIT = [669, 951]

function t322_window(size) {
    __test_ios_screen_window(size[0], size[1])
    __test_pump_frames(2)
    return __zoom_target()
}

function run_test() {
    var zoom_prev = game_features.get('gameui_zoom') === true
    game_features.set('gameui_zoom', true)
    __test_ios_screen_reset()
    test_reload_city_session('data/default.map')
    __test_pump_frames(2)
    var desktop = __zoom_target()

    var folded = t322_window(T322_FOLDED)
    var unfolded = t322_window(T322_INNER)
    __zoom_set(175)
    __test_pump_frames(2)
    var folded_again = t322_window(T322_FOLDED)
    var unfolded_again = t322_window(T322_INNER)
    var portrait = t322_window(T322_INNER_PORTRAIT)
    test_reload_city_session('data/default.map')
    __test_pump_frames(2)
    var loaded = __zoom_target()

    __log_info_native('[test:322] desktop ' + desktop + ' folded ' + folded + ' unfolded ' + unfolded
        + ' pinched 175, folded ' + folded_again + ' unfolded ' + unfolded_again + ' portrait ' + portrait
        + ' after a load ' + loaded)
    if (desktop == 100 && folded == 100) {
        __log_marker('desktop_city_at_100')
    }
    if (unfolded == 150) {
        __log_marker('unfold_zooms_in')
    }
    if (folded_again == 100) {
        __log_marker('fold_restores_folded_zoom')
    }
    if (unfolded_again == 175) {
        __log_marker('unfold_restores_pinch')
    }
    if (portrait == 175) {
        __log_marker('portrait_keeps_inner_zoom')
    }
    if (loaded == 175) {
        __log_marker('load_keeps_screen_zoom')
    }

    __test_ios_screen_reset()
    game_features.set('gameui_zoom', zoom_prev)
    test_reload_city_session('data/default.map')
    __test_pump_frames(2)
    __test_signal_ready()
}

function check_valid() {
    var markers = ['desktop_city_at_100', 'unfold_zooms_in', 'fold_restores_folded_zoom', 'unfold_restores_pinch',
        'portrait_keeps_inner_zoom', 'load_keeps_screen_zoom']
    for (var i = 0; i < markers.length; i++) {
        if (!__test_find_inlog('[test-marker] ' + markers[i])) {
            return false
        }
    }
    return true
}
