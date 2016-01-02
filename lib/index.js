'use strict';

var path = require('path'),
    fs = require('fs'),
    _ = require('lodash'),
    Wlist = require('wlist');

var container = require('dependable').container;

var instance = null;

var Module = require('./module');
var modules = [];

function findModules(config) {
    var config = config.modules || {};

    var modulesPath = path.join(path.resolve('.'), (config.modulesDir || 'modules'));

    if (!fs.existsSync(modulesPath)) {
        return console.warn('Directory ' + modulesPath + ' doesn\'t exist')
    }

    var dirs = fs.readdirSync(modulesPath);
    dirs.forEach(function (dir) {
        if (dir.startsWith('.')) {
            return;
        }

        console.log('Find module in ' + dir + ' directory');
        var modulePath = path.join(modulesPath, dir);
        var moduleJSONPath = path.join(modulePath, 'module.json');

        if (!fs.existsSync(moduleJSONPath)) {
            return console.error('File ' + moduleJSONPath + ' doesn\'t exist');
        }

        var moduleJson = JSON.parse(fs.readFileSync(moduleJSONPath).toString());

        var moduleJsPath = path.join(modulesPath, dir, 'module.js');
        if (!fs.existsSync(moduleJsPath)) {
            return console.error('File ' + moduleJsPath + ' doesn\'t exist');
        }

        var source = require(moduleJsPath);

        var alias = moduleJson.name;
        if (alias.indexOf('-') !== -1) {
            alias = alias.replace(/[-]/g, '_');
        }

        var module = new Module(moduleJson.name, alias, moduleJson.version, modulePath);
        module.source = source || {};
        module.source._module = module;
        modules.push(module);
    });
}

function Noradf() {
    container.call(this);
    instance = this;
    var self = this;

    self.version = require('../package').version;
    self.config = require('./config')();

    self.register('config', self.config);
    self.register('modules', modules);

    self.register('assets', function () {
        var assets = {};
        return {
            put: function (module, type, assetPath, weight, name) {
                if (!assets[type]) {
                    assets[type] = new Wlist();
                }

                var moduleName = module.func._module.name;
                assets[type].put({module: moduleName, path: _.includes(['css', 'js'], type) ? path.join(moduleName, 'static', assetPath) : assetPath}, name, weight);
            },
            get: function (type) {
                if (type) {
                    return assets[type] ? assets[type].get() : [];
                }

                var allAssets = {};
                Object.keys(assets).map(function (type) {
                    allAssets[type] = assets[type].get();
                });

                return allAssets || [];
            }
        };
    });

    self.register('server', require('./server'));

    self.register('app', function (server) {
        return server.app;
    });

    self.register('passport', function (server) {
        return server.passport;
    });

    self.register('router', function (app) {
        return {
            session: function (fn) {
                if (!fn) {
                    return;
                }

                var layer = _.find(app._router.stack, {name: 'session'});
                layer.handle = fn;
            }
        };
    });

    findModules(self.config);
    modules.forEach(function (module) {
        console.log("Registering module " + module.name + ' with name ' + module.alias);
        self.register(module.alias, module.source);
    });
}

Noradf.prototype = new container();

Noradf.prototype.startServer = function (cb) {
    if (this.active) {
        return;
    }

    this.server = this.get('server');
    this.server.start(cb);
    this.active = true;
};

module.exports = instance || new Noradf();