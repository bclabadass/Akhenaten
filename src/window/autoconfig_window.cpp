#include "autoconfig_window.h"

#include "core/log.h"
#include "js/js_game.h"
#include "game/game_events.h"
#include "window/message_dialog.h"
#include "core/profiler.h"
#include "graphics/elements/ui_js.h"
#include "graphics/window.h"
#include "js/js_events.h"
#include "input/input.h"
#include "input/mouse.h"
#include "js/js.h"
#include "platform/arguments.h"
#include "core/system_time.h"
#include <algorithm>
#include <cctype>
#include <string>
#include <unordered_map>
#include <mutex>

using autoconfig_windows = std::unordered_map<xstring, autoconfig_window *>;
autoconfig_windows* g_autoconfig_windows = nullptr;

struct event_show_window { xstring id; };
ANK_SCRIPT_EVENT(event_show_window, id)

void ANK_PERMANENT_CALLBACK(event_show_window, ev) {
    autoconfig_window::show(ev.id);
}

autoconfig_windows& autoconfig_registry() {
    if (!g_autoconfig_windows) {
        static std::mutex registry_locker;

        std::scoped_lock _(registry_locker);
        if (!g_autoconfig_windows) {
            g_autoconfig_windows = new autoconfig_windows;
        }
    }

    return *g_autoconfig_windows;
}

void ANK_REGISTER_CONFIG_ITERATOR(config_load_autoconfig_windows) {
    for (auto& w : autoconfig_registry()) {
        w.second->load(w.second->get_section());
    }
}

void autoconfig_window::refresh_all() {
    config_load_autoconfig_windows();
}

// Skips strings and comments starting at i; returns true if it moved past one.
static bool skip_script_trivia(const std::string& s, size_t& i) {
    if (s[i] == '/' && i + 1 < s.size() && s[i + 1] == '/') {
        const size_t end = s.find('\n', i);
        i = (end == std::string::npos) ? s.size() : end;
        return true;
    }
    if (s[i] == '/' && i + 1 < s.size() && s[i + 1] == '*') {
        const size_t end = s.find("*/", i + 2);
        i = (end == std::string::npos) ? s.size() : end + 2;
        return true;
    }
    if (s[i] == '"' || s[i] == '\'') {
        const char quote = s[i++];
        while (i < s.size() && s[i] != quote) {
            i += (s[i] == '\\') ? 2 : 1;
        }
        ++i;
        return true;
    }
    return false;
}

static size_t script_block_end(const std::string& s, size_t open) {
    int depth = 0;
    for (size_t i = open; i < s.size();) {
        if (skip_script_trivia(s, i)) {
            continue;
        }
        if (s[i] == '{') {
            ++depth;
        } else if (s[i] == '}' && --depth == 0) {
            return i;
        }
        ++i;
    }
    return std::string::npos;
}

// Finds each window's top-level `name { ... }` block in a script and keeps its text.
static void collect_layout_blocks(const std::string& s, std::unordered_map<xstring, std::string>& blocks) {
    int depth = 0;
    for (size_t i = 0; i < s.size();) {
        if (skip_script_trivia(s, i)) {
            continue;
        }
        const char c = s[i];
        if (c == '{') {
            ++depth;
        } else if (c == '}') {
            --depth;
        } else if (depth == 0 && (isalpha((unsigned char)c) || c == '_')) {
            size_t end = i;
            while (end < s.size() && (isalnum((unsigned char)s[end]) || s[end] == '_')) {
                ++end;
            }
            size_t open = end;
            while (open < s.size() && isspace((unsigned char)s[open])) {
                ++open;
            }
            const xstring name(s.substr(i, end - i).c_str());
            if (open < s.size() && s[open] == '{' && autoconfig_registry().count(name)) {
                const size_t close = script_block_end(s, open);
                if (close == std::string::npos) {
                    return;
                }
                blocks[name] = s.substr(open, close - open + 1);
                i = close + 1;
                continue;
            }
            i = end;
            continue;
        }
        ++i;
    }
}

static void shift_elements_for_screen(archive arch, ui::element::items& elements, const xstring& parent) {
    arch.r_objects("ui", [&](pcstr key, archive elem) {
        const xstring id(key);
        auto it = std::find_if(elements.begin(), elements.end(),
          [&](const auto& e) { return e->id == id && e->parent_id == parent; });
        if (it == elements.end()) {
            return;
        }
        const vec2i fresh = elem.r_vec2i("pos");
        (*it)->pos = (*it)->pos + (fresh - (*it)->config_pos);
        (*it)->config_pos = fresh;
        shift_elements_for_screen(elem, elements, id);
    });
}

// Layout blocks compute positions from the screen size once, when scripts load. Re-evaluating just
// those blocks keeps the scripts' state, and moving by the change in the layout's own value keeps
// anything a script positioned at runtime.
void autoconfig_window::refresh_layout_for_screen() {
    constexpr pcstr temp_name = "__layout_refresh";
    const time_millis started = time_get_millis();

    std::unordered_map<xstring, std::string> blocks;
    js_vm_for_each_loaded_script([&](const std::string& source) { collect_layout_blocks(source, blocks); });

    int refreshed = 0;
    for (auto& entry : autoconfig_registry()) {
        auto block = blocks.find(entry.first);
        if (block == blocks.end()) {
            continue;
        }
        const std::string source = std::string(temp_name) + " " + block->second;
        if (!js_vm_exec_source("layout_refresh", source.c_str())) {
            logs::error("layout refresh: could not evaluate %s", entry.first.c_str());
            continue;
        }
        autoconfig_window* w = entry.second;
        g_config_arch.r_section(temp_name, [w](archive arch) {
            const vec2i fresh = arch.r_vec2i("pos");
            w->pos = w->pos + (fresh - w->config_pos);
            w->config_pos = fresh;
            shift_elements_for_screen(arch, w->elements, xstring());
        });
        // Later config reloads (the Editor, a language change) read the stored object.
        const std::string store = std::string("__layout_store(") + entry.first.c_str() + ", __layout_refresh)";
        js_vm_exec_source("layout_refresh", store.c_str());
        ++refreshed;
    }
    js_vm_exec_source("layout_refresh", "__layout_refresh = undefined");
    logs::info("[layout] refreshed %d windows in %u ms", refreshed, (unsigned)(time_get_millis() - started));
}

autoconfig_window::autoconfig_window(xstring s) {
    assert(!strstr(s.c_str(), "::"));
    logs::info("Registered window config:%s", s.c_str());
    autoconfig_registry()[s] = this;
}

void autoconfig_window::enqueue_event(xstring sub_event, bvariant_map payload) {
    pending_events_.push_back({ sub_event, std::move(payload) });
}

void autoconfig_window::fire_pending_events() {
    constexpr int k_max_passes = 32;
    int pass = 0;

    while (!pending_events_.empty() && pass < k_max_passes) {
        auto batch = std::move(pending_events_);
        pending_events_.clear();

        for (auto &e : batch) {
            ui::dispatch_autoconfig_es_event(this, e.sub_event, e.payload);
        }

        ++pass;
    }

    if (!pending_events_.empty()) {
        logs::error("flush_pending_es_events: too many deferred passes for '%s'", get_section().c_str());
        pending_events_.clear();
    }
}

void autoconfig_window::on_restore() {
    ui.begin_widget(pos);
    ui.event(window_info{ pos }, get_section(), __func__);
    ui.end_widget();
}

void autoconfig_window::archive_load(archive arch) {
    ui::widget::archive_load(arch);

    assert(elements.size() > 0);
    _is_inited = false;
    help_id = arch.r_string("help_id");
    allow_rmb_goback = arch.r_bool("allow_rmb_goback");
    draw_underlying = arch.r_bool("draw_underlying", false);
}

void autoconfig_window::go_back() {
    ui.event(window_info{pos}, get_section(), __func__);
}

int autoconfig_window::ui_handle_mouse(const mouse *m) {
    ui.begin_widget(pos);

    const xstring window_id_before = window_get_id();
    ui.event(window_info{pos}, get_section(), __func__);
    if (window_get_id() != window_id_before) {
        ui.end_widget();
        return 0;
    }

    bool handled = ui::handle_mouse(m);

    if (allow_rmb_goback && (is_modal() || !handled)) {
        const hotkeys *h = hotkey_state();
        if (input_go_back_requested(m, h)) {
            window_go_back();
            ui.end_widget();
            return 1;
        }
    }

    const hotkeys *h = hotkey_state();
    if (input_go_back_requested(m, h)) {
        go_back();
    }

    ui.end_widget();

    if (is_modal()) {
        mouse::ref().reset_up_state();
        mouse::ref().reset_scroll();
        return 1;
    }

    return handled ? 1 : 0;
}

void autoconfig_window::before_mission_start() {
    for (auto& w : autoconfig_registry()) {
        w.second->on_mission_start();
    }
}

int autoconfig_window::draw_background(UiFlags flags) {
    if (!_is_inited) {
        init();
        _is_inited = true;
    }

    if (draw_underlying) {
        window_draw_underlying_window(UiFlags_Readonly);
    }

    ui.begin_widget(pos);
    ui.event(window_info{pos}, get_section(), __func__);
    fire_pending_events();
    ui.end_widget();
    return 0;
}

void autoconfig_window::ui_draw_foreground(UiFlags flags) {
    OZZY_PROFILER_FUNCTION();

    ui.begin_widget(pos);
    ui.draw(flags);
    ui.event(window_info{ pos }, get_section(), __func__);
    ui.end_widget();
}

void autoconfig_window::init() {
    ui.begin_widget(pos);
    ui.event(window_info{ pos }, get_section(), __func__);

    window_message_setup_help_id(help_id);
    _is_inited = true;
    ui.end_widget();
}

static autoconfig_window* get_window_current(xstring name) {
    auto it = autoconfig_registry().find(name);
    return (it != autoconfig_registry().end()) ? it->second : nullptr;
}

void autoconfig_window::show(xstring section) {
    auto it = autoconfig_registry().find(section);
    if (it == autoconfig_registry().end()) {
        logs::error("autoconfig_window_show: unknown section '%s'", section.c_str());
        return;
    }
    autoconfig_window* w = it->second;

    window_type s_script_window_type = {
       section,
       [section] (int flags) { auto *w = get_window_current(section); if (w) w->draw_background(flags); },
       [section] (int flags) { auto *w = get_window_current(section); if (w) w->ui_draw_foreground(flags); },
       [section] (const mouse *m, const hotkeys *h) { auto *w = get_window_current(section); if (w) w->ui_handle_mouse(m); }
    };
    w->init();
    window_show(&s_script_window_type);
}

autoconfig_window* autoconfig_window::find(xstring section) {
    auto it = autoconfig_registry().find(section);
    if (it == autoconfig_registry().end()) {
        return nullptr;
    }
    return it->second;
}

void autoconfig_window::unregister_section(xstring section) {
    autoconfig_registry().erase(section);
}