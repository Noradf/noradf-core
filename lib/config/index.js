'use strict';

var _ = require('lodash'),
    path = require('path'),
    fs = require('fs');

module.exports = function () {
    var configPath = path.join(path.resolve('.'), 'config/env');

    process.env.NODE_ENV = process.env.NODE_ENV || 'development';

    var common = path.join(configPath, 'common.json');
    if (!fs.existsSync(common)) {
        console.warn('File ' + common + ' doesn\'t exist. Using default configuration');
        return {};
    }

    var env = path.join(configPath, process.env.NODE_ENV + '.json');
    if (!fs.existsSync(env)) {
        console.warn('File ' + env + ' doesn\'t exist');
        env = {};
    }

    return _.extend(
        require(common),
        (env.length ? require(env) : {})
    );
};