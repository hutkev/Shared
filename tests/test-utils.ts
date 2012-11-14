/// <reference path='../defs/node-0.8.d.ts' />
/// <reference path='../lib/lib.d.ts' />

var utils: shared.utils = require('../lib/lib.js').utils;

exports.exports = function(test) {
  var clog = new utils.ConsoleLogger(null, utils.LogLevel.DEBUG, 'foo');
  var flog = new utils.FileLogger('./foo',clog, utils.LogLevel.DEBUG, 'foo');

  clog.debug('foo', 'Hello %s','foo');
  test.done();
};

