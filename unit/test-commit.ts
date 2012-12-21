/// <reference path='../defs/node-0.8.d.ts' />
/// <reference path='../lib/store.ts' />

module testcommit {

  import utils = shared.utils;
  import message = shared.message;
  import mod = shared.store;

  var util = require('util');

  function newPrimary() : shared.store.PrimaryStore {
    if (mod.PrimaryStore._primaryStore != null)
      mod.PrimaryStore._primaryStore.stop();
    mod.PrimaryStore._primaryStore = null;
    //utils.defaultLogger().enableDebugLogging('STORE');
    //utils.defaultLogger().enableDebugLogging('ROUTER');
    var s = mod.createStore();
    utils.dassert(s === mod.PrimaryStore._primaryStore);
    return <shared.store.PrimaryStore> s;
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

  export function emptyCommit(test) {
    var s = newPrimary();
    var db = s.store();
    test.ok(utils.isObject(db));
    test.ok(s.commit());
    test.done();
  };

  export function simpleAssign(test) {
    var s = newPrimary();

    var db = s.store();
    test.ok(utils.isObject(db));
    db.a = 1;
    test.ok(s.commit());
    test.ok(db._tracker._rev === 1);

    var db = s.store();
    test.ok(utils.isObject(db));
    db.a = 2;
    test.ok(s.commit());
    test.ok(db._tracker._rev === 2);

    var db = s.store();
    test.ok(utils.isObject(db));
    db.a = 'foo';
    test.ok(s.commit());
    test.ok(db._tracker._rev === 3);

    var db = s.store();
    test.ok(utils.isObject(db));
    db.a = false;
    test.ok(s.commit());
    test.ok(db._tracker._rev === 4);

    var db = s.store();
    test.ok(utils.isObject(db));
    db.a = null;
    test.ok(s.commit());
    test.ok(db._tracker._rev === 5);

    var db = s.store();
    test.ok(utils.isObject(db));
    db.a = undefined;
    test.ok(s.commit());
    test.ok(db._tracker._rev === 6);

    test.done();
  };

  export function objectAssign(test) {
    var s = newPrimary();

    var db = s.store();
    test.ok(utils.isObject(db));
    db.a = {};
    test.ok(s.commit());
    test.ok(db._tracker._rev === 1);
    test.ok(utils.isEqual(db, { a: {} }));
    test.done();
  };

  export function arrayAssign(test) {
    var s = newPrimary();

    var db = s.store();
    test.ok(utils.isObject(db));
    db.a = [];
    test.ok(s.commit());
    test.ok(db._tracker._rev === 1);
    test.ok(utils.isEqual(db, { a: [] }));
    test.done();
  };

  export function nestedObjectAssign(test) {
    var s = newPrimary();

    var db = s.store();
    test.ok(utils.isObject(db));
    db.a = { b: {} };
    test.ok(s.commit());
    test.ok(db._tracker._rev === 1);
    test.ok(utils.isEqual(db, { a: { b: {} } }));
    test.done();
  };

  export function nestedArrayAssign(test) {
    var s = newPrimary();

    var db = s.store();
    test.ok(utils.isObject(db));
    db.a = [ [0] ];
    test.ok(s.commit());
    test.ok(db._tracker._rev === 1);
    test.ok(utils.isEqual(db, { a: [[0]] }));
    test.done();
  };

  export function secondaryEmpty(test) {
    var p = newPrimary();

    var s = new shared.store.SecondaryStore();
    s.atomic(function (db) {
      // Empty
    }, function (err) {
      test.ok(err == null);
      s.atomic(function (db) {
        // Empty
      }, function (err) {
        test.ok(err == null);
        test.done();
      });
    });
  }

  export function secondaryAssign(test) {
    var p = newPrimary();
    var s = new shared.store.SecondaryStore();
    s.atomic(function (db) {
      test.ok(utils.isObject(db));
      db.a = 1;
    }, function (err) {
      test.ok(err === null);
      test.done();
    });
  }

  export function secondaryAssignBadRev(test) {
    var p = newPrimary();
    p.store()._tracker._rev = 1;

    var s = new shared.store.SecondaryStore();
    s.atomic(function (db) {
      test.ok(utils.isObject(db));
      db.a = 1;
    }, function (err) {
      test.ok(err === null);
      test.done();
    });
  }

  export function secondaryAssignOverwrite(test) {
    var p = newPrimary();
    p.store().a = 1;
    p.store().b = 2;
    p.store()._tracker._rev = 1;

    var s = new shared.store.SecondaryStore();
    s.atomic(function (db) {
      test.ok(utils.isObject(db));
      db.a = 3;
    }, function (err) {
      test.ok(err === null);
      test.ok(p.store().a == 3);
      test.ok(p.store().b == 2);
      test.done();
    });
  }

  export function secondaryNested(test) {
    var p = newPrimary();
    p.atomic(function (db) {
      db.a = { b: 0 };
    });

    var s = new shared.store.SecondaryStore();
    s.atomic(function (db) {
      test.ok(utils.isObject(db));
      db.a.b += 1;
    }, function (err) {
      test.ok(err == null);
      test.ok(p.store().a.b == 1);
      test.done();
    });
  }

  export function secondaryNestedDouble(test) {
    var p = newPrimary();
    p.atomic(function (db) {
      db.a = { count: 0 };
      db.b = { count: 0 };
    });

    var s = new shared.store.SecondaryStore();
    s.atomic(function (db) {
      test.ok(utils.isObject(db));
      db.a.count += 1;
      db.b.count += 1;
    }, function (err) {
      test.ok(err == null);
      test.ok(p.store().a.count == 1);
      test.ok(p.store().b.count == 1);
      test.done();
    });
  }

}
