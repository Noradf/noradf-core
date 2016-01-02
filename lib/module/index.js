'use strict';

function Module(name, alias, version, path) {
    this.name = name;
    this.alias = alias;
    this.version = version;
    this.path = path;
}

module.exports = Module;