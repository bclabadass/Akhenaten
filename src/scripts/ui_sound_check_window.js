log_info("akhenaten: ui sound check window started")

// Listening check for the sound effect table: each row names the event that plays a sound, plays it,
// and takes a Right/Wrong verdict. Rows with a channel play through that effect channel, so they use
// the file sounds.js gives it; rows with a file are Pharaoh sounds the game doesn't play as effects
// yet, played as-is with the event Pharaoh.exe registers them for.

var SOUND_CHECK_ROWS_PER_PAGE = 8
var SOUND_CHECK_ROWS_TOP = 76
var SOUND_CHECK_ROW_HEIGHT = 34

var sound_check_sections = [
    {
        title: "Sounds the game plays",
        rows: [
            { channel: SOUND_EFFECT_ICON, event: "Tap a button or icon; quiet message chime" },
            { channel: SOUND_EFFECT_SIDEBAR, event: "Control panel slides open or closed" },
            { channel: SOUND_EFFECT_BUILD, event: "A building is placed; a digit typed" },
            { channel: SOUND_EFFECT_FANFARE, event: "A message arrives" },
            { channel: SOUND_EFFECT_FANFARE_URGENT, event: "An urgent message arrives" },
            { channel: SOUND_EFFECT_EXPLOSION, event: "A building collapses, burns down or is wrecked" },
            { channel: SOUND_EFFECT_FIRE_SPLASH, event: "A fireman puts out a fire" },
            { channel: SOUND_EFFECT_ARROW, event: "An enemy archer or spearman shoots" },
            { channel: SOUND_EFFECT_JAVELIN, event: "A warship fires; a spear or javelin hits" },
            { channel: SOUND_EFFECT_SWORD, event: "Infantry strike in melee" },
            { channel: SOUND_EFFECT_SWORD_SWING, event: "A charioteer or enemy swordsman strikes" },
            { channel: SOUND_EFFECT_LIGHT_SWORD, event: "An archer strikes in melee" },
            { channel: SOUND_EFFECT_SPEAR, event: "An enemy spearman strikes" },
            { channel: SOUND_EFFECT_HORSE2, event: "A chariot or mounted enemy dies" },
            { channel: SOUND_EFFECT_ZEBRA_DIE, event: "An antelope dies" },
            { channel: SOUND_EFFECT_OSTRICH_DIE, event: "An ostrich dies" },
            { channel: SOUND_EFFECT_SOLDIER_DIE, event: "A soldier dies (cry 1 of 4)" },
            { channel: SOUND_EFFECT_SOLDIER_DIE + 1, event: "A soldier dies (cry 2 of 4)" },
            { channel: SOUND_EFFECT_SOLDIER_DIE + 2, event: "A soldier dies (cry 3 of 4)" },
            { channel: SOUND_EFFECT_SOLDIER_DIE + 3, event: "A soldier dies (cry 4 of 4)" },
            { channel: SOUND_EFFECT_CITIZEN_DIE, event: "A citizen dies (cry 1 of 4)" },
            { channel: SOUND_EFFECT_CITIZEN_DIE + 1, event: "A citizen dies (cry 2 of 4)" },
            { channel: SOUND_EFFECT_CITIZEN_DIE + 2, event: "A citizen dies (cry 3 of 4)" },
            { channel: SOUND_EFFECT_CITIZEN_DIE + 3, event: "A citizen dies (cry 4 of 4)" },
        ]
    },
    {
        title: "Pharaoh sounds not played as effects yet",
        rows: [
            { file: "Wavs/NO.WAV", event: "\"No\": probably a blocked placement" },
            { file: "Wavs/DIG.WAV", event: "Digging: probably canals or ditches" },
            { file: "Wavs/MENU.WAV", event: "A menu opens" },
            { file: "Wavs/FIRE.WAV", event: "A building catches fire (now: ruins)" },
            { file: "Wavs/CROCATK.WAV", event: "A crocodile attacks" },
            { file: "Wavs/CROCDIE.WAV", event: "A crocodile dies" },
            { file: "Wavs/HIPPODIE.WAV", event: "A hippo dies" },
            { file: "Wavs/HYENADIE.WAV", event: "A hyena dies" },
            { file: "Wavs/liondie.wav", event: "A lion dies" },
            { file: "Wavs/aspdie.wav", event: "An asp dies" },
            { file: "Wavs/Scorpiondie.wav", event: "A scorpion dies" },
            { file: "Wavs/SHIP_DIE.WAV", event: "A ship sinks" },
            { file: "Wavs/police_atk.wav", event: "A constable attacks" },
            { file: "Wavs/sentry_atk.wav", event: "A tower sentry attacks" },
            { file: "Wavs/hunt_bird.wav", event: "A hunter hits a bird" },
            { file: "Wavs/hunt_ost_atk.wav", event: "A hunter hits an ostrich" },
        ]
    }
]

// Verdicts by row number: "right" or "wrong". Kept while the game runs, so closing the window
// doesn't lose them.
var sound_check_verdicts = {}

function sound_check_effect_file(channel) {
    for (var i = 0; i < sound_effects.length; i++) {
        if (sound_effects[i].c == channel) {
            return sound_effects[i].p
        }
    }
    return ""
}

// Every row in order, numbered from 1, with its section and the file it plays.
function sound_check_rows() {
    var rows = []
    for (var s = 0; s < sound_check_sections.length; s++) {
        var section = sound_check_sections[s]
        for (var r = 0; r < section.rows.length; r++) {
            var row = section.rows[r]
            rows.push({
                number: rows.length + 1,
                section: s,
                channel: row.channel,
                file: row.file ? row.file : sound_check_effect_file(row.channel),
                event: row.event
            })
        }
    }
    return rows
}

// Pages never mix sections, so a section always starts on a new page.
function sound_check_pages() {
    var rows = sound_check_rows()
    var pages = []
    var current = null
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i]
        if (!current || current.section != row.section || current.rows.length >= SOUND_CHECK_ROWS_PER_PAGE) {
            current = { section: row.section, rows: [] }
            pages.push(current)
        }
        current.rows.push(row)
    }
    return pages
}

function sound_check_play(number) {
    var row = sound_check_rows()[number - 1]
    if (!row) {
        return false
    }
    if (row.channel !== undefined) {
        __game_sound.play_effect(row.channel)
        return true
    }
    return __game_sound.speech_play(row.file)
}

function sound_check_mark(number, verdict) {
    var row = sound_check_rows()[number - 1]
    if (!row) {
        return
    }
    if (sound_check_verdicts[number] == verdict) {
        delete sound_check_verdicts[number]
        verdict = "cleared"
    } else {
        sound_check_verdicts[number] = verdict
    }
    log_info("[sound-check] #" + number + " " + row.file + " (" + row.event + "): " + verdict)
}

function sound_check_summary() {
    var total = sound_check_rows().length
    var right = 0
    var wrong = []
    for (var n = 1; n <= total; n++) {
        if (sound_check_verdicts[n] == "right") {
            right++
        } else if (sound_check_verdicts[n] == "wrong") {
            wrong.push(n)
        }
    }
    var text = "Right " + right + "   Wrong " + wrong.length + "   Unchecked " + (total - right - wrong.length)
    if (wrong.length) {
        text += "   Wrong: " + wrong.join(", ")
    }
    return text
}

[es=modal_window]
sound_check_window {
    allow_rmb_goback : true
    draw_underlying : true
    pos [(sw(0) - px(40))/2, (sh(0) - px(26))/2]
    page : 0

    ui {
        background  : outer_panel({size[40, 26]})
        title       : header({pos[10, 10], size[px(40) - 20, 20], text:"Sound check", align:"center"})
        hint        : text({pos[20, 36], text:"Play each sound, then mark whether it fits the event.", font: FONT_SMALL_PLAIN})
        section     : text({pos[20, 54], font: FONT_NORMAL_BLACK_ON_LIGHT})
        summary     : text({pos[20, 356], font: FONT_SMALL_PLAIN})
        btn_prev    : button({pos[20, 374], size[60, 26], text:"Prev"})
        page_label  : text({pos[90, 380], font: FONT_NORMAL_BLACK_ON_LIGHT})
        btn_next    : button({pos[170, 374], size[60, 26], text:"Next"})
        btn_close   : button({pos[px(40) - 120, 374], size[100, 26], text:"#TR_BUTTON_OK"})
    }
}

[es=(sound_check_window, btn_prev)]
function sound_check_window_prev(window) {
    var n = sound_check_pages().length
    sound_check_window.page = (sound_check_window.page - 1 + n) % n
}

[es=(sound_check_window, btn_next)]
function sound_check_window_next(window) {
    sound_check_window.page = (sound_check_window.page + 1) % sound_check_pages().length
}

[es=(sound_check_window, btn_close)]
function sound_check_window_close(window) {
    window_go_back()
}

[es=(sound_check_window, ui_draw_foreground)]
function sound_check_window_draw(window) {
    var pages = sound_check_pages()
    var page_index = Math.min(sound_check_window.page, pages.length - 1)
    var page = pages[page_index]
    window.section.text = sound_check_sections[page.section].title
        + (game_features.gameopt_sound_effects_enabled ? "" : "  (effects are off in Sound options)")
    window.page_label.text = (page_index + 1) + " / " + pages.length
    window.summary.text = sound_check_summary()

    // Drawing here is relative to the window.
    var origin = { x: 0, y: SOUND_CHECK_ROWS_TOP }
    var row_h = SOUND_CHECK_ROW_HEIGHT
    var w = px(40)
    for (var i = 0; i < page.rows.length; i++) {
        var row = page.rows[i]
        var y = origin.y + i * row_h
        var verdict = sound_check_verdicts[row.number]
        var mark = verdict == "right" ? "ok" : (verdict == "wrong" ? "NO" : "")
        ui.label(String(row.number), [origin.x + 20, y + 4], FONT_NORMAL_BLACK_ON_LIGHT)
        ui.label(mark, [origin.x + 20, y + 18], verdict == "wrong" ? FONT_NORMAL_BLUE : FONT_SMALL_PLAIN)
        ui.label(row.event, [origin.x + 52, y + 2], FONT_NORMAL_BLACK_ON_LIGHT)
        var source = row.file ? row.file : "(no file)"
        if (row.channel !== undefined) {
            source += "   channel " + row.channel
        }
        ui.label(source, [origin.x + 52, y + 18], FONT_SMALL_PLAIN)

        if (ui.button({ text: "Play", pos: [origin.x + w - 236, y + 2], size: [64, 28] }) == ui.button_clicked) {
            sound_check_play(row.number)
        }
        if (ui.button({ text: verdict == "right" ? "[Right]" : "Right", pos: [origin.x + w - 164, y + 2], size: [70, 28] }) == ui.button_clicked) {
            sound_check_mark(row.number, "right")
        }
        if (ui.button({ text: verdict == "wrong" ? "[Wrong]" : "Wrong", pos: [origin.x + w - 86, y + 2], size: [70, 28] }) == ui.button_clicked) {
            sound_check_mark(row.number, "wrong")
        }
    }
}
