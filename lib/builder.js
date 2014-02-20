/*global module*/

var loader = require('./fsloader');


module.exports = (function Builder(){
    var builder = this || {},
        outdir = './dist';

    function loadmods(pkg, ) {
        loader.fetch(pkg, modname);
    };

    function loadpkg(options) {
    };

    function buildpkg() {
    }

    /**
     * Build all packages from your project, considering inter package dependencies
     * 
     * Example configuration: 
     *
     * [{
     *     name: 'myapp-init',
     *     folder: 'lib/core',
     *     includes: ['initGame.']
     * }, { 
     *     name: 'myapp-core',
     *     folder: 'lib/core',
     
     * }, { 
     *     name: 'myapp-game-mobile',
     *     folder: 'lib/game',
     *     includes: ['mobileinitialiser']
     * }, { 
     *     name: 'myapp-game-tablet',
     *     folder: 'lib/game',
     *     includes: ['tabletinitialiser']
     * }]
     */
    builder.build = function (packages) {
        packages.map(loadpkg).reduce;
    };

    return builder;
});
