// Overseer screens must follow the screen after it changes size (folding the iPhone Duo). Their
// button strip comes from a shared template (advisor_window_base) that the layout refresh never
// recalculated, so the strip stayed where the old screen size put it, half under the centred
// panel. The religion and population overseers are written `name = { ... }`, which the refresh
// did not recognise at all, so their panel stayed put too.
// Markers:
//   [test-marker] overseer_<window>_panel_<scale>
//   [test-marker] overseer_<window>_strip_<scale>

var T297_WINDOWS = ['advisor_religion_window', 'advisor_population_window', 'advisor_imperial_window']
var T297_SCALES = [100, 67]

function t297_check(scale) {
    var panel_x = ((screen.width - px(40)) / 2) | 0
    var panel_y = ((screen.height - px(30)) / 2) | 0
    var strip_x = ((screen.width - 640) / 2 + 406) | 0
    var strip_y = ((screen.height + 418) / 2) | 0
    for (var i = 0; i < T297_WINDOWS.length; i++) {
        var name = T297_WINDOWS[i]
        var panel = __test_window_element_pos(name, 'advisor_area')
        var strip = __test_window_element_pos(name, 'religion_btn')
        __log_info_native('[test:297] ' + name + ' scale ' + scale + ' canvas ' + screen.width + 'x' + screen.height
            + ' panel ' + panel.x + ',' + panel.y + ' want ' + panel_x + ',' + panel_y
            + ' strip ' + strip.x + ',' + strip.y + ' want ' + strip_x + ',' + strip_y)
        if (panel.x == panel_x && panel.y == panel_y) {
            __log_marker('overseer_' + name + '_panel_' + scale)
        }
        if (strip.x == strip_x && strip.y == strip_y) {
            __log_marker('overseer_' + name + '_strip_' + scale)
        }
    }
}

function run_test() {
    test_reload_city_session('data/default.map')
    var saved_scale = __display_options_get_scale()
    for (var i = 0; i < T297_SCALES.length; i++) {
        __display_options_set_scale(T297_SCALES[i])
        __test_pump_frames(3)
        t297_check(T297_SCALES[i])
    }
    __display_options_set_scale(saved_scale)
    __test_pump_frames(3)
    __test_signal_ready()
}

function check_valid() {
    for (var i = 0; i < T297_WINDOWS.length; i++) {
        for (var j = 0; j < T297_SCALES.length; j++) {
            var suffix = T297_WINDOWS[i] + '_' + '%s_' + T297_SCALES[j]
            if (!__test_find_inlog('[test-marker] overseer_' + suffix.replace('%s', 'panel'))
                || !__test_find_inlog('[test-marker] overseer_' + suffix.replace('%s', 'strip'))) {
                return false
            }
        }
    }
    return true
}
