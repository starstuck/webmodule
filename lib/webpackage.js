/*global require, module*/
"use strict";

var pathutil = require('./pathutil');


module.exports = function WebPackage(path, json) {
    var pkg = this || {};

    pkg.name = json.name;
    // Base directory should always be with /
    pkg.base = pathutil.dirname(path) + ((json.directories && json.directories.lib) ? json.directories.lib : '');
    // Full url to pkg main script
    if (json.main) {
        pkg.main = pkg.base + 'index.js';
    }
    // TODO: process dependencies, with package reuse when exact version matches
    pkg.nested = {};

    return pkg;
};
