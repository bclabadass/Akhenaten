#include "victory_video.h"

#include "graphics/image.h"
#include "graphics/graphics.h"
#include "graphics/screen.h"
#include "graphics/video.h"
#include "platform/renderer.h"
#include "graphics/window.h"
#include "core/bstring.h"
#include "core/profiler.h"
#include "js/js.h"
#include "js/js_game.h"

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <functional>

static struct {
    int width;
    int height;
    std::function<void()> callback;
} data;

static int init(const char* filename, int width, int height, std::function<void()> callback) {
    if (video_start(filename)) {
        data.width = width;
        data.height = height;
        data.callback = std::move(callback);
        video_init();
        return 1;
    }
    return 0;
}

static void draw_background(int) {
    g_render.clear_screen();
}

struct victory_video_rect {
    int x, y, w, h;
};

// Pharaoh's 560x333 videos are small on a high-resolution screen: draw them as large as fits, up to 2x.
static victory_video_rect victory_video_fit(int screen_w, int screen_h, int width, int height) {
    constexpr float max_scale = 2.0f;
    if (width <= 0 || height <= 0) {
        return {0, 0, 0, 0};
    }
    const float scale = std::min({max_scale, screen_w / (float)width, screen_h / (float)height});
    const int w = (int)std::lround(width * scale);
    const int h = (int)std::lround(height * scale);
    return {(screen_w - w) / 2, (screen_h - h) / 2, w, h};
}

static void draw_foreground(int) {
    const victory_video_rect r = victory_video_fit(screen_width(), screen_height(), data.width, data.height);
    video_draw_in_rect(r.x, r.y, r.w, r.h);
}

static void handle_input(const mouse* m, const hotkeys* h) {
    if (m->left.went_up || m->right.went_up || video_is_finished()) {
        video_stop();
        if (data.callback) {
            data.callback();
        }
    }
}

void window_victory_video_show(const char* filename, int width, int height, std::function<void()> callback) {
    if (init(filename, width, height, callback)) {
        window_type window = {
            "window_victory_video",
            draw_background,
            draw_foreground,
            handle_input
        };
        window_show(&window);
    } else if (callback) {
        callback();
    }
}

void __game_victory_video_show(pcstr filename, int width, int height, pcstr on_done) {
    bstring256 file = filename ? filename : "";
    bstring64 cb = (on_done && *on_done) ? on_done : "";
    window_victory_video_show(file.c_str(), width, height, [cb]() {
        if (!cb.empty()) {
            js_vm_exec_function(cb.c_str());
        }
    });
}
ANK_FUNCTION_4(__game_victory_video_show)

static xstring __test_victory_video_rect(int screen_w, int screen_h, int width, int height) {
    const victory_video_rect r = victory_video_fit(screen_w, screen_h, width, height);
    char out[64];
    snprintf(out, sizeof(out), "%d,%d,%d,%d", r.x, r.y, r.w, r.h);
    return xstring(out);
}
ANK_FUNCTION_4(__test_victory_video_rect)
