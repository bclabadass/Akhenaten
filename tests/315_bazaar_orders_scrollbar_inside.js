// The bazaar's special orders list draws its scroll bar right after the list. At 27 blocks wide in a 29-block window
// the bar sat on the window's border, half outside it (desktop and the Duo alike); the list is now 25 blocks wide.
// Markers:
//   [test-marker] bazaar_scrollbar_inside_frame
//   [test-marker] bazaar_row_icons_inside_list

var T315_SCROLLBAR_WIDTH = 32
var T315_FRAME = 16

function run_test() {
    __game_load_mission(3)
    __test_pump_frames(5)
    var bid = __test_building_create(BUILDING_BAZAAR, -1, -1)
    __test_show_tile_info(bid)
    __test_pump_frames(4)
    emit event_show_window{ id: "bazaar_orders_window" }
    __test_pump_frames(4)

    var list_pos = __test_window_element_pos('bazaar_orders_window', 'goods_list')
    var list_size = __test_window_element_size('bazaar_orders_window', 'goods_list')
    var frame_size = __test_window_element_size('bazaar_orders_window', 'background')
    var list_w = list_size.x < 100 ? list_size.x * 16 : list_size.x
    var frame_w = frame_size.x < 100 ? frame_size.x * 16 : frame_size.x
    var bar_right = list_pos.x + list_w + T315_SCROLLBAR_WIDTH
    __log_info_native('[test:315] window ' + __game_window_get_id() + ' list ' + JSON.stringify(list_pos) + ' ' + JSON.stringify(list_size)
        + ' frame ' + JSON.stringify(frame_size) + ' bar_right ' + bar_right + ' frame_inner ' + (frame_w - T315_FRAME))
    if (__game_window_get_id() == 'bazaar_orders_window' && bar_right <= frame_w - T315_FRAME) {
        __log_marker('bazaar_scrollbar_inside_frame')
    }

    // Both goods icons of a row stay inside the row: the second used to sit at a fixed x past the narrower list.
    var icons = []
    var real_icon = ui.resource_icon
    var real_icon_flags = ui.resource_icon_flags
    ui.resource_icon = function(pos, res) { icons.push(pos[0]) }
    ui.resource_icon_flags = function(pos, res, flags) { icons.push(pos[0]) }
    try {
        bazaar_orders_list_on_render_item({ x: 0, y: 0, sizex: list_w, sizey: 20, user_data: RESOURCE_GRAIN, hover: false })
    } finally {
        ui.resource_icon = real_icon
        ui.resource_icon_flags = real_icon_flags
    }
    var icon_w = 24
    __log_info_native('[test:315] row width ' + list_w + ' icons at ' + icons.join(','))
    if (icons.length == 2 && icons[0] >= 0 && icons[1] + icon_w <= list_w) {
        __log_marker('bazaar_row_icons_inside_list')
    }

    ui.window_city_show()
    __test_pump_frames(2)
    __test_signal_ready()
}

function check_valid() {
    return __test_find_inlog('[test-marker] bazaar_scrollbar_inside_frame') && __test_find_inlog('[test-marker] bazaar_row_icons_inside_list')
}
