/// <reference path='../defs/node-0.8.d.ts' />

import shared = module('../lib/shared');

var _ = require('underscore');

exports.init = function(test) {
  var m = new shared.Store();
  test.ok(_.isEqual(m.root(),{}));
  test.ok(m.master() === m);
  test.done();
};

exports.emptySaveObj = function(test) {
  var m = shared.Store.prototype.master();

  var s = new shared.Store();
  s.save(function(root) {
    root.a = 1;
  },function(ok) {
    console.log(m.root());
  });
  test.done();
}

