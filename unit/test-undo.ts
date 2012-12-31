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
    var s = new mod.PrimaryStore();
    utils.dassert(s === mod.PrimaryStore._primaryStore);
    return s;
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

  export function deleteNestedProp2(test) {
    var p = newPrimary();
    p.atomic(function (db) {
      db.a = [ 1 ];
    });

    var s = new shared.store.SecondaryStore();
    s.atomic(function (db) {
      delete db.a[0];
      throw new Error('Silly');
    }, function (err, arg) {
      s.atomic(function (db) {
        test.ok(db.a[0] === 1);
      }, function (err, arg) {
        test.ok(err === null);
        test.done();
      });
    });
  }

  export function newArrayProps(test) {
    var p = newPrimary();
    var db = p.store();
    db.a = [];
    p.commit();
    db.a[0] = 1;
    p.undo();
    test.ok(utils.isEqual(db, {a:[]}));
    test.done();
  };

  export function changeArrayProps(test) {
    var p = newPrimary();
    var db = p.store();
    db.a = [1];
    p.commit();
    db.a[0] = 2;
    p.undo();
    test.ok(utils.isEqual(db, {a:[1]}));
    test.done();
  };

  export function deleteArrayProp(test) {
    var p = newPrimary();
    p.atomic(function (db) {
      db.a = [1];
    });

    var s = new shared.store.SecondaryStore();
    s.atomic(function (db) {
      delete db.a[0];
      throw new Error('Silly');
    }, function (err, arg) {
      s.atomic(function (db) {
        test.ok(db.a[0] === 1);
      }, function (err, arg) {
        test.ok(err === null);
        test.done();
      });
    });
  }
 
  export function arrayPush(test) {
    var p = newPrimary();
    p.atomic(function (db) {
      db.a = [];
    });

    var s = new shared.store.SecondaryStore();
    s.atomic(function (db) {
      db.a.push(1);
      throw new Error('Silly');
    }, function (err, arg) {
      s.atomic(function (db) {
        test.ok(utils.isEqual(db.a,[]));
      }, function (err, arg) {
        test.ok(err === null);
        test.done();
      });
    });
  }

  export function arrayPop(test) {
    var p = newPrimary();
    p.atomic(function (db) {
      db.a = [1];
    });

    var s = new shared.store.SecondaryStore();
    s.atomic(function (db) {
      db.a.pop();
      throw new Error('Silly');
    }, function (err, arg) {
      s.atomic(function (db) {
        test.ok(utils.isEqual(db.a,[1]));
      }, function (err, arg) {
        test.ok(err === null);
        test.done();
      });
    });
  }

  export function arrayShift(test) {
    var p = newPrimary();
    p.atomic(function (db) {
      db.a = [1];
    });

    var s = new shared.store.SecondaryStore();
    s.atomic(function (db) {
      db.a.shift();
      throw new Error('Silly');
    }, function (err, arg) {
      s.atomic(function (db) {
        test.ok(utils.isEqual(db.a,[1]));
      }, function (err, arg) {
        test.ok(err === null);
        test.done();
      });
    });
  }

  export function arrayUnShift(test) {
    var p = newPrimary();
    p.atomic(function (db) {
      db.a = [];
    });

    var s = new shared.store.SecondaryStore();
    s.atomic(function (db) {
      db.a.unshift(1);
      throw new Error('Silly');
    }, function (err, arg) {
      s.atomic(function (db) {
        test.ok(utils.isEqual(db.a,[]));
      }, function (err, arg) {
        test.ok(err === null);
        test.done();
      });
    });
  }

  export function arraySort(test) {
    var p = newPrimary();
    p.atomic(function (db) {
      db.a = [2,3,1];
    });

    var s = new shared.store.SecondaryStore();
    s.atomic(function (db) {
      db.a.sort();
      throw new Error('Silly');
    }, function (err, arg) {
      s.atomic(function (db) {
        test.ok(utils.isEqual(db.a,[2,3,1]));
      }, function (err, arg) {
        test.ok(err === null);
        test.done();
      });
    });
  }

  export function arrayReverse(test) {
    var p = newPrimary();
    p.atomic(function (db) {
      db.a = [2,3,1];
    });

    var s = new shared.store.SecondaryStore();
    s.atomic(function (db) {
      db.a.reverse();
      throw new Error('Silly');
    }, function (err, arg) {
      s.atomic(function (db) {
        test.ok(utils.isEqual(db.a,[2,3,1]));
      }, function (err, arg) {
        test.ok(err === null);
        test.done();
      });
    });
  }

  export function arraySplice1(test) {
    var p = newPrimary();
    p.atomic(function (db) {
      db.a = [2,3,1];
    });

    var s = new shared.store.SecondaryStore();
    s.atomic(function (db) {
      db.a.splice(1,1);
      throw new Error('Silly');
    }, function (err, arg) {
      s.atomic(function (db) {
        test.ok(utils.isEqual(db.a,[2,3,1]));
      }, function (err, arg) {
        test.ok(err === null);
        test.done();
      });
    });
  }

  export function arraySplice2(test) {
    var p = newPrimary();
    p.atomic(function (db) {
      db.a = [2,3,1];
    });

    var s = new shared.store.SecondaryStore();
    s.atomic(function (db) {
      db.a.splice(1,0,4);
      throw new Error('Silly');
    }, function (err, arg) {
      s.atomic(function (db) {
        test.ok(utils.isEqual(db.a,[2,3,1]));
      }, function (err, arg) {
        test.ok(err === null);
        test.done();
      });
    });
  }

  export function arraySplice3(test) {
    var p = newPrimary();
    p.atomic(function (db) {
      db.a = [2,3,1];
    });

    var s = new shared.store.SecondaryStore();
    s.atomic(function (db) {
      db.a.splice(0,3,4);
      throw new Error('Silly');
    }, function (err, arg) {
      s.atomic(function (db) {
        test.ok(utils.isEqual(db.a,[2,3,1]));
      }, function (err, arg) {
        test.ok(err === null);
        test.done();
      });
    });
  }

} // testundo