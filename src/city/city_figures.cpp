#include "city_figures.h"

#include "core/profiler.h"
#include "city/city.h"
#include "city/city_figures.h"
#include "figure/figure_names.h"
#include "io/gamestate/save_versions.h"

#include <vector>
#include "core/custom_span.hpp"
#include "core/random.h"

struct figure_data_t {
    //int created_sequence;
    bool initialized;
    std::array<figure *, MAX_FIGURES> figures;

    void init() {
        if (initialized) {
            return;
        }

        for (int i = 0; i < MAX_FIGURES; i++) {
            figures[i] = new figure(i);

        }

        initialized = true;
    }
};

figure_data_t g_figure_data = { false };

void city_figures_t::reset() {
    enemies = 0;
    rioters = 0;
    attacking_natives = 0;
    animals_number = 0;
    kingdome_soldiers = 0;
    soldiers = 0;
    if (security_breach_duration > 0) {
        security_breach_duration--;
    }
}

void city_figures_t::init_figures() {
    g_figure_data.init();
}

void city_figures_t::reload_objects() {
    for (auto &figure : map_figures()) {
        if (!figure || figure->type == FIGURE_NONE) {
            continue;
        }

        figure->dcast()->on_config_reload();
    }
}

void city_figures_t::add_enemy() {
    enemies++;
}

int city_figures_t::total_invading_enemies() const {
    return kingdome_soldiers + enemies;
}

namespace {
    size_t g_figures_loaded_version = 0;
    std::vector<figure_original_fields> g_figures_original_fields;
} // namespace

void city_figures_t::on_post_load() {
    const bool from_original = g_figures_loaded_version > 0 && g_figures_loaded_version <= last_original_save_version
                               && g_figures_original_fields.size() == MAX_FIGURES;
    for (auto &figure: map_figures()) {
        if (figure->type == FIGURE_NONE) {
            continue;
        }

        figure->reset_flags();
        if (from_original) {
            figure->dcast()->on_post_load_original(g_figures_original_fields[figure->id]);
        }
        figure->dcast()->on_post_load();
    }
    g_figures_loaded_version = 0;
    g_figures_original_fields.clear();
}

void city_figures_t::update() {
    OZZY_PROFILER_FUNCTION();
    reset();
    //g_city.entertainment.hippodrome_has_race = false;

    for (auto &figure: map_figures()) {
        figure->action_perform();
    }
}

void city_figures_t::add_animal() {
    animals_number++;
}

void city_figures_t::add_attacking_native() {
    security_breach_duration = 10;
    attacking_natives++;
}

void city_figures_t::remove_figures(e_figure_type ftype) {
    for (auto& f: g_figure_data.figures) {
        if (f->is_valid() && f->type == ftype) {
            f->poof();
        }
    }
}

void city_t::figures_add_kingdome_soldier() {
    figures.kingdome_soldiers++;
}

void city_t::figures_add_rioter(int is_attacking) {
    figures.rioters++;
    if (is_attacking)
        figures.security_breach_duration = 10;
}

void city_t::figures_add_soldier() {
    figures.soldiers++;
}

bool city_t::figures_has_security_breach() {
    return figures.security_breach_duration > 0;
}

figure *figure_get(int id) {
    verify_no_crash(id >= 0 && id < MAX_FIGURES);
    if (id < 0 || id >= MAX_FIGURES) {
        return figure_get(0);
    }
    return g_figure_data.figures[id];
}

xspan<figure *> map_figures() {
    return make_span(g_figure_data.figures.data(), g_figure_data.figures.size());
}

figure *figure_take_from_pool() {
    auto it = std::find_if(g_figure_data.figures.begin() + 1, g_figure_data.figures.end(), [] (auto &f) { return f->available(); });
    return it != g_figure_data.figures.end() ? *it : nullptr;
}

figure *figure_create(e_figure_type type, tile2i tile, int dir) {
    figure *f = figure_take_from_pool();
    if (!f) {
        return figure_get(0);
    }

    const auto &params = figure_static_params::get(type);

    f->state = FIGURE_STATE_ALIVE;
    f->faction_id = 1;
    f->type = type;
    f->use_cross_country = false;
    f->terrain_usage = -1;

    f->reset_flags();

    f->direction = dir;
    f->roam_length = 0;
    f->source_tile = tile;
    f->destination_tile = tile;
    f->previous_tile = tile;
    f->tile = tile;
    f->destination_tile.set(0, 0);
    f->cc_coords.x = 15 * tile.x();
    f->cc_coords.y = 15 * tile.y();
    f->progress_on_tile = 8;
    f->progress_inside = 0;
    f->progress_inside_speed = 0;
    f->name = figure_name_get(type);
    f->map_figure_add();

    f->dcast()->on_create();

    return f;
}

void figure_clear_all() {
    if (!g_figure_data.initialized) {
        return;
    }

    for (auto *f : g_figure_data.figures) {
        int figure_id = f->id;
        f->clear_impl();
        memset(f, 0, sizeof(figure));
        f->state = FIGURE_STATE_NONE;
        f->id = figure_id;
    }
}

io_buffer *iob_figures = new io_buffer([] (io_buffer *iob, size_t version) {
    g_figure_data.init();
    const bool reading = iob->is_read_access();
    if (reading) {
        g_figures_loaded_version = version;
        g_figures_original_fields.assign(MAX_FIGURES, figure_original_fields{});
    }
    for (int i = 0; i < MAX_FIGURES; i++) {
        figure_get(i)->bind(iob, reading ? &g_figures_original_fields[i] : nullptr); // doing this because some members are PRIVATE.
        figure_get(i)->id = i;
    }
});

io_buffer *iob_figure_sequence = new io_buffer([] (io_buffer *iob, size_t version) {
    iob->bind____skip(4);
    //iob->bind(BIND_SIGNATURE_INT32, &g_figure_data.created_sequence);
});
