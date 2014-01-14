/*global Blob, URL, document, btoa*/
var require = (function () {
    var root = new WebPackage(dirname(window.location.pathname), {name: "__main__"}),
        counter = 0,
        cache = {},
        main,
        exports;

    function WebModule(pkg, id, body) {
        var module = this,
            url = pkg.base + id + '.js',
            cbName = '_cb' + (++counter),
            depsLeft = 0,
            data,
            map;

        console.log('Instantiating new module:', pkg, id, body);

        function onDependencyLoad() {
            if ((-- depsLeft) <= 0) {
                console.log('Adding module ' + id + ' script tag', module._script);
                document.head.appendChild(module._script);
            }
        }

        function onLoad() {
            exports[cbName](module.exports, require.bind(null, module), module);
            console.log('Module loaded');
        }
        
        this.pkg = pkg;
        this.id = id;
        this.exports = {};

        if (body) {
            body.replace(/require\(['"]([a-zA-Z_/.-]+)['"]\)/g, function(match, dep) {
                console.log('Found nested dependency: ', arguments);
                if (fetch(module, dep, onDependencyLoad)) depsLeft ++;
                return match[0];
            });

            map = {
                version: 3,
                sources: [url],
                mappings: [
                    'A',
                    'B',
                    'C'
                ].join(';')
            };

            data = new Blob([
                'require.' + cbName + ' = function(exports, require, module){\n',
                body, 
                '};\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,',
                btoa(JSON.stringify(map))
            ], {type: 'application/javascript'});

            this._script = document.createElement('script');
            this._script.src = URL.createObjectURL(data);
            this._script.addEventListener('load', onLoad);

            if (!depsLeft) onDependencyLoad();
        }
    };

    function WebPackage(path, json) {
        // Base directory should always be with /
        this.base = dirname(path) + ((json.directories && json.directories.lib) ? json.directories.lib : '');

        // Full url to pkg main script
        if (json.main) {
            this.main = this.base + 'index.js';
        }

        this.name = json.name;

        // TODO: process dependencies
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

    function instantiate(pkg, id, done, event) {
        var module = new WebModule(pkg, id, event.target.response);
        cache[pkg.base + module.id + '.js'] = module;
        console.log('Having cache:', cache);
        module._script.addEventListener('load', done);
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
            if (!pkg) throw new Error('Unknown top level package: ' + first);
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

        console.log('Resolved module to: ', pkg, pkg.base, uid);
        return {
            pkg: pkg,
            id: uid,
            url: pkg.base + uid + '.js'
        };
    }

    // Return null if module is already present in cache
    function fetch(context, id, done) {
        console.log('Fetching module: ', context, id);
        var resolved = resolve(context, id);
        // TODO: add suport for situation when module is instantiated, but still waiting for load
        if (cache[resolved.url]) {
            return false;
        }
        return ajax(resolved.url, instantiate.bind(null, resolved.pkg, resolved.id, done));
    }

    function require(context, id) {
        var url = resolve(context, id).url;
        if (cache[url]) {
            return cache[url].exports;
        }
        throw new Error('Module was not pre-fetched: ' + url);
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

    main = new WebModule(root, 'main');
    exports = require.bind(null, main);
    exports.use = use;
    exports.main = main;
    exports.cache = cache;
    exports.async = fetch.bind(null, main);
    return exports;
}());
