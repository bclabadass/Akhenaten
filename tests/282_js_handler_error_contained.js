// One script handler that throws must not stop every other script. The VM error flag used to
// stay set until a script reload, so after any handler error the top menu stopped drawing and
// the sidebar stopped taking input for the rest of the session; players can't reload scripts.
// Now only the handler that threw is skipped.
// Markers:
//   [test-marker] other_handlers_keep_running
//   [test-marker] failed_handler_skipped

var t282_bad_calls = 0
var t282_good_calls = 0

function t282_bad_handler(ev) {
    t282_bad_calls++
    throw new Error('test 282: deliberate handler failure')
}

function t282_good_handler(ev) {
    t282_good_calls++
}

function run_test() {
    __test_js_add_event_handler('test_282_event', 't282_bad_handler')
    __test_js_add_event_handler('test_282_event', 't282_good_handler')

    __test_js_dispatch_event('test_282_event')
    __test_js_dispatch_event('test_282_event')

    __log_info_native('[test:282] bad=' + t282_bad_calls + ' good=' + t282_good_calls)
    if (t282_good_calls == 2) {
        __log_marker('other_handlers_keep_running')
    }
    if (t282_bad_calls == 1) {
        __log_marker('failed_handler_skipped')
    }
    __test_signal_ready()
}

function check_valid() {
    return __test_find_inlog('[test-marker] other_handlers_keep_running')
        && __test_find_inlog('[test-marker] failed_handler_skipped')
}
