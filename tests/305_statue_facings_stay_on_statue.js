// Each statue variant has four images, one per facing. Medium, large and the Ra small statue started
// one image into their four (to show the second as the default facing) and added the facing on top,
// so the fourth facing showed the next statue's image (Pharaoh General group 8: the falcon on the
// seated pharaoh, a large statue on the falcon; group 7: the sphinx on the colossus, an obelisk on the
// sphinx; Temple_ra: a sphinx on the Ra statue). Variants now start on their first image and the
// default facing comes from `phases`, wrapping within the four.
// Markers:
//   [test-marker] statue_facings_stay_in_block
//   [test-marker] statue_first_three_facings_unchanged
//   [test-marker] statue_cpp_matches_script (with the game's images) or statue_cpp_check_skipped_no_images

// first: each statue's first image of four in its group, read from the game's image files.
// old: the offset each variant started at before the fix; its first three facings must not change.
var T305_TYPES = [
    { type: BUILDING_SMALL_STATUE, cfg: building_small_statue, name: 'small', first: [0, 4, 0, 4, 26], old: [0, 4, 0, 4, 27] },
    { type: BUILDING_MEDIUM_STATUE, cfg: building_medium_statue, name: 'medium', first: [0, 4, 0, 4], old: [1, 5, 1, 5] },
    { type: BUILDING_LARGE_STATUE, cfg: building_large_statue, name: 'large', first: [0, 4, 0, 4], old: [1, 5, 1, 5] },
]

function run_test() {
    var in_block = true
    var unchanged = true
    var cpp_compared = 0
    var cpp_ok = true
    for (var t = 0; t < T305_TYPES.length; t++) {
        var info = T305_TYPES[t]
        var cfg = info.cfg
        for (var v = 0; v < cfg.variants.length; v++) {
            var desc = cfg.variants[v]
            var seen = {}
            for (var o = 0; o < 4; o++) {
                var off = statue_image_offset(desc, o, cfg.phases, v)
                var first = info.first[v]
                if (off < first || off > first + 3 || seen[off]) {
                    in_block = false
                    __log_info_native('[test:305] ' + info.name + ' variant ' + v + ' facing ' + o + ' offset ' + off + ' outside ' + first + '..' + (first + 3))
                }
                seen[off] = true
                if (o < 3 && off != info.old[v] + o) {
                    unchanged = false
                    __log_info_native('[test:305] ' + info.name + ' variant ' + v + ' facing ' + o + ' offset ' + off + ' was ' + (info.old[v] + o))
                }
                var want = __test_image_from_desc(desc.pack, desc.id, off)
                if (want > 0) {
                    cpp_compared++
                    var got = __test_statue_image(info.type, o, v)
                    if (got != want) {
                        cpp_ok = false
                        __log_info_native('[test:305] ' + info.name + ' variant ' + v + ' facing ' + o + ' C++ image ' + got + ' want ' + want)
                    }
                }
            }
        }
    }
    __log_info_native('[test:305] C++ images compared: ' + cpp_compared)
    if (in_block) {
        __log_marker('statue_facings_stay_in_block')
    }
    if (unchanged) {
        __log_marker('statue_first_three_facings_unchanged')
    }
    if (cpp_compared == 0) {
        __log_marker('statue_cpp_check_skipped_no_images')
    } else if (cpp_ok) {
        __log_marker('statue_cpp_matches_script')
    }
    __test_signal_ready()
}

function check_valid() {
    var cpp = __test_find_inlog('[test-marker] statue_cpp_matches_script') || __test_find_inlog('[test-marker] statue_cpp_check_skipped_no_images')
    return __test_find_inlog('[test-marker] statue_facings_stay_in_block') && __test_find_inlog('[test-marker] statue_first_three_facings_unchanged') && cpp
}
