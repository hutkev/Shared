/// <reference path='../defs/node-0.8.d.ts' />

import types = module('../lib/types');
var _ = require('underscore');

exports.exports = function(test) {
  test.expect(2);
  test.ok(typeof types.typeStore === 'object');
  test.ok(typeof types.hashObj === 'function');
  test.done();
};

exports.hash = function(test) {

  test.ok(types.hashObj(null) === 0);
  test.ok(types.hashObj(undefined) === 0);
  test.ok(types.hashObj(0) === 0);
  test.ok(types.hashObj(1) === 0);
  test.ok(types.hashObj(true) === 0);
  test.ok(types.hashObj(false) === 0);
  test.ok(types.hashObj('') === 0);
  test.ok(types.hashObj('a') === 0);
  test.ok(types.hashObj({}) === 0);
  test.ok(types.hashObj({a: 1}) !== 0);
  test.ok(types.hashObj({a: 1}) === types.hashObj({a: 1}));
  test.ok(types.hashObj({a: 1}) === types.hashObj({a: 2}));
  test.ok(types.hashObj({a: 1}) !== types.hashObj({b: 1}));
  test.ok(types.hashObj({ab: 1}) !== 0);
  test.ok(types.hashObj({ba: 1}) !== 0);
  test.ok(types.hashObj({ab: 1}) !== types.hashObj({ba: 1}));
  test.ok(types.hashObj({a: 1, b: 1}) !== 0);
  test.ok(types.hashObj({a: 1, b: 1}) === types.hashObj({a: 1, b: 1}));
  test.ok(types.hashObj({a: 1, b: 1}) !== types.hashObj({b: 1, a: 1}));
  test.ok(types.hashObj([]) === 1);
  test.ok(types.hashObj([1]) !== 1);
  test.ok(types.hashObj([1]) === types.hashObj([2]));
  test.ok(types.hashObj([1]) === types.hashObj(['a']));
  test.ok(types.hashObj([1]) === types.hashObj([true]));
  test.ok(types.hashObj([1]) === types.hashObj([null]));
  test.ok(types.hashObj([1, 2]) !== 0);
  test.ok(types.hashObj([1, 2]) === types.hashObj([1, 2]));
  test.ok(types.hashObj([1, 2]) === types.hashObj([2, 1]));
  test.ok(types.hashObj([1, 2]) !== types.hashObj([1, 2, 3]));
  test.done();
};

exports.simplelookup = function(test) {
  test.ok(types.typeStore.type() === null);
  test.ok(types.typeStore.type(null) === null);
  test.ok(types.typeStore.type(undefined) === null);
  test.ok(types.typeStore.type(0) === null);
  test.ok(types.typeStore.type(1) === null);
  test.ok(types.typeStore.type(true) === null);
  test.ok(types.typeStore.type(false) === null);
  test.ok(types.typeStore.type('') === null);
  test.ok(types.typeStore.type('a') === null);
  test.ok(types.typeStore.type({}) !== null);
  test.ok(typeof types.typeStore.type({}) === 'object');
  test.ok(typeof types.typeStore.type({}).id === 'string');
  test.ok(typeof types.typeStore.type({}).hash === 'number');
  test.ok(typeof types.typeStore.type({}).props === 'object');
  test.ok(types.typeStore.type({}).id.length === 36);
  test.ok(types.typeStore.type({}).hash === 0);
  test.ok(_.isEqual(types.typeStore.type({}).props, []));
  test.ok(types.typeStore.type({a: 1}) !== null);
  test.ok(typeof types.typeStore.type({a: 1}) === 'object');
  test.ok(typeof types.typeStore.type({a: 1}).id === 'string');
  test.ok(typeof types.typeStore.type({a: 1}).hash === 'number');
  test.ok(typeof types.typeStore.type({a: 1}).props === 'object');
  test.ok(types.typeStore.type({a: 1}).id.length === 36);
  test.ok(types.typeStore.type({a: 1}).hash !== 0);
  test.ok(_.isEqual(types.typeStore.type({a: 1}).props, ['a']));
  test.ok(types.typeStore.type({a: 1, b: 2}) !== null);
  test.ok(typeof types.typeStore.type({a: 1, b: 2}) === 'object');
  test.ok(typeof types.typeStore.type({a: 1, b: 2}).id === 'string');
  test.ok(typeof types.typeStore.type({a: 1, b: 2}).hash === 'number');
  test.ok(typeof types.typeStore.type({a: 1, b: 2}).props === 'object');
  test.ok(types.typeStore.type({a: 1, b: 2}).id.length === 36);
  test.ok(types.typeStore.type({a: 1, b: 2}).hash !== 0);
  test.ok(_.isEqual(types.typeStore.type({a: 1, b: 2}).props, ['a', 'b']));
  test.ok(types.typeStore.type([]) !== null);
  test.ok(typeof types.typeStore.type([]) === 'object');
  test.ok(typeof types.typeStore.type([]).id === 'string');
  test.ok(typeof types.typeStore.type([]).hash === 'number');
  test.ok(typeof types.typeStore.type([]).props === 'object');
  test.ok(types.typeStore.type([]).id.length === 36);
  test.ok(types.typeStore.type([]).hash === 1);
  test.ok(types.typeStore.type([1]) !== null);
  test.ok(typeof types.typeStore.type([1]) === 'object');
  test.ok(typeof types.typeStore.type([1]).id === 'string');
  test.ok(typeof types.typeStore.type([1]).hash === 'number');
  test.ok(typeof types.typeStore.type([1]).props === 'object');
  test.ok(types.typeStore.type([1]).id.length === 36);
  test.ok(types.typeStore.type([1]).hash !== 0);
  test.ok(types.typeStore.type([1, 2]) !== null);
  test.ok(typeof types.typeStore.type([1, 2]) === 'object');
  test.ok(typeof types.typeStore.type([1, 2]).id === 'string');
  test.ok(typeof types.typeStore.type([1, 2]).hash === 'number');
  test.ok(typeof types.typeStore.type([1, 2]).props === 'object');
  test.ok(types.typeStore.type([1, 2]).id.length === 36);
  test.ok(types.typeStore.type([1, 2]).hash !== 0);
  test.done();
};

exports.equality = function(test) {
  test.ok(_.isEqual(types.typeStore.type({}), types.typeStore.type({})));
  test.ok(!_.isEqual(types.typeStore.type({a: 1}), types.typeStore.type({})));
  test.ok(_.isEqual(types.typeStore.type({a: 1}), types.typeStore.type({a: 1})));
  test.ok(_.isEqual(types.typeStore.type({a: 1}), types.typeStore.type({a: 2})));
  test.ok(_.isEqual(types.typeStore.type({a: 1, b: 2}), types.typeStore.type({a: 1, b: 2})));
  test.ok(_.isEqual(types.typeStore.type({a: 1, b: 2}), types.typeStore.type({a: 2, b: 1})));
  test.ok(!_.isEqual(types.typeStore.type({a: 1, b: 2}), types.typeStore.type({a: 2})));
  test.ok(_.isEqual(types.typeStore.type([]), types.typeStore.type([])));
  test.ok(!_.isEqual(types.typeStore.type([1]), types.typeStore.type([])));
  test.ok(_.isEqual(types.typeStore.type([1]), types.typeStore.type([1])));
  test.ok(_.isEqual(types.typeStore.type([1]), types.typeStore.type([2])));
  test.ok(_.isEqual(types.typeStore.type([1, 2]), types.typeStore.type([1, 2])));
  test.ok(_.isEqual(types.typeStore.type([1, 2]), types.typeStore.type([2, 1])));
  test.ok(!_.isEqual(types.typeStore.type([1, 2]), types.typeStore.type([2])));
  test.ok(!_.isEqual(types.typeStore.type({}), types.typeStore.type([])));
  test.ok(!_.isEqual(types.typeStore.type({a: 1}), types.typeStore.type([1])));
  test.ok(!_.isEqual(types.typeStore.type({a: 1, b: 1}), types.typeStore.type([1, 2])));
  test.done();
};

exports.directequality = function(test) {
  test.ok(types.typeStore.type({}) === types.typeStore.type({}));
  test.ok(types.typeStore.type({a: 1}) !== types.typeStore.type({}));
  test.ok(types.typeStore.type({a: 1}) === types.typeStore.type({a: 1}));
  test.ok(types.typeStore.type({a: 1}) === types.typeStore.type({a: 2}));
  test.ok(types.typeStore.type({a: 1, b: 2}) === types.typeStore.type({a: 1, b: 2}));
  test.ok(types.typeStore.type({a: 1, b: 2}) === types.typeStore.type({a: 2, b: 1}));
  test.ok(types.typeStore.type({a: 1, b: 2}) !== types.typeStore.type({a: 2}));
  test.ok(types.typeStore.type([]) === types.typeStore.type([]));
  test.ok(types.typeStore.type([1]) !== types.typeStore.type([]));
  test.ok(types.typeStore.type([1]) === types.typeStore.type([1]));
  test.ok(types.typeStore.type([1]) === types.typeStore.type([2]));
  test.ok(types.typeStore.type([1, 2]) === types.typeStore.type([1, 2]));
  test.ok(types.typeStore.type([1, 2]) === types.typeStore.type([2, 1]));
  test.ok(types.typeStore.type([1, 2]) !== types.typeStore.type([2]));
  test.done();
};
