/// <reference path='../defs/node-0.8.d.ts' />
/// <reference path='../lib/store.ts' />

module testundo {

  import utils = shared.utils;
  import tracker = shared.tracker;
  import mod = shared.store;

  var store: shared.store.MongoStore = null;

  function newPrimary(): shared.store.MongoStore {

    //utils.defaultLogger().enableDebugLogging('STORE');

    if (store != null)
      store.close();
    store = new shared.store.MongoStore();
    return store;
  }

  export function newProps(test) {
    var p = newPrimary();
    p.apply(function (db) {
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
      throw new Error();
    }, function (err) {
      test.ok(err !== null);
      p.apply(function (db) {
        test.ok(utils.isEqual(db, {}));
      }, function (err) {
        p.close();
        test.done();
      });
    });
  };

  function testChangeProps(test, fn) {
    var p = newPrimary();
    p.apply(function (db) {
      db.a = 0;
    }, function (err) {
      test.ok(err === null);
      p.apply(function (db) {
        fn(db);
        throw new Error();
      }, function (err) {
        test.ok(err !== null);
        p.apply(function (db) {
          test.ok(utils.isEqual(db, {a:0}));
          delete db.a;
        }, function (err) {
          test.ok(err === null);
          p.close();
          test.done();
        });
      });
    });
  }

  export function changePropsNumber(test) {
    testChangeProps(test, function (db) { db.a = 1 });
  }

  export function changePropsNull(test) {
    testChangeProps(test, function (db) { db.a = null });
  }

  export function changePropsUndefined(test) {
    testChangeProps(test, function (db) { db.a = undefined });
  }

  export function changePropsString(test) {
    testChangeProps(test, function (db) { db.a = 'a' });
  }

  export function changePropsDate(test) {
    testChangeProps(test, function (db) { db.a = new Date() });
  }

  export function changePropsFunction(test) {
    testChangeProps(test, function (db) { db.a = new function() { } });
  }

  export function changePropsObject(test) {
    testChangeProps(test, function (db) { db.a = {} });
  }

  export function changePropsArray(test) {
    testChangeProps(test, function (db) { db.a = [] });
  }

  export function deleteProp(test) {
    var p = newPrimary();
    p.apply(function (db) {
      db.a = 1;
    }, function (err) {
      test.ok(err === null);
      p.apply(function (db) {
        delete db.a;
        throw new Error();
      }, function (err, arg) {
        test.ok(err !== null);
        p.apply(function (db) {
          test.ok(db.a === 1);
          delete db.a;
        }, function (err, arg) {
          test.ok(err === null);
          p.close();
          test.done();
        });
      });
    });
  }

  export function deleteNestedProp(test) {
    var p = newPrimary();
    p.apply(function (db) {
      db.a = { b: 1 };
    }, function (err) {
      test.ok(err === null);
      p.apply(function (db) {
        delete db.a.b;
        throw new Error();
      }, function (err, arg) {
        test.ok(err !== null);
        p.apply(function (db) {
          test.ok(db.a.b === 1);
          delete db.a;
        }, function (err, arg) {
          test.ok(err === null);
          p.close();
          test.done();
        });
      });
    });
  }

  export function deleteNestedProp2(test) {
    var p = newPrimary();
    p.apply(function (db) {
      db.a = [1];
    }, function (err) {
      test.ok(err === null);
      p.apply(function (db) {
        delete db.a[0];
        throw new Error();
      }, function (err, arg) {
        test.ok(err !== null);
        p.apply(function (db) {
          test.ok(db.a[0] === 1);
          delete db.a;
        }, function (err, arg) {
          test.ok(err === null);
          p.close();
          test.done();
        });
      });
    });
  }
  
  export function newArrayProps(test) {
    var p = newPrimary();
    p.apply(function (db) {
      db.a = [];
    }, function (err) {
      test.ok(err === null);
      p.apply(function (db) {
        db.a[0] = 1;
        throw new Error();
      }, function (err) {
        test.ok(err !== null);
        p.apply(function (db) {
          test.ok(utils.isEqual(db, { a: [] }));
          delete db.a;
        }, function (err) {
          test.ok(err === null);
          p.close();
          test.done();
        });
      });
    });
  }

  export function changeArrayProps(test) {
    var p = newPrimary();
    p.apply(function (db) {
      db.a = [1];
    }, function (err) {
      test.ok(err === null);
      p.apply(function (db) {
        db.a[0] = 2;
        throw new Error();
      }, function (err) {
        test.ok(err !== null);
        p.apply(function (db) {
          test.ok(utils.isEqual(db, { a: [1] }));
          delete db.a;
        }, function (err) {
          test.ok(err === null);
          p.close();
          test.done();
        });
      });
    });
  }

  export function deleteArrayProps(test) {
    var p = newPrimary();
    p.apply(function (db) {
      db.a = [1];
    }, function (err) {
      test.ok(err === null);
      p.apply(function (db) {
        delete db.a[0];
        throw new Error();
      }, function (err) {
        test.ok(err !== null);
        p.apply(function (db) {
          test.ok(utils.isEqual(db, { a: [1] }));
          delete db.a;
        }, function (err) {
          test.ok(err === null);
          p.close();
          test.done();
        });
      });
    });
  }

  export function arrayPush(test) {
    var p = newPrimary();
    p.apply(function (db) {
      db.a = [];
    }, function (err) {
      test.ok(err === null);
      p.apply(function (db) {
        db.a.push(1);
        throw new Error();
      }, function (err) {
        test.ok(err !== null);
        p.apply(function (db) {
          test.ok(utils.isEqual(db, { a: [] }));
          delete db.a;
        }, function (err) {
          test.ok(err === null);
          p.close();
          test.done();
        });
      });
    });
  }

  export function arrayPop(test) {
    var p = newPrimary();
    p.apply(function (db) {
      db.a = [1];
    }, function (err) {
      test.ok(err === null);
      p.apply(function (db) {
        db.a.pop();
        throw new Error();
      }, function (err) {
        test.ok(err !== null);
        p.apply(function (db) {
          test.ok(utils.isEqual(db, { a: [1] }));
          delete db.a;
        }, function (err) {
          test.ok(err === null);
          p.close();
          test.done();
        });
      });
    });
  }

  export function arrayShift(test) {
    var p = newPrimary();
    p.apply(function (db) {
      db.a = [1];
    }, function (err) {
      test.ok(err === null);
      p.apply(function (db) {
        db.a.shift();
        throw new Error();
      }, function (err) {
        test.ok(err !== null);
        p.apply(function (db) {
          test.ok(utils.isEqual(db, { a: [1] }));
          delete db.a;
        }, function (err) {
          test.ok(err === null);
          p.close();
          test.done();
        });
      });
    });
  }

  export function arrayUnShift(test) {
    var p = newPrimary();
    p.apply(function (db) {
      db.a = [1];
    }, function (err) {
      test.ok(err === null);
      p.apply(function (db) {
        db.a.unshift(2);
        throw new Error();
      }, function (err) {
        test.ok(err !== null);
        p.apply(function (db) {
          test.ok(utils.isEqual(db, { a: [1] }));
          delete db.a;
        }, function (err) {
          test.ok(err === null);
          p.close();
          test.done();
        });
      });
    });
  }

  export function arraySort(test) {
    var p = newPrimary();
    p.apply(function (db) {
      db.a = [2,3,1];
    }, function (err) {
      test.ok(err === null);
      p.apply(function (db) {
        db.a.sort();
        throw new Error();
      }, function (err) {
        test.ok(err !== null);
        p.apply(function (db) {
          test.ok(utils.isEqual(db, { a: [2,3,1] }));
          delete db.a;
        }, function (err) {
          test.ok(err === null);
          p.close();
          test.done();
        });
      });
    });
  }

  export function arrayReverse(test) {
    var p = newPrimary();
    p.apply(function (db) {
      db.a = [2, 3, 1];
    }, function (err) {
      test.ok(err === null);
      p.apply(function (db) {
        db.a.reverse();
        throw new Error();
      }, function (err) {
        test.ok(err !== null);
        p.apply(function (db) {
          test.ok(utils.isEqual(db, { a: [2, 3, 1] }));
          delete db.a;
        }, function (err) {
          test.ok(err === null);
          p.close();
          test.done();
        });
      });
    });
  }

  export function arraySplice1(test) {
    var p = newPrimary();
    p.apply(function (db) {
      db.a = [2, 3, 1];
    }, function (err) {
      test.ok(err === null);
      p.apply(function (db) {
        db.a.splice(1,1);
        throw new Error();
      }, function (err) {
        test.ok(err !== null);
        p.apply(function (db) {
          test.ok(utils.isEqual(db, { a: [2, 3, 1] }));
          delete db.a;
        }, function (err) {
          test.ok(err === null);
          p.close();
          test.done();
        });
      });
    });
  }

  export function arraySplice2(test) {
    var p = newPrimary();
    p.apply(function (db) {
      db.a = [2, 3, 1];
    }, function (err) {
      test.ok(err === null);
      p.apply(function (db) {
        db.a.splice(1, 0, 4);
        throw new Error();
      }, function (err) {
        test.ok(err !== null);
        p.apply(function (db) {
          test.ok(utils.isEqual(db, { a: [2, 3, 1] }));
          delete db.a;
        }, function (err) {
          test.ok(err === null);
          p.close();
          test.done();
        });
      });
    });
  }

  export function arraySplice3(test) {
    var p = newPrimary();
    p.apply(function (db) {
      db.a = [2, 3, 1];
    }, function (err) {
      test.ok(err === null);
      p.apply(function (db) {
        db.a.splice(0, 3, 4);
        throw new Error();
      }, function (err) {
        test.ok(err !== null);
        p.apply(function (db) {
          test.ok(utils.isEqual(db, { a: [2, 3, 1] }));
          delete db.a;
        }, function (err) {
          test.ok(err === null);
          p.close();
          test.done();
        });
      });
    });
  }

} // testundo