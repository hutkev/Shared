/// <reference path='../defs/node-0.8.d.ts' />
/// <reference path='../lib/store.ts' />

module testundo {

  import utils = shared.utils;
  import tracker = shared.tracker;
  import mod = shared.store;

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

  export function newProps(test) {
    var p = newPrimary();
    var db = p.store();
    db.a = 1;
    db.b = true;
    db.c = '';
    db.d = null;
    db.e = undefined;
    db.f = new Number(0);
    db.g = new Date();
    db.h = function () { };
    db.i = {};
    db.j = [];
    db.k = { a: {} };
    db.l = [[]];
    db.m = { a: [] };;
    db.n = [{}];
    Object.defineProperty(db, 'o', {
      value: 1
    });
    p.undo();
    test.ok(utils.isEqual(db, {}));
    test.done();
  };

  export function changeProps(test) {
    var p = newPrimary();
    var db = p.store();
    db.a = 1;
    p.commit();
    db.a = null;
    p.undo();
    test.ok(utils.isEqual(db, {a: 1}));
    db.a = undefined;
    p.undo();
    test.ok(utils.isEqual(db, {a: 1}));
    db.a = '';
    p.undo();
    test.ok(utils.isEqual(db, {a: 1}));
    db.a = 0;
    p.undo();
    test.ok(utils.isEqual(db, {a: 1}));
    db.a = new Date();
    p.undo();
    test.ok(utils.isEqual(db, {a: 1}));
    db.a = function () { };
    p.undo();
    test.ok(utils.isEqual(db, {a: 1}));
    db.a = {};
    p.undo();
    test.ok(utils.isEqual(db, {a: 1}));
    db.a = [];
    p.undo();
    test.ok(utils.isEqual(db, {a: 1}));
    test.done();
  };

  export function deleteProp(test) {
    var p = newPrimary();
    p.atomic(function (db) {
      db.a = 1;
    });

    var s = new shared.store.SecondaryStore();
    s.atomic(function (db) {
      delete db.a;
      throw new Error('Silly');
    }, function (err, arg) {
      s.atomic(function (db) {
        test.ok(db.a === 1);
      }, function (err, arg) {
        test.ok(err === null);
        test.done();
      });
    });
  }

  export function deleteNestedProp(test) {
    var p = newPrimary();
    p.atomic(function (db) {
      db.a = { b: 1 };
    });

    var s = new shared.store.SecondaryStore();
    s.atomic(function (db) {
      delete db.a.b;
      throw new Error('Silly');
    }, function (err, arg) {
      s.atomic(function (db) {
        test.ok(db.a.b === 1);
      }, function (err, arg) {
        test.ok(err === null);
        test.done();
      });
    });
  }


} // testundo