// Cleopatra missions (38 on) keep their name, subtitle and briefing in the mission's start_message (447 on).
// Free play and the briefing used message 200 + id for every mission, which past 37 is tutorial text: the list
// showed "Perwadjyt", "Food or Famine?", "Gold and Crime"... after Hetepsensusret. Pharaoh's missions keep 200 + id.
// Markers:
//   [test-marker] pharaoh_titles_unchanged
//   [test-marker] cleopatra_titles_from_start_message
//   [test-marker] free_play_list_has_cleopatra_names

var T313_EXPECTED = { 0: 'Nubt', 36: 'Rowarty', 37: 'Hetepsensusret', 38: 'Thutmose in the Valley', 41: 'Sumur',
    44: 'Ramses in the Valley', 48: 'Alexandria', 51: "Cleopatra's Alexandria", 52: 'Actium' }

function t313_title(sid) {
    return ('' + mission_selection_title(sid)).replace(/\s+$/, '')
}

function run_test() {
    var pharaoh_ok = mission_text_id(0) == 200 && mission_text_id(37) == 237
    var cleo_ok = mission_text_id(38) == __lang_get_message_uid('message_mission_thutmose_valley') && mission_text_id(38) == 447
    var got = {}
    for (var sid in T313_EXPECTED) {
        got[sid] = t313_title(+sid)
        var ok = got[sid] == T313_EXPECTED[sid]
        if (+sid < FIRST_CLEOPATRA_MISSION) {
            pharaoh_ok = pharaoh_ok && ok
        } else {
            cleo_ok = cleo_ok && ok
        }
    }
    __log_info_native('[test:313] titles ' + JSON.stringify(got))
    if (pharaoh_ok) {
        __log_marker('pharaoh_titles_unchanged')
    }
    if (cleo_ok) {
        __log_marker('cleopatra_titles_from_start_message')
    }

    var rows = []
    scenario_selection_add_free_play_missions({ add_item: function(name, sid) { rows.push({ name: ('' + name).replace(/\s+$/, ''), sid: sid }) } })
    var tutorial = { 'Perwadjyt': 1, 'Food or Famine?': 1, 'Gold and Crime': 1, 'Farming along the Nile': 1, 'Developing Culture': 1,
        'Getting Started': 1, "At the Water's Edge": 1, 'The Finer Things': 1, 'Housing and Roads': 1, 'No title': 1 }
    var bad = []
    for (var i = 0; i < rows.length; i++) {
        if (rows[i].sid >= FIRST_CLEOPATRA_MISSION && rows[i].sid <= 52 && tutorial[rows[i].name]) {
            bad.push(rows[i].sid + ':' + rows[i].name)
        }
    }
    var cleo_rows = rows.filter(function(r) { return r.sid >= FIRST_CLEOPATRA_MISSION && r.sid <= 52 })
    __log_info_native('[test:313] free play rows ' + rows.length + ' cleopatra ' + cleo_rows.length + ' bad ' + bad.join(', '))
    if (cleo_rows.length == 15 && bad.length == 0) {
        __log_marker('free_play_list_has_cleopatra_names')
    }
    __test_signal_ready()
}

function check_valid() {
    var markers = ['pharaoh_titles_unchanged', 'cleopatra_titles_from_start_message', 'free_play_list_has_cleopatra_names']
    for (var i = 0; i < markers.length; i++) {
        if (!__test_find_inlog('[test-marker] ' + markers[i])) {
            return false
        }
    }
    return true
}
