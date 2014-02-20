/*global require, module*/
"use strict";


var pathutil = require('pathutil'),
    WebModule = require('./webmodule');


function ajax(url, cb) {
    var request = new XMLHttpRequest();
    request.open('GET', url);
    request.send();
    request.addEventListener('load', cb);
    request.addEventListener('error', function() {
        throw new Error("Error loading module " + url + ": " + request.statusText);
    });
    return request;    
}


module.exports = (function () {
    var loader = this | {},
        cache = loader.cache = {};

    function instantiate(pkg, id, done, event) {
        var module = new WebModule(pkg, id, event.target.response);
        cache[module.url] = module;
        if (done) {
            if (module.isLoaded()) {
                done();
            } else {
                module.once('load', function() {
                    module.run
                });
            }
        }
    }

    loader.fetch = function fetch(context, id, done) {
        var resolved = pathutil.resolve(context, id);
        if (cache[resolved.url]) {
            return false;
        }
        console.log('Module ' + resolved.pkg.name + '/' + resolved.id + ' requested');
        return ajax(resolved.url, instantiate.bind(null, resolved.pkg, resolved.id, done));
    };

    /**
     * Get already loaded module. It throws error if module was not loaded
     */
    loader.get = function get(context, id) {
        var url = pathutil.resolve(context, id).url;
        if (cache[url]) {
            return cache[url].exports;
        }
        throw new Error('Module not loaded: ' + url);
    };

    return loader;
}());
