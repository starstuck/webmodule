WebModule
=========

Proof of concept for browser JS loader compatible with CommonJS Modules/1.1 and Packages/1.0 specification. My goal is to use npm packages to manage fe assets and share some libraries between server and browser code.

Roadmap
-------
 * Add full support of CommonJS Packages
 * Add compatibility layer for AMD modules
 * Add support of module live reload (to some extend)
 * (Maybe) Make ECMA Script 6 ready

References
----------
Normative documents influencing this implementation
 * http://wiki.commonjs.org/wiki/Modules/1.1.1
 * http://wiki.commonjs.org/wiki/Packages/1.0
 * http://wiki.commonjs.org/wiki/Packages/A

In later stage we mayconsider to add ECMA Script 6 compatibility
 * http://wiki.ecmascript.org/doku.php?id=harmony:modules
 * http://wiki.ecmascript.org/doku.php?id=harmony:module_loaders
 * http://wiki.ecmascript.org/doku.php?id=strawman:modules_packages
