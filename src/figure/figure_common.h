#pragma once

#include <cstdint>

// Bytes the original game keeps outside runtime_data; read from saves so original-game saves can rebuild it.
struct figure_original_fields {
    uint8_t empire_city_id = 0;
    uint8_t trader_amount_bought = 0;
    uint8_t trader_id = 0;
    uint8_t trade_ship_failed_dock_attempts = 0;
};

enum e_minimap_figure_color {
    FIGURE_COLOR_NONE = 0,
    FIGURE_COLOR_SOLDIER = 1,
    FIGURE_COLOR_ENEMY = 2,
    FIGURE_COLOR_WOLF = 3,
    FIGURE_COLOR_ANIMAL = 4
};