/*global require, exports, module*/

/**
 *
 * Roadmap:
 *  * Add support for amd modules
 */
var loader = require('./webloader'),
    pathutil = require('./pathutil'),
    WebPackage = require('./webpackage'),
    WebModule = require('./webmodule'),

    root = new WebPackage(pathutil.dirname(window.location.pathname), {name: "__main__"}),
    main = new WebModule(root, 'main');

exports = module.exports = loader.get.bind(loader, main);
exports.use = loader.use.bind(loader);
exports.cache = loader.cache;
exports.async = loader.fetch.bind(loader, main);
