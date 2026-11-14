// Gods never sent blessings. A happy god (mood 70+) earns happy ankhs each day; at the start of a month,
// more than 19 brings a minor blessing and 50 a major one, if a festival was held in the last 15 months.
// The daily update ended by setting the ankhs from the wrath bolts (0 for a happy god), so they never
// built up. A god that is only content (mood under 70), or without a recent festival, still gets none.
// Markers:
//   [test-marker] happy_god_earns_ankhs
//   [test-marker] ankhs_capped_at_50
//   [test-marker] major_blessing_sent
//   [test-marker] minor_blessing_sent
//   [test-marker] content_god_no_blessing
//   [test-marker] no_blessing_without_festival

var T325_GOD = GOD_OSIRIS

function t325_god() {
    var g = city.gods.at(T325_GOD)
    return { mood: g.mood, ankhs: g.happy_ankhs }
}

function t325_days(n) {
    for (var i = 0; i < n; i++) {
        __test_religion_update_mood(T325_GOD)
    }
    return t325_god()
}

function run_test() {
    test_reload_city_session('data/default.map')
    var known_prev = city.gods.is_known(T325_GOD)
    city.gods.set_known(T325_GOD, true)

    __test_god_set_state(T325_GOD, 95, 2)
    var day3 = t325_days(3)
    var full = t325_days(120)
    __test_religion_monthly_blessings(T325_GOD)
    var after_major = t325_god()

    // Ankhs past 19 but short of 50: a minor blessing.
    __test_god_set_state(T325_GOD, 75, 2)
    var some = t325_god()
    for (var d = 0; d < 100 && some.ankhs <= 19; d++) {
        some = t325_days(1)
    }
    __test_religion_monthly_blessings(T325_GOD)
    var after_minor = t325_god()

    __test_god_set_state(T325_GOD, 60, 2)
    var content = t325_days(120)
    __test_religion_monthly_blessings(T325_GOD)
    var content_after = t325_god()

    __test_god_set_state(T325_GOD, 95, 20)
    var no_festival = t325_days(120)
    __test_religion_monthly_blessings(T325_GOD)
    var no_festival_after = t325_god()

    __log_info_native('[test:325] happy: day 3 ' + JSON.stringify(day3) + ' full ' + JSON.stringify(full)
        + ' after month ' + JSON.stringify(after_major) + '; minor: ' + JSON.stringify(some) + ' after '
        + JSON.stringify(after_minor) + '; content: ' + JSON.stringify(content) + ' after '
        + JSON.stringify(content_after) + '; no festival: ' + JSON.stringify(no_festival) + ' after '
        + JSON.stringify(no_festival_after))
    if (day3.ankhs > 0) {
        __log_marker('happy_god_earns_ankhs')
    }
    if (full.ankhs == 50) {
        __log_marker('ankhs_capped_at_50')
    }
    if (full.ankhs == 50 && after_major.ankhs == 0 && after_major.mood == 65) {
        __log_marker('major_blessing_sent')
    }
    if (some.ankhs > 19 && some.ankhs < 50 && after_minor.ankhs == 0 && after_minor.mood == 63) {
        __log_marker('minor_blessing_sent')
    }
    if (content.ankhs == 0 && content_after.mood == 60) {
        __log_marker('content_god_no_blessing')
    }
    if (no_festival.ankhs == 50 && no_festival_after.ankhs == 50 && no_festival_after.mood == 95) {
        __log_marker('no_blessing_without_festival')
    }

    __test_god_set_state(T325_GOD, 50, 0)
    city.gods.set_known(T325_GOD, known_prev)
    __test_signal_ready()
}

function check_valid() {
    var markers = ['happy_god_earns_ankhs', 'ankhs_capped_at_50', 'major_blessing_sent', 'minor_blessing_sent',
        'content_god_no_blessing', 'no_blessing_without_festival']
    for (var i = 0; i < markers.length; i++) {
        if (!__test_find_inlog('[test-marker] ' + markers[i])) {
            return false
        }
    }
    return true
}
