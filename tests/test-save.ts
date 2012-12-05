/// <reference path='../defs/node-0.8.d.ts' />
/// <reference path='../lib/shared.d.ts' />

var mod = require('../lib/shared.js');

function primary() {
  var m = mod.primaryStore();
  if (m === null) {
    new mod.Store();
  }
  return mod.primaryStore();
}

exports.init = function(test) {
  var m :shared.main.Store = new mod.Store();
  var n :shared.main.Store = new mod.Store();
  test.ok(m !== n);
  test.ok(m.isPrimaryStore());
  test.ok(!n.isPrimaryStore());
  test.ok(mod.primaryStore() === m);
  test.done();
};

exports.startup = function(test) {
  var m = primary();
  var s = new mod.Store();
  while (s.pending()) { }
  test.ok(s.root()._tracker._id === m.root()._tracker._id);
  test.done();
}

exports.startup2 = function(test) {
  var m = primary();
  var s1 = new mod.Store();
  while (s1.pending()) { }
  test.ok(s1.root()._tracker._id === m.root()._tracker._id);
  var s2 = new mod.Store();
  while (s2.pending()) { }
  test.ok(s2.root()._tracker._id === m.root()._tracker._id);
  test.done();
}

exports.startup3 = function(test) {
  var m = primary();
  var s1 = new mod.Store();
  var s2 = new mod.Store();
  while (s1.pending()) { }
  test.ok(s1.root()._tracker._id === m.root()._tracker._id);
  while (s2.pending()) { }
  test.ok(s2.root()._tracker._id === m.root()._tracker._id);
  test.done();
}

exports.getroot = function(test) {
  var m = primary();
  var s = new mod.Store();

  test.expect(2);
  s.save(
    function (root: any) {
      test.ok(root === s.root());
    },
    function (sucesss: bool) {
      test.ok(sucesss);
      test.done();
    }
  );
}

exports.getroot2 = function (test) {
  var m = primary();
  var s = new mod.Store();

  test.expect(4);
  s.save(
    function (root: any) {
      test.ok(root === s.root());
    },
    function (sucesss: bool) {
      test.ok(sucesss);
    }
  );

  s.save(
    function (root: any) {
      test.ok(root === s.root());
    },
    function (sucesss: bool) {
      test.ok(sucesss);
      test.done();
    }
  );
}

exports.writeprop = function(test) {
  var m = primary();
  var s = new mod.Store();

  test.expect(2);
  s.save(
    function (root: any) {
      test.ok(root === s.root());
      root.a = 1;
    },
    function (sucesss: bool) {
      test.ok(sucesss);
      test.done();
    }
  );
}

