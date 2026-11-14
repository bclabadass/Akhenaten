// A company's orders (its formations and Return to fort) open on a right-click on one of its soldiers. A
// touch screen has no right-click, and a tap on a fort or its flag only selected the company to move, so
// on a phone the formations could not be reached. A tap on the fort itself now opens the orders; a tap on
// the parade ground still selects the company to move, and while it is selected an Orders button (where
// the rotate button sits when placing) opens them too. A mouse click on the fort is unchanged.
// Markers:
//   [test-marker] fort_tap_opens_orders
//   [test-marker] orders_formation_tap_changes_layout
//   [test-marker] ground_tap_selects_company
//   [test-marker] orders_button_opens_orders
//   [test-marker] mouse_click_on_fort_selects_company

var T330_MOP_UP = 6

// A screen point on the tile: scan the view and map each point back to a tile.
function t330_tile_center(x, y) {
    var sum_x = 0
    var sum_y = 0
    var n = 0
    for (var py = 40; py < screen.height - 40; py += 3) {
        for (var px = 10; px < screen.width - 200; px += 6) {
            var st = __pixel_to_screentile({ x: px, y: py })
            if (st.x == -1 || st.y == -1) {
                continue
            }
            var t = __screen_to_tile(st)
            if (t.x == x && t.y == y) {
                sum_x += px
                sum_y += py
                n++
            }
        }
    }
    return n ? { x: (sum_x / n) | 0, y: (sum_y / n) | 0 } : null
}

function t330_tap(p) {
    __test_touch_down(1, p.x, p.y)
    __test_pump_frames(2)
    __test_touch_up(1, p.x, p.y)
    __test_pump_frames(6)
}

function t330_back_to_city() {
    ui.window_city_show()
    __test_pump_frames(3)
}

function t330_place(type) {
    if (!__scenario_building_allowed(type)) {
        __scenario_building_allow(type, true)
    }
    var bid = test_building_place(type, -1, -1)
    test_planner_exit_build_mode()
    return bid
}

function run_test() {
    test_reload_city_session('data/default.map')
    __test_set_treasury(100000)
    __scenario_building_allow(BUILDING_FORT_GROUND, true)
    var fort = t330_place(BUILDING_FORT_ARCHERS)
    var recruiter = t330_place(BUILDING_RECRUITER)
    if (!fort || !recruiter) {
        __log_info_native('[test:330] place failed fort ' + fort + ' recruiter ' + recruiter)
        __test_signal_ready()
        return
    }
    __test_fort_update_recruit_status(fort)
    for (var i = 0; i < 3; i++) {
        __test_recruiter_create_soldier(recruiter)
    }
    var fid = city.get_building(fort).formation_id
    var form = city.get_formation(fid)
    var ground = city.get_building(fort).next_part_building_id
    var ft = __building_tile(fort)
    var gt = __building_tile(ground)
    __test_camera_center_building(fort)
    __test_pump_frames(3)

    var fort_tile = { x: ft.x + 1, y: ft.y + 1 }
    var ground_tile = { x: gt.x + 1, y: gt.y + 1 }
    var fort_point = t330_tile_center(fort_tile.x, fort_tile.y)
    var ground_point = t330_tile_center(ground_tile.x, ground_tile.y)
    __log_info_native('[test:330] fort ' + fort + ' at ' + JSON.stringify(fort_tile) + ' (building there '
        + __building_at(fort_tile.x, fort_tile.y) + ', point ' + JSON.stringify(fort_point) + '), ground ' + ground
        + ' at ' + JSON.stringify(ground_tile) + ' (building there ' + __building_at(ground_tile.x, ground_tile.y)
        + '), soldiers ' + form.num_figures + ', layout ' + form.layout)
    if (!fort_point || !ground_point || form.num_figures <= 0) {
        __test_signal_ready()
        return
    }

    t330_tap(fort_point)
    var window_id = __game_window_get_id()
    var section = __test_info_window_section()
    __log_info_native('[test:330] fort tap: window ' + window_id + ', panel ' + section)
    if (window_id == 'window_building_info' && section == 'batalion_info_window') {
        __log_marker('fort_tap_opens_orders')

        var button = __test_info_ui_screen_pos('formation_5')
        var size = __test_window_element_size('batalion_info_window', 'formation_5')
        t330_tap({ x: button.x + ((size.x / 2) | 0), y: button.y + ((size.y / 2) | 0) })
        form = city.get_formation(fid)
        __log_info_native('[test:330] formation tap at ' + JSON.stringify(button) + ': layout ' + form.layout
            + ', window ' + __game_window_get_id())
        if (form.layout == T330_MOP_UP) {
            __log_marker('orders_formation_tap_changes_layout')
        }
    }
    t330_back_to_city()

    t330_tap(ground_point)
    window_id = __game_window_get_id()
    __log_info_native('[test:330] ground tap at ' + JSON.stringify(ground_point) + ': window ' + window_id + ', panel '
        + __test_info_window_section() + ', bid ' + __test_info_ui_text('title') + ' ' + JSON.stringify(__test_info_offset()))
    if (window_id == 'window_city_military') {
        __log_marker('ground_tap_selects_company')

        var button_point = __test_company_orders_button_pos()
        t330_tap(button_point)
        window_id = __game_window_get_id()
        section = __test_info_window_section()
        __log_info_native('[test:330] orders button at ' + JSON.stringify(button_point) + ': window ' + window_id
            + ', panel ' + section)
        if (window_id == 'window_building_info' && section == 'batalion_info_window') {
            __log_marker('orders_button_opens_orders')
        }
    }
    t330_back_to_city()

    __test_mouse_click(fort_point.x, fort_point.y)
    __test_pump_frames(4)
    window_id = __game_window_get_id()
    __log_info_native('[test:330] mouse click on fort: window ' + window_id)
    if (window_id == 'window_city_military') {
        __log_marker('mouse_click_on_fort_selects_company')
    }
    t330_back_to_city()

    test_reload_city_session('data/default.map')
    __test_signal_ready()
}

function check_valid() {
    var markers = ['fort_tap_opens_orders', 'orders_formation_tap_changes_layout', 'ground_tap_selects_company',
        'orders_button_opens_orders', 'mouse_click_on_fort_selects_company']
    for (var i = 0; i < markers.length; i++) {
        if (!__test_find_inlog('[test-marker] ' + markers[i])) {
            return false
        }
    }
    return true
}
