log_info("akhenaten: ui top menu bar started")

function top_menu_format_date(year, month) {
	var month_str = month_name(month)
	if (year >= 0) {
		return game.locale_year_before_ad
			? fmt("${month} ${year} #AD", { month: month_str, year: year })
			: fmt("${month} #AD ${year}", { month: month_str, year: year })
	}
	return fmt("${month} ${year} #BC", { month: month_str, year: -year })
}

function top_menu_refresh_status_text() {
	top_menu_state.population_str = fmt("#top_menu_population ${value}", { value: city.population })
	top_menu_state.date_str = top_menu_format_date(game.simtime.year, game.simtime.month)
}

[es=event_level_post_load]
function top_menu_on_level_post_load(ev) {
	top_menu_clear_state()
	top_menu_refresh_status_text()
}

// The iPhone Duo's inner screen has curved corners that clip both ends of the menu bar, either way up.
function top_menu_edge_inset(short_side, is_ios) {
	return (is_ios && short_side >= top_menu_widget.unfolded_min_short_side) ? top_menu_widget.unfolded_edge_inset : 0
}

function top_menu_screen_short_side() {
	return Math.min(screen.width, screen.height)
}

// Portrait is too narrow for every menu on one row; menus marked portrait_hidden are left out.
function top_menu_header_visible(menu) {
	return !(menu.portrait_hidden && __screen_inner_unfolded() && __screen_portrait())
}

function top_menu_headers_x() {
	return top_menu_widget.offset.x + top_menu_edge_inset(top_menu_screen_short_side(), __platform_is_ios())
}

function top_menu_measure_headers_right() {
	var menus = top_menu_widget.menus
	if (!menus || menus.length == 0) {
		return top_menu_headers_x()
	}
	var cur_x = top_menu_headers_x()
	var spacing = top_menu_widget.spacing
	// The hovered header draws in YELLOW (bold in TTF fonts) — lay out for the wider glyphs.
	var font = !!game_features.gameui_highlight_top_menu_hover ? FONT_NORMAL_YELLOW : FONT_NORMAL_BLACK_ON_LIGHT
	for (var i = 0; i < menus.length; i++) {
		if (!top_menu_header_visible(menus[i])) {
			continue
		}
		var text = top_menu_resolve_text(menus[i].text)
		cur_x += top_menu_text_width(text, font) + spacing
	}
	return cur_x - spacing
}

function top_menu_update_status_shift() {
	var headers_right = top_menu_measure_headers_right()
	top_menu_state.headers_right = headers_right
	var gap = top_menu_widget.status_header_gap
	if (gap === undefined || gap === null) {
		gap = 16
	}
	var funds = top_menu_widget.status_funds
	top_menu_state.portrait_status = null
	if (!funds) {
		top_menu_state.status_shift = 0
		return 0
	}
	if (__screen_inner_unfolded() && __screen_portrait()) {
		top_menu_state.status_shift = 0
		top_menu_state.portrait_status = top_menu_portrait_status_layout(screen.width,
			top_menu_edge_inset(top_menu_screen_short_side(), __platform_is_ios()), headers_right + gap, top_menu_status_widths(),
			top_menu_widget.portrait_status_gap,
			top_menu_rotate_buttons_width())
		return 0
	}
	top_menu_state.status_shift = top_menu_status_shift_for(screen.width, top_menu_screen_short_side(), __platform_is_ios(), headers_right + gap,
		Math.round(funds.right * top_menu_scale()))
	return top_menu_state.status_shift
}

// Negative pulls the status fields in from the screen edge; positive pushes them right, clear of the headers.
function top_menu_status_shift_for(width, short_side, is_ios, need, funds_right) {
	var funds_x = width + funds_right
	var inset = top_menu_edge_inset(short_side, is_ios)
	return funds_x - inset >= need ? -inset : need - funds_x
}

function top_menu_funds_text() {
	return fmt("#top_menu_funds ${treasury}", { treasury: city.finance.treasury })
}

function top_menu_status_widths() {
	return {
		funds: top_menu_text_width(top_menu_funds_text(), FONT_NORMAL_BLACK_ON_LIGHT),
		pop: top_menu_text_width(top_menu_state.population_str, FONT_NORMAL_BLACK_ON_LIGHT),
		date: top_menu_text_width(top_menu_state.date_str, FONT_NORMAL_BLACK_ON_LIGHT)
	}
}

function top_menu_rotate_buttons_width() {
	var w = top_menu_widget
	return Math.round((w.status_rot_r.right + w.status_rot_r.w - w.status_rot_l.right) * top_menu_scale())
}

// Portrait: the status fields don't fit at their landscape offsets from the right edge, so they are
// packed by their text widths against the right inset (funds, population, rotate buttons, date),
// and pushed right past the headers if even that is too wide.
function top_menu_portrait_status_layout(width, inset, need, widths, gap, rot_w) {
	var date = width - inset - widths.date
	var rot = date - gap - rot_w
	var pop = rot - gap - widths.pop
	var funds = pop - gap - widths.funds
	var push = funds < need ? need - funds : 0
	return { funds: funds + push, pop: pop + push, rot: rot + push, date: date + push, widths: widths }
}

function top_menu_draw_background() {
	var block_img = get_image(top_menu_widget.background)
	if (!block_img) {
		return
	}

	var scale = top_menu_scale()
	var want_sidebar_offset = top_menu_widget.sidebar_offset
	var block_width = block_img.width
	var screen_width = screen.width
	var current_sidebar_offset = ui.sidebar.offset_x

	var step = Math.round((block_width - want_sidebar_offset) * scale)
	if (step <= 0) {
		return
	}

	function draw_block(x) {
		if (scale == 1) {
			ui.draw_texture({ x: x, y: 0 }, block_img.tid)
		} else {
			__ui_draw_image_scaled(block_img.tid, { x: x, y: 0 }, scale)
		}
	}

	for (var x = -(screen_width - current_sidebar_offset); x < screen_width; x += step) {
		draw_block(x)
	}

	draw_block(current_sidebar_offset - step)

	var rot = top_menu_widget.rotate_img
	if (!rot) {
		return
	}
	var rotate_img = get_image({ pack: rot.pack, id: rot.id, offset: rot.offset + top_menu_state.rotate_hover })
	if (!rotate_img) {
		return
	}
	var portrait = top_menu_state.portrait_status
	var rotate_x = portrait
		? portrait.rot + Math.round((top_menu_widget.rotate_x - top_menu_widget.status_rot_l.right) * scale)
		: screen.width + Math.round(top_menu_widget.rotate_x * scale) + top_menu_state.status_shift
	var rotate_pos = { x: rotate_x, y: 0 }
	if (scale == 1) {
		ui.draw_texture(rotate_pos, rotate_img.tid)
	} else {
		__ui_draw_image_scaled(rotate_img.tid, rotate_pos, scale)
	}
}

function top_menu_draw_headers() {
	var menus = top_menu_widget.menus
	if (!menus) {
		return
	}

	var cur_x = top_menu_headers_x()
	var cur_y = Math.round(top_menu_widget.offset.y * top_menu_scale())
	var spacing = top_menu_widget.spacing
	var highlight = !!game_features.gameui_highlight_top_menu_hover
	var hover_font = highlight ? FONT_NORMAL_YELLOW : FONT_NORMAL_BLACK_ON_LIGHT
	var mx = __mouse.x
	var my = __mouse.y
	var is_mobile = __platform_is_android() || __mouse.is_touch
	var y0 = 0
	var hit_h = is_mobile ? (__top_menu_height() + 10) : __top_menu_height()
	var in_bar = (my >= y0 && my < y0 + hit_h)
	var focus_id = ""
	if (top_menu_state.open_sub_menu) {
		focus_id = top_menu_state.open_sub_menu
	}

	var padding_x = is_mobile ? 12 : 6
	for (var i = 0; i < menus.length; i++) {
		var menu = menus[i]
		if (!top_menu_header_visible(menu)) {
			continue
		}
		var text = top_menu_resolve_text(menu.text)
		var width = top_menu_text_width(text, hover_font)
		var x_start = cur_x
		var x_end = cur_x + width
		top_menu_set_header_layout(menu.id, x_start, x_end)

		var is_hovered
		if (focus_id) {
			is_hovered = (menu.id == focus_id)
		} else {
			is_hovered = in_bar && (x_start - padding_x) <= mx && (x_end + padding_x) > mx
			if (is_hovered) {
				focus_id = menu.id
			}
		}

		var font = (is_hovered && highlight) ? FONT_NORMAL_YELLOW : FONT_NORMAL_BLACK_ON_LIGHT
		top_menu_label(text, { x: cur_x, y: cur_y }, font)

		if (is_hovered && menu.tooltip && !top_menu_state.open_sub_menu) {
			ui.set_tooltip(top_menu_resolve_text(menu.tooltip))
		}

		cur_x += width + spacing
	}

	top_menu_state.headers_right = cur_x - spacing

	if (!top_menu_state.open_sub_menu) {
		top_menu_state.focus_menu_id = focus_id
	}
}

function top_menu_status_rect(cfg) {
	var scale = top_menu_scale()
	return {
		x: screen.width + Math.round(cfg.right * scale) + top_menu_state.status_shift,
		y: Math.round(top_menu_widget.offset.y * scale),
		w: Math.round(cfg.w * scale),
		h: Math.round(cfg.h * scale)
	}
}

function top_menu_status_rects() {
	var w = top_menu_widget
	var p = top_menu_state.portrait_status
	if (p) {
		var scale = top_menu_scale()
		var y = Math.round(w.offset.y * scale)
		var h = Math.round(w.status_date.h * scale)
		function rot_rect(cfg) {
			return { x: p.rot + Math.round((cfg.right - w.status_rot_l.right) * scale), y: y, w: Math.round(cfg.w * scale), h: Math.round(cfg.h * scale) }
		}
		return {
			date: { x: p.date, y: y, w: p.widths.date, h: h },
			pop: { x: p.pop, y: y, w: p.widths.pop, h: h },
			funds: { x: p.funds, y: y, w: p.widths.funds, h: h },
			rot_l: rot_rect(w.status_rot_l),
			rot_m: rot_rect(w.status_rot_m),
			rot_r: rot_rect(w.status_rot_r)
		}
	}
	return {
		date: top_menu_status_rect(w.status_date),
		pop: top_menu_status_rect(w.status_pop),
		funds: top_menu_status_rect(w.status_funds),
		rot_l: top_menu_status_rect(w.status_rot_l),
		rot_m: top_menu_status_rect(w.status_rot_m),
		rot_r: top_menu_status_rect(w.status_rot_r)
	}
}

function top_menu_point_in(mx, my, r) {
	return mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h
}

function top_menu_draw_status() {
	var treasury = city.finance.treasury
	var funds_font = treasury >= 0 ? FONT_NORMAL_BLACK_ON_LIGHT : FONT_NORMAL_YELLOW
	var funds_text = top_menu_funds_text()
	var r = top_menu_status_rects()
	var mx = __mouse.x
	var my = __mouse.y

	top_menu_state.rotate_hover = 0
	if (top_menu_point_in(mx, my, r.rot_l)) {
		top_menu_state.rotate_hover = 2
	} else if (top_menu_point_in(mx, my, r.rot_m)) {
		top_menu_state.rotate_hover = 1
	} else if (top_menu_point_in(mx, my, r.rot_r)) {
		top_menu_state.rotate_hover = 3
	}

	if (top_menu_point_in(mx, my, r.date)) {
		ui.set_tooltip(__loc("#top_menu_date_tooltip"))
	} else if (top_menu_point_in(mx, my, r.pop)) {
		ui.set_tooltip(__loc("#top_menu_population_tooltip"))
	} else if (top_menu_point_in(mx, my, r.funds)) {
		ui.set_tooltip(__loc("#top_menu_funds_tooltip"))
	}

	top_menu_label(top_menu_state.date_str, { x: r.date.x, y: r.date.y }, FONT_NORMAL_BLACK_ON_LIGHT)
	top_menu_label(top_menu_state.population_str, { x: r.pop.x, y: r.pop.y }, FONT_NORMAL_BLACK_ON_LIGHT)
	top_menu_label(funds_text, { x: r.funds.x, y: r.funds.y }, funds_font)
}

// Touch screens have no Pause key within reach, so tapping the date pauses and resumes.
function top_menu_date_tap_pauses() {
	return __platform_is_ios() || __platform_is_android()
}

function top_menu_handle_status() {
	var r = top_menu_status_rects()
	var mx = __mouse.x
	var my = __mouse.y

	if (top_menu_point_in(mx, my, r.rot_l) && __mouse.left.went_up) {
		emit event_rotate_map{ value: HOTKEY_ROTATE_MAP_LEFT }
		return 1
	}
	if (top_menu_point_in(mx, my, r.rot_m) && __mouse.left.went_up) {
		emit event_rotate_map_reset{ value: 0 }
		return 1
	}
	if (top_menu_point_in(mx, my, r.rot_r) && __mouse.left.went_up) {
		emit event_rotate_map{ value: HOTKEY_ROTATE_MAP_RIGHT }
		return 1
	}
	if (top_menu_point_in(mx, my, r.date) && __mouse.right.went_up) {
		top_menu_date_explanation()
		return 1
	}
	if (top_menu_point_in(mx, my, r.date) && __mouse.left.went_up && top_menu_date_tap_pauses()) {
		emit event_toggle_pause{ value: 0 }
		return 1
	}
	if (top_menu_point_in(mx, my, r.pop) && __mouse.right.went_up) {
		top_menu_population_explanation()
		return 1
	}
	if (top_menu_point_in(mx, my, r.funds) && __mouse.right.went_up) {
		top_menu_funds_explanation()
		return 1
	}
	return 0
}

[es=top_menu_draw]
function top_menu_draw(ev) {
	if (top_menu_state.open_sub_menu && !ui.window_is("top_menu_submenu")) {
		top_menu_clear_state()
	}
	top_menu_update_status_shift()
	top_menu_draw_background()
	top_menu_draw_headers()
	top_menu_draw_status()
}

function top_menu_handle_input() {
	if (__screen_city.capture_input) {
		return 0
	}

	if (top_menu_handle_status()) {
		return 1
	}

	var menu_id = top_menu_header_at_mouse()
	top_menu_state.focus_menu_id = menu_id
	if (menu_id && __mouse.left.went_up) {
		top_menu_open_submenu(menu_id)
		return 1
	}
	return 0
}

[es=top_menu_handle_input]
function top_menu_handle_input_es(ev) {
	top_menu_handle_input()
}

[es=event_population_changed]
function top_menu_update_population_text(ev) {
	top_menu_state.population_str = fmt("#top_menu_population ${value}", { value: ev.value })
}

[es=event_advance_day]
function top_menu_update_date_text(ev) {
	top_menu_state.date_str = top_menu_format_date(ev.year, ev.month)
}
