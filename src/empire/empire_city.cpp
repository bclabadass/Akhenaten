#include "empire_city.h"
#include "empire/empire.h"
#include "empire_object.h"
#include "game/game_config.h"
#include "graphics/image.h"
#include "graphics/image_groups.h"
#include "io/gamefiles/lang.h"
#include "js/js_game.h"

#include <algorithm>

const e_empire_city_tokens_t ANK_CONFIG_ENUM(e_empire_city_tokens);
empire_city_options_t ANK_VARIABLE(empire_city_options);
empire_city_images_t ANK_VARIABLE(empire_city_images);

image_desc empire_city_images_t::for_type(e_empire_city type, bool expanded) const {
    image_desc desc;
    switch (type) {
    case EMPIRE_CITY_OURS:
        desc = (expanded && ours_expanded.valid()) ? ours_expanded : ours;
        break;
    case EMPIRE_CITY_PHARAOH_TRADING:
        desc = pharaoh_trading.valid() ? pharaoh_trading : pharaoh;
        break;
    case EMPIRE_CITY_PHARAOH:
        desc = pharaoh.valid() ? pharaoh : pharaoh_trading;
        break;
    case EMPIRE_CITY_EGYPTIAN_TRADING:
        desc = egyptian_trading;
        break;
    case EMPIRE_CITY_EGYPTIAN:
        desc = egyptian.valid() ? egyptian : egyptian_trading;
        break;
    case EMPIRE_CITY_FOREIGN_TRADING:
        desc = foreign_trading.valid() ? foreign_trading : egyptian_trading;
        break;
    case EMPIRE_CITY_FOREIGN:
        desc = foreign.valid() ? foreign : foreign_trading;
        if (!desc.valid()) {
            desc = egyptian_trading;
        }
        break;
    default:
        break;
    }

    if (!desc.valid()) {
        // Group 169 city block: frame 0 = empire_bits_00057 (ours), +6 egyptian trading.
        if (type == EMPIRE_CITY_OURS) {
            desc = image_desc::resolve("pharaoh_general/empire_bits_00057");
        } else if (type == EMPIRE_CITY_FOREIGN || type == EMPIRE_CITY_FOREIGN_TRADING) {
            desc = image_desc::resolve("pharaoh_general/empire_bits_00066");
        } else {
            desc = image_desc::resolve("pharaoh_general/empire_bits_00063");
        }
    }
    return desc;
}

int empire_city_images_t::image_id(e_empire_city type, bool expanded) const {
    image_desc desc = for_type(type, expanded);
    const int id = desc.tid();
    return id > 0 ? id : 0;
}

void empire_city::remove_trader(int figure_id) {
    for (int i = 0; i < 3; i++) {
        if (trader_figure_ids[i] == figure_id)
            trader_figure_ids[i] = 0;
    }
}

bool empire_city::can_trade() const {
    // Cannot trade if city is under siege
    if (months_under_siege > 0) {
        return false;
    }

    switch (type) {
        case EMPIRE_CITY_PHARAOH_TRADING:
        case EMPIRE_CITY_EGYPTIAN_TRADING:
        case EMPIRE_CITY_FOREIGN_TRADING:
        return true;
    }

    return false;
}

void empire_city::clear_trade_resources() {
    std::fill_n(sells_resource, RESOURCES_MAX, false);
    std::fill_n(buys_resource, RESOURCES_MAX, false);
}

void empire_city::set_trade_enabled(bool enabled) {
    if (enabled) {
        switch (type) {
        case EMPIRE_CITY_PHARAOH:
            type = EMPIRE_CITY_PHARAOH_TRADING;
            break;
        case EMPIRE_CITY_EGYPTIAN:
            type = EMPIRE_CITY_EGYPTIAN_TRADING;
            break;
        case EMPIRE_CITY_FOREIGN:
            type = EMPIRE_CITY_FOREIGN_TRADING;
            break;
        default:
            break;
        }
    } else {
        switch (type) {
        case EMPIRE_CITY_PHARAOH_TRADING:
            type = EMPIRE_CITY_PHARAOH;
            break;
        case EMPIRE_CITY_EGYPTIAN_TRADING:
            type = EMPIRE_CITY_EGYPTIAN;
            break;
        case EMPIRE_CITY_FOREIGN_TRADING:
            type = EMPIRE_CITY_FOREIGN;
            break;
        default:
            break;
        }
        clear_trade_resources();
    }

    if (full_empire_object *full = g_empire.ref_full_object(empire_object_id)) {
        full->city_type = type;
    }
}

bool empire_city::shows_as_trade_city_on_map() const {
    // Original draws every in-use empire city (trading and non-trading).
    // Trade UI stays gated by can_trade() / is_open — not by visibility.
    return in_use != 0;
}

bool empire_city::is_selectable_on_empire_map() const {
    return in_use != 0;
}

trade_route &empire_city::get_route() {
    return g_empire.get_route(route_id);
}

const trade_route &empire_city::get_route() const {
    return g_empire.get_route(route_id);
}

const empire_object *empire_city::get_empire_object() const {
    return g_empire.get_object(empire_object_id);
}

const full_empire_object *empire_city::get_full_empire_object() const {
    return g_empire.get_full_object(empire_object_id);
}

int empire_city::get_free_slot(int max_traders) const {
    for (int i = 0; i < max_traders; i++) {
        if (!trader_figure_ids[i]) {
            return i;
        }
    }
    return -1;
}

int empire_city::get_free_slot() const {
    return get_free_slot(max_traders);
}

void empire_city::archive_load(archive arch) {
    // Optional type — missing property must not overwrite pak type (r_int def=0 is OURS).
    const int type_value = arch.r_int("type", -1);
    if (type_value >= EMPIRE_CITY_OURS && type_value < EMPIRE_CITY_COUNT) {
        type = (e_empire_city)type_value;
    }

    svector<e_resource, RESOURCES_MAX> sells;
    arch.r_array_num<e_resource>("sells", sells);
    if (!sells.empty()) {
        std::fill_n(sells_resource, RESOURCES_MAX, 0);
        for (auto r : sells) {
            sells_resource[r] = true;
        }
    }

    svector<e_resource, RESOURCES_MAX> buys;
    arch.r_array_num<e_resource>("buys", buys);
    if (!buys.empty()) {
        std::fill_n(buys_resource, RESOURCES_MAX, 0);
        for (auto r : buys) {
            buys_resource[r] = true;
        }
    }

    // trade: false → display-only / locked on empire map; true / omitted with sells/buys → trading.
    // When trade is explicitly false but sells/buys are listed, keep the goods for a later
    // CITY_STATUS_CHANGE (NEW_TRADE_ROUTE) unlock — only demote the city type.
    const bool has_trade_lists = !sells.empty() || !buys.empty();
    if (arch.r_bool("trade", has_trade_lists || can_trade())) {
        if (has_trade_lists) {
            set_trade_enabled(true);
        }
    } else if (has_trade_lists) {
        switch (type) {
        case EMPIRE_CITY_PHARAOH_TRADING:
            type = EMPIRE_CITY_PHARAOH;
            break;
        case EMPIRE_CITY_EGYPTIAN_TRADING:
            type = EMPIRE_CITY_EGYPTIAN;
            break;
        case EMPIRE_CITY_FOREIGN_TRADING:
            type = EMPIRE_CITY_FOREIGN;
            break;
        default:
            break;
        }
    } else {
        set_trade_enabled(false);
    }

    check_attributes();
}

void empire_city::check_attributes() {
    max_traders = std::max<uint8_t>(1u, max_traders);
}

bstring32 empire_city::get_display_name(int nid) {
    int text_group = !!game_features::gameui_empire_city_old_names 
                            ? empire_city_options.text_group_old_names 
                            : empire_city_options.text_group_new_names;

    return lang_get_string(text_group, nid);
}

const trade_route& empire_city_handle::get_route() const {
    auto city = g_empire.city(handle);
    return g_empire.get_route(city->route_id);
}

trade_route& empire_city_handle::get_route() {
    auto city = g_empire.city(handle);
    return g_empire.get_route(city->route_id);
}

bool empire_city_handle::buys_resource(e_resource r) const {
    return ref().buys_resource[r];
}

bool empire_city_handle::sells_resource(e_resource r) const {
    return ref().sells_resource[r];
}

void empire_city_handle::remove_trader(figure_id fid) {
    if (empire_city *city = g_empire.city(handle)) {
        city->remove_trader(fid);
    }
}

void empire_city_handle::set_under_siege(uint8_t months) {
    ref().set_under_siege(months);
}

xstring empire_city_handle::name() const {
    const int group = !!game_features::gameui_empire_city_old_names ? 195 : 21;
    pcstr name = (pcstr)lang_get_string(group, ref().name_id);
    return xstring(name);
}

empire_city& empire_city_handle::ref() { 
    return *g_empire.city(handle);
}

const empire_city& empire_city_handle::ref() const {
    return *g_empire.city(handle);
}

empire_city& empire_city_handle::operator*() {
    return *g_empire.city(handle);
}
