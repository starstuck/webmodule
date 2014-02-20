/*global require, module, btoa*/
"use strict";


var Emitter = require('emitter'),

    // Base 64 VLQ encoding constants
    VLQ_BASE_SHIFT = 5,
    VLQ_CONTINUATION_BIT = (1 << VLQ_BASE_SHIFT),  // binary 100000
    VLQ_BASE_MASK = VLQ_CONTINUATION_BIT - 1,      // binary 011111
    BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function fullurl(url) {
    var loc = window.location;
    if (! url.match(/^([a=z]+:)?\/\//)) {
        if (url[0] !== '/') {
            url = loc.pathname.replce(/(\/)[^\/]+$/, '$1') + url;
        }
        url = loc.protocol + '//' + loc.host + url;
    }
    return url;
}

// Encode number in Base64 VLQ encoding
// Based on source of: http://code.google.com/p/traceur-compiler/source/browse/third_party/source-map/lib/source-map/base64-vlq.js,
// by 
function basevlq(value) {
    var vlq = (value < 0) ? ((-value) << 1) + 1 : (value << 1),
        encoded = '',
        digit;
    do {
        digit = vlq & VLQ_BASE_MASK;
        vlq >>>= VLQ_BASE_SHIFT;
        if (vlq > 0) {
            digit |= VLQ_CONTINUATION_BIT;
        }
        encoded += BASE64_CHARS[digit];
    } while(vlq)
    return encoded;
}

function shiftedmapping(body) {
    var len = (body.match(/\n/g) || []).length,
        mapping = ';;EAAA',
        i;
    for (i = 1; i < len; i++) {
        if (mapping) mapping += ';';
        mapping += 'CACA';
    }
    return mapping;
}

function addsrcmap(body, srcurl) {
    var map = {
        version: 3,
        sources: [fullurl(self.url)],
        mappings: shiftedmapping(body)
    };
    return body + '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,' + btoa(JSON.stringify(map));
}

module.exports = function WebModule(pkg, id, body, loader) {
    var module = this || {},
        exports = module.exports = {},
        loaded = false; 

    Emitter.call(module);
        
    function loaddeps() {
        var done = module.emit.bind(module, 'load'),
            depsLeft = 0;

        // Find all dependencies and start fetching them
        body.replace(/[^.]require\(['"]([a-zA-Z_/.-]+)['"]\)/g, function(match, dep) {
            var fetching = loader.fetch(module, dep, function(){
                if ((-- depsLeft) <= 0) {
                    done();
                }
            });
            if (fetching) depsLeft ++;
            return match[0];
        });

        // Run factory only when no dependencies were queue for download
        if (!depsLeft) {
            done();
        }
    }

    module.exec = function exec() {
        var src = loader.nosrcmap ? body : addsrcmap(body, module.url),
            factory = new Function('exports', 'require', 'module', src);

        factory(module.exports, loader.require.bind(loader, module), module);

        // TODO: to make integration with AMD easy we should allow for 
        console.log('Module ' + pkg.name + '/' + id + ' loaded');
        loaded = true;
        module.emit('exec');
    };

    module.isLoaded = function isLoaded() { 
        return loaded; 
    };

    module.pkg = pkg;
    module.id = id;
    module.url = pkg.base + id + '.js';

    loaddeps();

    return module;
};
