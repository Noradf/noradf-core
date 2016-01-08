'use strict';

var express = require('express'),
    logger = require('morgan'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    flash = require('connect-flash'),
    passport = require('passport'),
    expressValidator = require('express-validator'),
    consolidate = require('consolidate'),
    errorHandler = require('errorhandler'),
    fs = require('fs'),
    path = require('path');

module.exports = function (config, modules) {

    function ExpressServer(config) {
        this.config = config;

        this.app = express();

        if (this.config.disablePoweredBy === undefined || this.config.disablePoweredBy) {
            this.app.disable('x-powered-by');
        }

        if (process.env.NODE_ENV === 'development') {
            this.app.use(logger('dev'));
        }

        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({
            extended: true
        }));

        var sessionLayer = {};
        Object.defineProperty(sessionLayer, 'session', {
            configurable: true,
            enumerable: true,
            get: function () {
                return function () {
                    return function session(req, res, next) {
                        next();
                    }
                };
            }
        });

        this.app.use(sessionLayer.session());
        this.app.use(expressValidator());
        this.app.use(methodOverride());
        this.app.use(flash());

        this.app.use(function(req, res, next) {
            if (req.session) {
                res.locals.messages = req.flash();
            }

            next();
        });

        this.app.engine('html', (config.express && config.express.engines && config.express.engines.default && consolidate[config.express.engines.default]) || consolidate.swig);

        if (config.express && config.express.engines) {
            var engines = Object.keys(config.express.engines);
            engines.forEach(function (engine) {
                if (engine === 'default') {
                    return;
                }

                if (consolidate[engines[engine]]) {
                    this.app.engine(engine, consolidate[engines[engine]]);
                }
            });
        }

        this.app.set('view engine', 'html');

        this.app.use(passport.initialize());
        this.app.use(passport.session());

        this.passport = passport;

        this.port = process.env.PORT || this.config.port || 3000;
        this.app.set('port', this.port);

        var bowerPath = path.join(path.resolve('.'), 'bower_components');
        if (fs.existsSync(bowerPath)) {
            this.app.use('/plugins', express.static(bowerPath));
        }
    }

    ExpressServer.prototype.start = function (cb) {
        var self = this;
        var Noradf = require('../index');

        var routes = [];
        modules.forEach(function (module) {
            Noradf.get(module.alias);

            var routesPath = path.join(module.path, 'server', 'routes');
            if (!fs.existsSync(routesPath)) {
                console.warn('Directory ' + routesPath + ' doesn\'t exist')
            }
            else {
                console.log('Registering ' + module.name + ' routes');

                var dir = fs.readdirSync(routesPath);
                dir.forEach(function (file) {
                    var route = require(path.join(routesPath, file));
                    var routeName = module.name + '_route_' + file;
                    console.log('Registering route ' + file);
                    Noradf.register(routeName, route);
                    routes.push(routeName);
                });
            }

            var assetsPath = path.join(module.path, 'public', 'assets');
            if (!fs.existsSync(assetsPath)) {
                console.warn('Not static assets found');
            }
            else {
                fs.readdirSync(assetsPath).forEach(function (file) {
                    var fileName = path.join(assetsPath, file);
                    var stat = fs.lstatSync(fileName);

                    if (stat.isDirectory()) {
                        console.log('Registering static ' + '/' + module.name + '/static/' + file);
                        self.app.use('/' + module.name + '/static/' + file, express.static(fileName));
                    }
                });
            }

            var viewsPath = path.join(module.path, 'public', 'views');
            if (!fs.existsSync(viewsPath)) {
                return console.warn('Not static views found');
            }
            else {
                var stat = fs.lstatSync(viewsPath);
                if (stat.isDirectory()) {
                    console.log('Registering ' + '/' + module.name + '/views');
                    self.app.use('/' + module.name + '/views', express.static(viewsPath));
                }
                else {
                    return console.warn('\"views\" must be a directory');
                }
            }
        });

        routes.forEach(function (route) {
            Noradf.get(route);
        });

        this.app.use(function (req, res) {
            res.status(404).json({
                url: req.originalUrl,
                error: 'Not found'
            });
        });

        if (process.env.NODE_ENV === 'development') {
            this.app.use(errorHandler());
        }

        this.app.listen(self.port, function () {
            console.log('Server listening at port %s', self.port);
            return cb && cb();
        });
    };

    return new ExpressServer(config);
};
