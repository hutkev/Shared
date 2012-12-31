/// <reference path='../defs/node-0.8.d.ts' />
/// <reference path='../lib/store.ts' />

module testtypes {

  import utils = shared.utils;
  import types = shared.types;

  var typeStore = types.TypeStore.instance();

  export function equality(test) {
    test.ok(utils.isEqual(typeStore.type({}), typeStore.type({})));
    test.ok(!utils.isEqual(typeStore.type({ a: 1 }), typeStore.type({})));
    test.ok(utils.isEqual(typeStore.type({ a: 1 }), typeStore.type({ a: 1 })));
    test.ok(utils.isEqual(typeStore.type({ a: 1 }), typeStore.type({ a: 2 })));
    test.ok(utils.isEqual(typeStore.type({ a: 1, b: 2 }), typeStore.type({ a: 1, b: 2 })));
    test.ok(utils.isEqual(typeStore.type({ a: 1, b: 2 }), typeStore.type({ a: 2, b: 1 })));
    test.ok(!utils.isEqual(typeStore.type({ a: 1, b: 2 }), typeStore.type({ a: 2 })));
    test.ok(utils.isEqual(typeStore.type([]), typeStore.type([])));
    test.ok(!utils.isEqual(typeStore.type([1]), typeStore.type([])));
    test.ok(utils.isEqual(typeStore.type([1]), typeStore.type([1])));
    test.ok(utils.isEqual(typeStore.type([1]), typeStore.type([2])));
    test.ok(utils.isEqual(typeStore.type([1, 2]), typeStore.type([1, 2])));
    test.ok(utils.isEqual(typeStore.type([1, 2]), typeStore.type([2, 1])));
    test.ok(!utils.isEqual(typeStore.type([1, 2]), typeStore.type([2])));
    test.ok(!utils.isEqual(typeStore.type({}), typeStore.type([])));
    test.ok(!utils.isEqual(typeStore.type({ a: 1 }), typeStore.type([1])));
    test.ok(!utils.isEqual(typeStore.type({ a: 1, b: 1 }), typeStore.type([1, 2])));
    test.done();
  };

  export function directequality(test) {
    test.ok(typeStore.type({}) === typeStore.type({}));
    test.ok(typeStore.type({ a: 1 }) !== typeStore.type({}));
    test.ok(typeStore.type({ a: 1 }) === typeStore.type({ a: 1 }));
    test.ok(typeStore.type({ a: 1 }) === typeStore.type({ a: 2 }));
    test.ok(typeStore.type({ a: 1, b: 2 }) === typeStore.type({ a: 1, b: 2 }));
    test.ok(typeStore.type({ a: 1, b: 2 }) === typeStore.type({ a: 2, b: 1 }));
    test.ok(typeStore.type({ a: 1, b: 2 }) !== typeStore.type({ a: 2 }));
    test.ok(typeStore.type([]) === typeStore.type([]));
    test.ok(typeStore.type([1]) !== typeStore.type([]));
    test.ok(typeStore.type([1]) === typeStore.type([1]));
    test.ok(typeStore.type([1]) === typeStore.type([2]));
    test.ok(typeStore.type([1, 2]) === typeStore.type([1, 2]));
    test.ok(typeStore.type([1, 2]) === typeStore.type([2, 1]));
    test.ok(typeStore.type([1, 2]) !== typeStore.type([2]));
    test.done();
  };

  export function isobjarray(test) {
    test.ok(typeStore.type({}).isobj());
    test.ok(!typeStore.type([]).isobj());
    test.ok(typeStore.type({ a: 1 }).isobj());
    test.ok(!typeStore.type([1]).isobj());
    test.ok(typeStore.type({ a: 1, b: 2 }).isobj());
    test.ok(!typeStore.type([1, 2]).isobj());
    test.ok(!typeStore.type({}).isarray());
    test.ok(typeStore.type([]).isarray());
    test.ok(!typeStore.type({ a: 1 }).isarray());
    test.ok(typeStore.type([1]).isarray());
    test.ok(!typeStore.type({ a: 1, b: 2 }).isarray());
    test.ok(typeStore.type([1, 2]).isarray());
    test.done();
  }

  export function props(test) {
    test.ok(utils.isEqual(typeStore.type({}).props(), []));
    test.ok(utils.isEqual(typeStore.type({ a: 1 }).props(), ['a']));
    test.ok(utils.isEqual(typeStore.type({ a: 1, b: 2 }).props(), ['a', 'b']));
    test.ok(utils.isEqual(typeStore.type({ a: 1, b: 2, c: 3 }).props(), ['a', 'b', 'c']));
    test.ok(utils.isEqual(typeStore.type([]).props(), []));
    test.ok(utils.isEqual(typeStore.type([1]).props(), ['0']));
    test.ok(utils.isEqual(typeStore.type([1, 3]).props(), ['0', '1']));
    test.ok(utils.isEqual(typeStore.type([1, 3, 5]).props(), ['0', '1', '2']));
    var a = []; a[2] = 1; a[7] = 2;
    test.ok(utils.isEqual(typeStore.type(a).props(), ['2', '7']));
    test.done();
  }
}