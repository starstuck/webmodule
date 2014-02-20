/*global exports*/
"use strinct";

// Returns directory part of path with trailing '/'
function dirname(url) {
    return url.replace(/[^/]+$/, '');
}
exports.dirname = dirname;


// Returns array with package, module id and url
exports.resolve = function resolve(context, id) {
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
};

