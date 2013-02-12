/// <reference path='../defs/node-0.8.d.ts' />
/// <reference path='../lib/store.ts' />

module testcommit {

  import utils = shared.utils;
  import mod = shared.store;

  var util = require('util');
  var store: shared.store.MongoStore = null;

  function newPrimary(): shared.store.MongoStore {
    //utils.defaultLogger().enableDebugLogging('STORE');
    if (store != null)
      store.close();
    store = new shared.store.MongoStore();
    return store;
  }
  
  export function create(test) {
    var m = newPrimary();
    var n = mod.createStore({});
    var o = mod.createStore({});
    test.ok(m !== n);
    test.ok(m !== o);
    test.ok(n !== o);
    n.close();
    o.close();
    test.done();
  };

  export function emptyCommit(test) {
    var s = newPrimary();
    s.apply(function (db) {
      test.ok(utils.isObject(db));
    }, function (err) {
      test.ok(err === null);
      s.close();
      test.done();
    });
  };

  function assign(test, setter, tester) {
    var s = newPrimary();

    var rev;
    s.apply(function (db) {
      rev = db._tracker._rev;
      setter(db);
      return db;
    }, function (err, ret) {
      test.ok(err === null);
      test.ok(tester(ret));
      test.ok(ret._tracker._rev === rev + 1);
      s.apply(function (db) {
        delete db.a;
      }, function (err) {
        test.ok(err === null);
        s.close();
        test.done();
      });
    });
  }

  export function simpleAssignNumber(test) {
    assign(test, function (db) { db.a = 1 }, function (db) { return db.a === 1 });
  }

  export function simpleAssignNumber2(test) {
    assign(test, function (db) { db.a = 2 }, function (db) { return db.a === 2 });
  }

  export function simpleAssignString(test) {
    assign(test, function (db) { db.a = 'foo' }, function (db) { return db.a === 'foo' });
  }

  export function simpleAssignBool(test) {
    assign(test, function (db) { db.a = true }, function (db) { return db.a === true });
  }

  export function simpleAssignNull(test) {
    assign(test, function (db) { db.a = null }, function (db) { return db.a === null });
  }

  export function simpleAssignUndefined(test) {
    assign(test, function (db) { db.a = undefined }, function (db) { return db.a === undefined });
  }

  export function simpleAssignObject(test) {
    assign(test, function (db) { db.a = {} }, function (db) { return utils.isEqual(db.a,{}) });
  }

  export function simpleAssignArray(test) {
    assign(test, function (db) { db.a = [] }, function (db) { return utils.isEqual(db.a, []) });
  }

  export function simpleAssignNestedObject(test) {
    assign(test, function (db) { db.a = { b: {} } }, function (db) { return utils.isEqual(db.a, { b: {} }) });
  }

  export function simpleAssignNestedArray(test) {
    assign(test, function (db) { db.a = [[0]] }, function (db) { return utils.isEqual(db.a, [[0]]) });
  }

  function initAndAssign(test, init, setter, tester) {
    var s = newPrimary();
    s.apply(function (db) {
      init(db);
      return db;
    }, function (err, ret) {
      test.ok(err === null);
      s.apply(function (db) {
        setter(db);
      }, function (err) {
        test.ok(err === null);
        s.apply(function (db) {
          return tester(db);
        }, function (err, ok) {
          test.ok(err === null);
          test.ok(ok);
          s.close();
          test.done();
        });
      });
    });
  }

  export function assignOverwrite(test) {
    initAndAssign(test,
      function (db) { db.a = 1; db.b = 2; },
      function (db) { db.a = 3; },
      function (db) { var x = db.a; delete db.a; delete db.b; return x === 3 }
    );
  }

  export function assignNested(test) {
    initAndAssign(test,
      function (db) { db.a = { b: 0 } },
      function (db) { db.a.b = 1; },
      function (db) { var x = db.a.b; delete db.a; return x === 1 }
    );
  }

  export function assignNested2(test) {
    initAndAssign(test,
      function (db) { db.a = { count: 1 }; db.b = { count: 1 } },
      function (db) { db.a.count += 1; db.b.count -= 1; },
      function (db) {
        var x = db.a.count;
        var y = db.b.count;
        delete db.a;
        delete db.b;
        return x === 2 && y === 0;
      }
    );
  }

  export function delProp(test) {
    initAndAssign(test,
      function (db) { db.a = 1 },
      function (db) { delete db.a },
      function (db) { return db.a === undefined;}
    );
  }

  export function delNested(test) {
    initAndAssign(test,
      function (db) { db.a = {} },
      function (db) { delete db.a },
      function (db) { return db.a === undefined; }
    );
  }

  export function delDoubleNested(test) {
    initAndAssign(test,
      function (db) { db.a = { b: {} } },
      function (db) { delete db.a.b },
      function (db) { var ok = db.a.b === undefined; delete db.a; return ok}
    );
  }

  export function arrayDel(test) {
    initAndAssign(test,
      function (db) { db.a = [1,2,3] },
      function (db) { delete db.a[1] },
      function (db) { var ok = utils.isEqual(db.a, [1, , 3]); delete db.a; return ok }
    );
  }
  
  export function arraySort(test) {
    initAndAssign(test,
      function (db) { db.a = [4,2,3,1] },
      function (db) { db.a.sort() },
      function (db) { var ok = utils.isEqual(db.a, [1,2,3,4]); delete db.a; return ok }
    );
  }

  export function arrayReverse(test) {
    initAndAssign(test,
      function (db) { db.a = [4, 2, 3, 1] },
      function (db) { db.a.reverse() },
      function (db) { var ok = utils.isEqual(db.a, [1, 3, 2, 4]); delete db.a; return ok }
    );
  }

  export function arrayShift1(test) {
    initAndAssign(test,
      function (db) { db.a = [4, 2, 3, 1] },
      function (db) { db.a.shift() },
      function (db) { var ok = utils.isEqual(db.a, [2, 3, 1]); delete db.a; return ok }
    );
  }

  export function arrayShift2(test) {
    initAndAssign(test,
      function (db) { db.a = [4, 2, 3, 1] },
      function (db) { db.a.splice(1,2) },
      function (db) { var ok = utils.isEqual(db.a, [4, 1]); delete db.a; return ok }
    );
  }

  export function arrayShift3(test) {
    initAndAssign(test,
      function (db) { db.a = [4, 2, 3, 1] },
      function (db) { db.a.splice(3, 2) },
      function (db) { var ok = utils.isEqual(db.a, [4, 2, 3]); delete db.a; return ok }
    );
  }

  export function arrayUnShift1(test) {
    initAndAssign(test,
      function (db) { db.a = [4, 2, 3, 1] },
      function (db) { db.a.unshift(5) },
      function (db) { var ok = utils.isEqual(db.a, [5, 4, 2, 3, 1]); delete db.a; return ok }
    );
  }

  export function arrayUnShift2(test) {
    initAndAssign(test,
      function (db) { db.a = [4, 2, 3, 1] },
      function (db) { db.a.unshift(5,6) },
      function (db) { var ok = utils.isEqual(db.a, [5, 6, 4, 2, 3, 1]); delete db.a; return ok }
    );
  }

  export function arrayUnShift3(test) {
    initAndAssign(test,
      function (db) { db.a = [4, 2, 3, 1] },
      function (db) { db.a.splice(1,0,5,6) },
      function (db) { var ok = utils.isEqual(db.a, [4, 5, 6, 2, 3, 1]); delete db.a; return ok }
    );
  }

  export function arraySplice(test) {
    initAndAssign(test,
      function (db) { db.a = [4, 2, 3, 1] },
      function (db) { db.a.splice(1, 2, 7, 8) },
      function (db) { var ok = utils.isEqual(db.a, [4, 7, 8, 1]); delete db.a; return ok }
    );
  }

  export function wrappedPush(test) {
    initAndAssign(test,
      function (db) { db.a = [] },
      function (db) { db.a.push(1) },
      function (db) { var ok = utils.isEqual(db.a, [1]); delete db.a; return ok }
    );
  }
}
