/*global Blob, URL, document, btoa*/

/**
 *
 * Roadmap:
 *  * Add support for amd modules
 */
var require = (function () {
    var root = new WebPackage(dirname(window.location.pathname), {name: "__main__"}),
        cache = {},
        main,
        exports,

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

    function WebModule(pkg, id, body) {
        this.pkg = pkg;
        this.id = id;
        this.url = pkg.base + id + '.js';
        this.exports = {};

        if (body) {
            this.load(body);
        }
    };

    /**
     * Porcelain function do define module content from string
     */
    WebModule.prototype.load = function(body) {
        var self = this,
            depsLeft = 0,
            factory,
            map;

        map = {
            version: 3,
            sources: [fullurl(self.url)],
            mappings: shiftedmapping(body)
        };

        body = body + '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,' + btoa(JSON.stringify(map));
        // body = body + '\n//# sourceURL=' + fullurl(self.url); // This looks easier and more reliable, but shows function wrapping code
        factory = new Function('exports', 'require', 'module', body);

        // Find all dependencies and start fetching them
        body.replace(/require\(['"]([a-zA-Z_/.-]+)['"]\)/g, function(match, dep) {
            var fetching = fetch(self, dep, function(){
                if ((-- depsLeft) <= 0) {
                    self.define(factory);
                }
            });
            if (fetching) depsLeft ++;
            return match[0];
        });

        // Run factory only when no dependencies were queue for download
        if (!depsLeft) {
            self.define(factory);
        }

        // TODO: Still having script is useful for debugging source maps and closure wrapper itself.
        // Consider adding some configuration switch to use following block
        //data = ;
        //this._script = document.createElement('script');
        //this._script.src = URL.createObjectURL(new Blob([
        //    'require.define("' + this.url + '", function(exports, require, module){\n',
        //    body, 
        //    '});\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,',
        //    btoa(JSON.stringify(map))
        //], {type: 'application/javascript'}));
        //this._run = function(exp, req, module) {
        //    document.head.appendChild(module._script);
        //};
    };

    /**
     * Low level function to define module content form factory function
     */
    WebModule.prototype.define = function(factory) {
        factory(this.exports, require.bind(null, this), this);
        // TODO: to make integration with AMD easy we should allow for 
        console.log('Module ' + this.pkg.name + '/' + this.id + ' loaded');
        this._loaded = true;
        this.emit('load');
    };

    WebModule.prototype.isLoaded = function() {
        return this._loaded || false;
    };

    WebModule.prototype.on = function(type, listener) {
        if (!this._events) this._events = {};
        if (!this._events[type]) {
            this._events[type] = this._events[type] = [];
        }
        this._events[type].push(listener);
    };

    // TOOD: add support of arguments. Consider importing node EventEmitter
    WebModule.prototype.emit = function(type) {
        var handlers = this._events && this._events[type] || [],
            i, l = handlers.length;
        for (i = 0; i < l; i++) {
            handlers[i]();
        }
    };

    // TODO: implement other methods of EventEmitter, see: http://nodejs.org/api/events.html
    WebModule.prototype.once = WebModule.prototype.on;

    function WebPackage(path, json) {
        this.name = json.name;
        // Base directory should always be with /
        this.base = dirname(path) + ((json.directories && json.directories.lib) ? json.directories.lib : '');
        // Full url to pkg main script
        if (json.main) {
            this.main = this.base + 'index.js';
        }
        // TODO: process dependencies, with package reuse when exact version matches
        this.nested = {};
    };

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

    // By default dirname will be trailing /
    function dirname(url) {
        return url.replace(/[^/]+$/, '');
    }

    // Returns array with package, module id and url
    function resolve(context, id) {
        var pkg = context.pkg,
            parts = id.split('/'),
            first = parts[0],
            uid = '',
            i, part, skip;

        if (first == '.') {
            parts[0] = dirname(context.id);
        } else if (first == '..') {
            parts.unshift(dirname(context.id));
        } else {
            console.log('Getting child package: ', first);
            pkg = pkg.nested[first];
            parts.shift();
            if (!pkg) {
                // TODO: if no package given, assume it is path relative to lib folder of the package
                throw new Error('Unknown top level package: ' + first);
            }
            if (parts.length == 0) {
                if (!pkg.main) throw new Error('Requested package "' + pkg.name + '" main script, but "main" congiuration property not defined');
                parts[0] = pkg.main; // If there is only package, then use main script
            }
        }

        // Construct canonical url from the end, because then it is easier to expand .. parts
        for (i = parts.length - 1, skip = 0; i >= 0; i--) {
            part = parts[i];
            if (part != '.' && part != '') {
                if (part == '..') {
                    skip += 1;
                } else {
                    if (!skip) {
                        uid = part + (uid ? '/' + uid : '');
                    } else {
                        skip--;
                    }
                }
            }
        }

        if (skip > 0) { 
            while(skip) {
                uid = '../' + uid;
                skip--;
            }
            throw new Error('Module id should not go back beyond package root. Id ' + id + ' expanded to ' + uid);
        }

        return {
            pkg: pkg,
            id: uid,
            url: pkg.base + uid + '.js'
        };
    }

    function instantiate(pkg, id, done, event) {
        var module = new WebModule(pkg, id, event.target.response);
        cache[module.url] = module;
        if (done) {
            if (module.isLoaded()) {
                done();
            } else {
                module.once('load', done);
            }
        }
    }

    /**
     * Return null if module is already present in cache. In that case no action will be taken.
     * Otherwise make ajax request and return request object
     */
    function fetch(context, id, done) {
        var resolved = resolve(context, id);
        if (cache[resolved.url]) {
            return false;
        }
        console.log('Module ' + resolved.pkg.name + '/' + resolved.id + ' requested');
        return ajax(resolved.url, instantiate.bind(null, resolved.pkg, resolved.id, done));
    }

    function require(context, id) {
        var url = resolve(context, id).url;
        if (cache[url]) {
            return cache[url].exports;
        }
        throw new Error('Module not loaded: ' + url);
    }

    function use(pkg) {
        if (typeof pkg == 'string') {
            ajax(pkg, use);
            return;
        }
        if (!pkg.name || !pkg.url) {
            throw new Error("It does not look like valid package: ", pkg);
        }
        root.nested[pkg.name] = new WebPackage(pkg.name);
    }

    function define(url, factory) {
        var mod = cache[url];
        if (!mod) {
            throw new Error('Module not loaded: ' + url);
        }
        mod.define(factory);
    }

    main = new WebModule(root, 'main');
    exports = require.bind(null, main);
    exports.use = use;
    exports.main = main;
    exports.cache = cache;
    exports.async = fetch.bind(null, main);
    return exports;
}());
