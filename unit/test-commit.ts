/// <reference path='../defs/node-0.8.d.ts' />
/// <reference path='../lib/shared.ts' />

module testcommit {

  import utils = shared.utils;
  import message = shared.message;
  import mod = shared.main;

  function newPrimary() {
    mod.PrimaryStore._primaryStore = null;
    var s = mod.createStore();
    utils.dassert(s === mod.PrimaryStore._primaryStore);
    return s;
  }
  
  export function create(test) {
    var m = newPrimary();
    var n = mod.createStore();
    var o = mod.createStore();
    test.ok(m !== n);
    test.ok(m !== o);
    test.ok(n !== o);
    test.done();
  };

  export function primaryEmptyCommit(test) {
    var s = newPrimary();
    var db = s.store();
    test.ok(utils.isObject(db));
    test.ok(s.commit());
    test.done();
  };

  export function primaryAssign(test) {
    var s = newPrimary();
    var db = s.store();
    test.ok(utils.isObject(db));
    db.a = 1;
    test.ok(s.commit());
    test.ok(db._tracker._rev === 1);
    test.done();
  };


  /*

  exports.init = function (test) {
    var m: shared.main.Store = new mod.Store();
    var n: shared.main.Store = new mod.Store();
    test.ok(m !== n);
    test.ok(m.isPrimaryStore());
    test.ok(!n.isPrimaryStore());
    test.ok(mod.primaryStore() === m);
    test.done();
  };

  exports.startup = function (test) {
    var m = primary();
    var s = new mod.Store();
    while (s.pending()) { }
    test.ok(s.root()._tracker._id === m.root()._tracker._id);
    test.done();
  }

  exports.startup2 = function (test) {
    var m = primary();
    var s1 = new mod.Store();
    while (s1.pending()) { }
    test.ok(s1.root()._tracker._id === m.root()._tracker._id);
    var s2 = new mod.Store();
    while (s2.pending()) { }
    test.ok(s2.root()._tracker._id === m.root()._tracker._id);
    test.done();
  }

  exports.startup3 = function (test) {
    var m = primary();
    var s1 = new mod.Store();
    var s2 = new mod.Store();
    while (s1.pending()) { }
    test.ok(s1.root()._tracker._id === m.root()._tracker._id);
    while (s2.pending()) { }
    test.ok(s2.root()._tracker._id === m.root()._tracker._id);
    test.done();
  }

  exports.getroot = function (test) {
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

  exports.writeprop = function (test) {
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
  */
}
