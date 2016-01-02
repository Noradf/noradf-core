module.exports = function (assets) {
    console.log('testmodule is initializing');
    assets.put(this, 'hello', 'world');
};