/*global require, module*/
"use strict";

module.exports = function Emitter() {
    var emitter = this || {},
        events = {};

    emitter.on = function (type, listener) {
        if (! events[type]) {
            events[type] = events[type] = [];
        }
        events[type].push(listener);
    };

    emitter.once = emitter.on;

    // TODO: add support of arguments. Consider importing node EventEmitter
    emitter.emit = function(type) {
        var handlers = this._events && this._events[type] || [],
            i, l = handlers.length;
        for (i = 0; i < l; i++) {
            handlers[i]();
        }
    };

    return emitter;
};
