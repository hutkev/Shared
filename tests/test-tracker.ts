/// <reference path='../defs/node-0.8.d.ts' />
/// <reference path='../lib/shared.d.ts' />

var tracker: shared.tracker = require('../lib/shared.js').tests.tracker;
var utils: shared.utils = require('../lib/shared.js').tests.utils;

var _ = require('underscore');

function reset() {
  tracker.Tracker.prototype.cset = [];
  tracker.Tracker.prototype.nset = {};
  tracker.Tracker.prototype.rset = {};
}

exports.exports = function(test) {
  test.ok(typeof tracker.Tracker === 'function');
  test.done();
};

exports.methods = function(test) {
  var obj = [];
  var t = new tracker.Tracker(obj);
  test.ok(typeof t.id === 'function');
  test.ok(typeof t.rev === 'function');
  test.ok(typeof t.collect === 'function');
  test.done();
};

exports.illegaltype = function(test) {
  test.throws(function() {tracker.Tracker(null);},Error);
  test.throws(function() {tracker.Tracker(undefined);},Error);
  test.throws(function() {tracker.Tracker(0);},Error);
  test.throws(function() {tracker.Tracker(1);},Error);
  test.throws(function() {tracker.Tracker('');},Error);
  test.throws(function() {tracker.Tracker('a');},Error);
  test.throws(function() {tracker.Tracker(true);},Error);
  test.throws(function() {tracker.Tracker(false);},Error);
  test.done();
};

exports.objctor = function(test) {
  var obj:any = {};
  var t = new tracker.Tracker(obj);
  test.ok(typeof obj._tracker === 'object');
  test.ok(obj._tracker === t);
  test.ok(utils.isUID(t.id()));
  test.ok(utils.isUID(t._id));
  test.ok(utils.isObject(t.type()));
  test.done();
};

exports.idobjctor = function(test) {
  test.throws(function() {var t = new tracker.Tracker({},'1');},Error);
  test.throws(function() {tracker.Tracker({},'12');},Error);

  var obj = {};
  var t = new tracker.Tracker({},'12345678-1234-1234-1234-123456789012');
  test.ok(typeof t == 'object');
  test.ok(t.id() == '12345678-1234-1234-1234-123456789012');
  test.done();
};

exports.arrayctor = function(test) {
  var obj:any = [];
  var t = new tracker.Tracker(obj);
  test.ok(typeof obj._tracker === 'object');
  test.ok(obj._tracker === t);
  test.ok(utils.isUID(t.id()));
  test.ok(utils.isObject(t.type()));
  test.done();
};

exports.idarrayctor = function(test) {
  test.throws(function() {tracker.Tracker([], '1');},Error);
  test.throws(function() {tracker.Tracker([], '12');},Error);

  var obj = [];
  var t = new tracker.Tracker({},'12345678-1234-1234-1234-123456789012');
  test.ok(typeof t == 'object');
  test.ok(t.id() == '12345678-1234-1234-1234-123456789012');
  test.done();
};

exports.rev = function(test) {
  var obj = [];
  var t = new tracker.Tracker(obj);
  test.ok(t.rev() === 0);
  test.ok(t.rev(1) === 1);
  test.ok(t.rev() === 1);
  test.ok(t.rev(1) === 2);
  test.ok(t.rev() === 2);
  test.ok(t.rev() === 2);
  test.ok(t.rev(1) === 3);
  test.ok(t.rev(1) === 4);
  test.done();
};

exports.wrapNumber = function(test) {
  reset();
  var obj = {a: 1};
  var t = new tracker.Tracker(obj);
  test.ok(typeof obj.a == 'number');
  test.ok(obj.a === 1);
  obj.a = 2;
  test.ok(_.isEqual(tracker.Tracker.prototype.cset[0], {obj: obj, write: 'a', value: '2', lasttx: -1}));
  test.ok(Object.keys(tracker.Tracker.prototype.rset).length === 0);
  test.ok(Object.keys(tracker.Tracker.prototype.nset).length === 0);
  test.ok(obj.a === 2);
  test.done();
};

exports.wrapString = function(test) {
  reset();
  var obj = {a: 'b'};
  var t = new tracker.Tracker(obj);
  test.ok(typeof obj.a == 'string');
  test.ok(obj.a === 'b');
  obj.a = 'c';
  test.ok(_.isEqual(tracker.Tracker.prototype.cset[0], {obj: obj, write: 'a', value: '\'c\'', lasttx: -1}));
  test.ok(Object.keys(tracker.Tracker.prototype.rset).length === 0);
  test.ok(Object.keys(tracker.Tracker.prototype.nset).length === 0);
  test.ok(obj.a === 'c');
  test.done();
};

exports.wrapBoolean = function(test) {
  reset();
  var obj = {a: true};
  var t = new tracker.Tracker(obj);
  test.ok(typeof obj.a == 'boolean');
  test.ok(obj.a === true);
  obj.a = false;
  test.ok(_.isEqual(tracker.Tracker.prototype.cset[0], {obj: obj, write: 'a', value: 'false', lasttx: -1}));
  test.ok(Object.keys(tracker.Tracker.prototype.rset).length === 0);
  test.ok(Object.keys(tracker.Tracker.prototype.nset).length === 0);
  test.ok(obj.a === false);
  test.done();
};

exports.wrapFunc = function(test) {
  reset();
  var f = function() {};
  var obj:any = {a: f};
  var t = new tracker.Tracker(obj);
  test.ok(typeof obj.a == 'function');
  obj.a = function(a) {};
  test.ok(_.isEqual(tracker.Tracker.prototype.cset[0], {obj: obj, write: 'a', value: '', lasttx: -1}));
  test.ok(Object.keys(tracker.Tracker.prototype.rset).length === 0);
  test.ok(Object.keys(tracker.Tracker.prototype.nset).length === 0);
  test.done();
};

exports.wrapObj = function(test) {
  reset();
  var nobj={};
  var t2= new tracker.Tracker(nobj);
  var obj:any = {a: nobj};
  var t = new tracker.Tracker(obj);
  test.ok(typeof obj.a == 'object');
  test.ok(_.isEqual(obj.a, {}));
  test.ok(_.isEqual(tracker.Tracker.prototype.rset[t2._id], 0));
  test.ok(Object.keys(tracker.Tracker.prototype.rset).length === 1);
  obj.a = {b: 1};
  test.ok(Object.keys(tracker.Tracker.prototype.rset).length === 1);
  var v = '<' + obj.a._tracker._id + '>';
  test.ok(_.isEqual(tracker.Tracker.prototype.cset[0], {obj: obj, write: 'a', value: v, lasttx: -1}));
  var id = obj.a._tracker._id;
  test.ok(_.isEqual(tracker.Tracker.prototype.nset[id], '{\'b\':1}'));
  test.ok(Object.keys(tracker.Tracker.prototype.nset).length === 1);
  test.ok(_.isEqual(obj.a, {b: 1}));
  test.done();
};

exports.wrapArray = function(test) {
  reset();
  var nobj = [];
  var t2 = new tracker.Tracker(nobj);
  var obj:any = {a: nobj};
  var t = new tracker.Tracker(obj);
  test.ok(typeof obj.a == 'object');
  test.ok(_.isEqual(obj.a, []));
  test.ok(_.isEqual(tracker.Tracker.prototype.rset[t2._id], 0));
  test.ok(Object.keys(tracker.Tracker.prototype.rset).length === 1);
  obj.a = [1];
  var v = '<' + obj.a._tracker._id + '>';
  test.ok(_.isEqual(tracker.Tracker.prototype.cset[0], {obj: obj, write: 'a', value: v, lasttx: -1}));
  var id = obj.a._tracker._id;
  test.ok(_.isEqual(tracker.Tracker.prototype.nset[id], '[\'0\':1]'));
  test.ok(Object.keys(tracker.Tracker.prototype.nset).length === 1);
  test.ok(_.isEqual(obj.a, [1]));
  test.done();
};

exports.cycleTypes = function(test) {
  reset();
  var obj:any = {a: 1};
  var t = new tracker.Tracker(obj);
  test.ok(typeof obj.a == 'number');
  test.ok(obj.a === 1);
  test.ok(Object.keys(tracker.Tracker.prototype.rset).length === 0);
  obj.a = '';
  test.ok(obj.a === '');
  test.ok(Object.keys(tracker.Tracker.prototype.rset).length === 0);
  test.ok(_.isEqual(tracker.Tracker.prototype.cset[0], {obj: obj, write: 'a', value: '\'\'', lasttx: -1}));
  obj.a = true;
  test.ok(obj.a === true);
  test.ok(Object.keys(tracker.Tracker.prototype.rset).length === 0);
  test.ok(_.isEqual(tracker.Tracker.prototype.cset[1], {obj: obj, write: 'a', value: 'true', lasttx: 0}));
  var f = function() {};
  obj.a = f;
  test.ok(obj.a === f);
  test.ok(Object.keys(tracker.Tracker.prototype.rset).length === 0);
  test.ok(Object.keys(tracker.Tracker.prototype.nset).length === 0);
  test.ok(_.isEqual(tracker.Tracker.prototype.cset[2], {obj: obj, write: 'a', value: '', lasttx: 1}));
  obj.a = {};
  var id = obj.a._tracker._id;
  var v = '<' + id + '>';
  test.ok(_.isEqual(tracker.Tracker.prototype.cset[3], {obj: obj, write: 'a', value: v, lasttx: 2}));
  test.ok(_.isEqual(tracker.Tracker.prototype.rset[id], 0));
  test.ok(Object.keys(tracker.Tracker.prototype.rset).length === 1);
  test.ok(_.isEqual(tracker.Tracker.prototype.nset[id], '{}'));
  test.ok(Object.keys(tracker.Tracker.prototype.nset).length === 1);
  obj.a = [];
  var id = obj.a._tracker._id;
  var v = '<' + id + '>';
  test.ok(_.isEqual(tracker.Tracker.prototype.cset[4], {obj: obj, write: 'a', value: v, lasttx: 3}));
  test.ok(_.isEqual(tracker.Tracker.prototype.rset[id], 0));
  test.ok(Object.keys(tracker.Tracker.prototype.rset).length === 2);
  test.ok(_.isEqual(tracker.Tracker.prototype.nset[id], '[]'));
  test.ok(Object.keys(tracker.Tracker.prototype.nset).length === 2);
  test.done();
};

exports.unwrapable = function(test) {
  var obj:any = {};
  Object.defineProperty(obj, 'a', {
  enumerable: true,
  configurable: false,
  value: 1
  });
  test.throws(function() {new tracker.Tracker(obj);},Error);

  var obj:any = [];
  Object.defineProperty(obj, 'a', {
  enumerable: true,
  configurable: false,
  value: 1
  });
  test.throws(function() {new tracker.Tracker(obj);},Error);

  test.done();
};

exports.nonenum = function(test) {
  reset();
  var obj:any = {};
  Object.defineProperty(obj, 'a', {
  enumerable: false,
  configurable: true,
  value: 1
  });
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  test.ok(obj.a === 1);
  test.ok(tracker.Tracker.prototype.cset.length === 0);

  reset();
  var obj:any = [];
  Object.defineProperty(obj, 'a', {
  enumerable: false,
  configurable: true,
  value: 1
  });
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  test.ok(obj.a === 1);
  test.ok(tracker.Tracker.prototype.cset.length === 0);

  test.done();
};

exports.deleteable = function(test) {
  var obj:any = {a: 1};
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  test.ok(obj.a === 1);
  delete obj.a;
  test.ok(obj.a === undefined);

  var obj:any = [1];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  test.ok(obj[0] === 1);
  delete obj[0];
  test.ok(obj[0] === undefined);

  test.done();
};

exports.arrreverse = function(test) {
  reset();
  var obj = [1, 2, 3, 4];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.reverse();
  test.ok(_.isEqual(tracker.Tracker.prototype.cset[0], {obj: obj, reverse: true, lasttx: -1}));
  test.ok(_.isEqual(obj, [4, 3, 2, 1]));

  reset();
  var obj = [1, 2, 3, 4];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.reverse();
  obj.reverse();
  test.ok(_.isEqual(tracker.Tracker.prototype.cset[0], {obj: obj, reverse: true, lasttx: -1}));
  test.ok(_.isEqual(tracker.Tracker.prototype.cset[1], {obj: obj, reverse: true, lasttx: 0}));
  test.ok(_.isEqual(obj, [1, 2, 3, 4]));
  test.done();
};

exports.arrsort = function(test) {
  reset();
  var obj = [1, 2, 3, 4];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.sort();
  test.ok(_.isEqual(tracker.Tracker.prototype.cset[0], {obj: obj, sort: true, lasttx: -1}));
  test.ok(_.isEqual(obj, [1, 2, 3, 4]));

  reset();
  var obj = [1, 2, 3, 4];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.sort(function(a,b) {return b - a});
  obj.sort(function(a,b) {return b - a});
  test.ok(_.isEqual(tracker.Tracker.prototype.cset[0], {obj: obj, sort: true, lasttx: -1}));
  test.ok(_.isEqual(tracker.Tracker.prototype.cset[1], {obj: obj, sort: true, lasttx: 0}));
  test.ok(_.isEqual(obj, [4, 3, 2, 1]));
  test.done();
};

exports.arrshift = function(test) {
  reset();
  var obj = [1, 2];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.shift();
  test.ok(_.isEqual(tracker.Tracker.prototype.cset[0], {obj: obj, shift: true, lasttx: -1}));
  obj.unshift(3);
  test.ok(_.isEqual(tracker.Tracker.prototype.cset[1], {obj: obj, unshift: true, size: 1, lasttx: 0}));
  test.ok(_.isEqual(tracker.Tracker.prototype.cset[2], {obj: obj, write: '0', value: '3', lasttx: 1}));
  obj.unshift(4, 5);
  test.ok(_.isEqual(tracker.Tracker.prototype.cset[3], {obj: obj, unshift: true, size: 2, lasttx: 2}));
  test.ok(_.isEqual(tracker.Tracker.prototype.cset[4], {obj: obj, write: '0', value: '4', lasttx: 3}));
  test.ok(_.isEqual(tracker.Tracker.prototype.cset[5], {obj: obj, write: '1', value: '5', lasttx: 4}));

  test.ok(obj, [4, 5, 3, 1]);
  test.done();
};

exports.pushNumberProp = function(test) {
  reset();
  var obj:any = {};
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.a = 1;
  obj._tracker.collect(obj);
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, [{obj: obj, write: 'a', value: '1', lasttx: -1}]));

  reset();
  var obj = {a: 1};
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.b = 2;
  obj._tracker.collect(obj);
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, [{obj: obj, write: 'b', value: '2', lasttx: -1}]));

  test.done();
};

exports.pushBoolProp = function(test) {
  reset();
  var obj:any = {};
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.a = true;
  obj._tracker.collect(obj);
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, [{obj: obj, write: 'a', value: 'true', lasttx: -1}]));

  reset();
  var obj = {a: 1};
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.b = false;
  obj._tracker.collect(obj);
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, [{obj: obj, write: 'b', value: 'false', lasttx: -1}]));

  test.done();
};

exports.pushStringProp = function(test) {
  reset();
  var obj:any = {};
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.a = 'a';
  obj._tracker.collect(obj);
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, [{obj: obj, write: 'a', value: '\'a\'', lasttx: -1}]));

  reset();
  var obj = {a: 1};
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.b = 'b';
  obj._tracker.collect(obj);
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, [{obj: obj, write: 'b', value: '\'b\'', lasttx: -1}]));

  test.done();
};

exports.pushOtherProp = function(test) {
  reset();
  var obj:any = {};
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.a = null;
  obj._tracker.collect(obj);
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, [{obj: obj, write: 'a', value: 'null', lasttx: -1}]));

  reset();
  var obj = {a: 1};
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.b = undefined;
  obj._tracker.collect(obj);
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, [{obj: obj, write: 'b', value: 'undefined', lasttx: -1}]));

  test.done();
};

exports.pushObjectProp = function(test) {
  reset();
  var obj:any = {};
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.a = {};
  obj._tracker.collect(obj);
  var id = obj.a._tracker._id;
  var v = '<' + id + '>';
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, [{obj: obj, write: 'a', value: v, lasttx: -1}]));
  test.ok(_.isEqual(tracker.Tracker.prototype.nset[id], '{}'));
  test.ok(Object.keys(tracker.Tracker.prototype.nset).length === 1);
  test.ok(Object.keys(tracker.Tracker.prototype.rset).length === 0);

  reset();
  var obj = {a: 1};
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.b = {};
  obj._tracker.collect(obj);
  var id = obj.b._tracker._id;
  var v = '<' + id + '>';
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, [{obj: obj, write: 'b', value: v, lasttx: -1}]));
  test.ok(_.isEqual(tracker.Tracker.prototype.nset[id], '{}'));
  test.ok(Object.keys(tracker.Tracker.prototype.nset).length === 1);
  test.ok(Object.keys(tracker.Tracker.prototype.rset).length === 0);

  test.done();
};

exports.pushRecuObjectProp = function(test) {
  reset();
  var obj:any = {};
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.a = {b: {}};
  obj._tracker.collect(obj);
  var id = obj.a._tracker._id;
  var v = '<' + id + '>';
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, [{obj: obj, write: 'a', value: v, lasttx: -1}]));
  var bid = obj.a.b._tracker._id;
  var v2 = '{\'b\':<' + bid + '>}';
  test.ok(_.isEqual(tracker.Tracker.prototype.nset[bid], '{}'));
  test.ok(_.isEqual(tracker.Tracker.prototype.nset[id], v2));
  test.ok(_.isEqual(tracker.Tracker.prototype.rset[bid], 0));
  
  reset();
  var obj = {a: 1};
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.b = {c: {}};
  obj._tracker.collect(obj);
  var id = obj.b._tracker._id;
  var v = '<' + id + '>';
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, [{obj: obj, write: 'b', value: v, lasttx: -1}]));
  var bid = obj.b.c._tracker._id;
  var v2 = '{\'c\':<' + bid + '>}';
  test.ok(_.isEqual(tracker.Tracker.prototype.nset[bid], '{}'));
  test.ok(_.isEqual(tracker.Tracker.prototype.nset[id], v2));
  test.ok(_.isEqual(tracker.Tracker.prototype.rset[bid], 0));
  test.done();
};

exports.pushArrayProp = function(test) {
  reset();
  var obj:any = {};
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.a = [];
  obj._tracker.collect(obj);
  var id = obj.a._tracker._id;
  var v = '<' + id + '>';
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, [{obj: obj, write: 'a', value: v, lasttx: -1}]));
  test.ok(_.isEqual(tracker.Tracker.prototype.nset[id], '[]'));
  test.ok(Object.keys(tracker.Tracker.prototype.nset).length === 1);
  test.ok(Object.keys(tracker.Tracker.prototype.rset).length === 0);

  reset();
  var obj = {a: 1};
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.b = [];
  obj._tracker.collect(obj);
  var id = obj.b._tracker._id;
  var v = '<' + id + '>';
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, [{obj: obj, write: 'b', value: v, lasttx: -1}]));
  test.ok(_.isEqual(tracker.Tracker.prototype.nset[id], '[]'));
  test.ok(Object.keys(tracker.Tracker.prototype.nset).length === 1);
  test.ok(Object.keys(tracker.Tracker.prototype.rset).length === 0);

  test.done();
};

exports.pushRecuArrayProp = function(test) {
  reset();
  var obj:any = {};
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.a = [[]];
  obj._tracker.collect(obj);
  var id = obj.a._tracker._id;
  var v = '<' + id + '>';
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, [{obj: obj, write: 'a', value: v, lasttx: -1}]));
  var bid = obj.a[0]._tracker._id;
  var v2 = '[\'0\':<' + bid + '>]';
  test.ok(_.isEqual(tracker.Tracker.prototype.nset[bid], '[]'));
  test.ok(_.isEqual(tracker.Tracker.prototype.nset[id], v2));
  test.ok(_.isEqual(tracker.Tracker.prototype.rset[bid], 0));

  reset();
  var obj = {a: 1};
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.b = [[]];
  obj._tracker.collect(obj);
  var id = obj.b._tracker._id;
  var v = '<' + id + '>';
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, [{obj: obj, write: 'b', value: v, lasttx: -1}]));
  var bid = obj.b[0]._tracker._id;
  var v2 = '[\'0\':<' + bid + '>]';
  test.ok(_.isEqual(tracker.Tracker.prototype.nset[bid], '[]'));
  test.ok(_.isEqual(tracker.Tracker.prototype.nset[id], v2));
  test.ok(_.isEqual(tracker.Tracker.prototype.rset[bid], 0));

  test.done();
};

exports.readsetArray = function(test) {
  reset();
  var obj:any[] = [1, true, '', null, undefined];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj[0]; obj[1]; obj[2]; obj[3]; obj[4];
  (<any>obj)._tracker.collect(obj);
  test.ok(Object.keys(tracker.Tracker.prototype.nset).length === 0);
  test.ok(Object.keys(tracker.Tracker.prototype.rset).length === 0);

  reset();
  var embed:any = {};
  test.ok(typeof new tracker.Tracker(embed) === 'object');
  var obj = [embed];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj[0];
  (<any>obj)._tracker.collect(obj);
  test.ok(Object.keys(tracker.Tracker.prototype.nset).length === 0);
  test.ok(Object.keys(tracker.Tracker.prototype.rset).length === 1);
  test.ok(_.isEqual(tracker.Tracker.prototype.rset[embed._tracker._id], 0));

  reset();
  var embed = [];
  test.ok(typeof new tracker.Tracker(embed) === 'object');
  var obj = [embed];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj[0];
  (<any>obj)._tracker.collect(obj);
  test.ok(Object.keys(tracker.Tracker.prototype.nset).length === 0);
  test.ok(Object.keys(tracker.Tracker.prototype.rset).length === 1);
  test.ok(_.isEqual(tracker.Tracker.prototype.rset[embed._tracker._id], 0));

  test.done();
};

exports.readsetObject = function(test) {
  reset();
  var obj:any = {a: 1, b: true, c: '', d: null, e: undefined};
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.a; obj.b; obj.c; obj.d; obj.e;
  (<any>obj)._tracker.collect(obj);
  test.ok(Object.keys(tracker.Tracker.prototype.nset).length === 0);
  test.ok(Object.keys(tracker.Tracker.prototype.rset).length === 0);

  reset();
  var embed:any = {};
  test.ok(typeof new tracker.Tracker(embed) === 'object');
  var obj = {a: embed};
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.a;
  obj._tracker.collect(obj);
  test.ok(Object.keys(tracker.Tracker.prototype.nset).length === 0);
  test.ok(Object.keys(tracker.Tracker.prototype.rset).length === 1);
  test.ok(_.isEqual(tracker.Tracker.prototype.rset[embed._tracker._id], 0));

  reset();
  var embed = [];
  test.ok(typeof new tracker.Tracker(embed) === 'object');
  var obj = {a: embed};
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.a;
  obj._tracker.collect(obj);
  test.ok(Object.keys(tracker.Tracker.prototype.nset).length === 0);
  test.ok(Object.keys(tracker.Tracker.prototype.rset).length === 1);
  test.ok(_.isEqual(tracker.Tracker.prototype.rset[embed._tracker._id], 0));

  test.done();
};

exports.writesetArray1 = function(test) {
  reset();
  var obj:any[] = [1, true, '', null, undefined];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj[0] = 2; obj[1] = false; obj[2] = 'a'; obj[3] = undefined; obj[4] = null;
  (<any>obj)._tracker.collect(obj);
  var writeset = [
   {obj: obj, write: '0', value: '2', lasttx: -1},
   {obj: obj, write: '1', value: 'false', lasttx: 0},
   {obj: obj, write: '2', value: '\'a\'', lasttx: 1},
   {obj: obj, write: '3', value: 'undefined', lasttx: 2},
   {obj: obj, write: '4', value: 'null', lasttx: 3}];
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, writeset));
  test.ok(Object.keys(tracker.Tracker.prototype.nset).length === 0);
  test.ok(Object.keys(tracker.Tracker.prototype.rset).length === 0);
  
  reset();
  var embed:any = {};
  var obj = [null];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj[0] = embed;
  (<any>obj)._tracker.collect(obj);
  var id = embed._tracker._id;
  var v = '<' + id + '>';
  var writeset = [
   {obj: obj, write: '0', value: v, lasttx: -1}];
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, writeset));
  test.ok(_.isEqual(tracker.Tracker.prototype.nset[id], '{}'));
  test.ok(Object.keys(tracker.Tracker.prototype.nset).length === 1);
  test.ok(Object.keys(tracker.Tracker.prototype.rset).length === 0);

  reset();
  var embed = [];
  var obj = [null];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj[0] = embed;
  (<any>obj)._tracker.collect(obj);
  var id = embed._tracker._id;
  var v = '<' + id + '>';
  var writeset = [
   {obj: obj, write: '0', value: v, lasttx: -1}];
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, writeset));
  test.ok(_.isEqual(tracker.Tracker.prototype.nset[id], '[]'));
  test.ok(Object.keys(tracker.Tracker.prototype.nset).length === 1);
  test.ok(Object.keys(tracker.Tracker.prototype.rset).length === 0);

  test.done();
};

exports.writesetArray2 = function(test) {
  reset();
  var obj = [1, 2, 3];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.shift();
  obj.shift();
  obj.unshift(5, 4);
  (<any>obj)._tracker.collect(obj);
  var writeset: any[] = [
   {obj: obj, shift: true, lasttx: -1},
   {obj: obj, shift: true, lasttx: 0},
   {obj: obj, unshift: true, size: 2, lasttx: 1},
   {obj: obj, write: '0', value: '5', lasttx: 2},
   {obj: obj, write: '1', value: '4', lasttx: 3}];
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, writeset));

  reset();
  var obj = [1, 2, 3];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.pop();
  obj.pop();
  obj.push(4, 5);
  (<any>obj)._tracker.collect(obj);
  var writeset: any[]= [
   {obj: obj, write: '1', value: '4', lasttx: -1},
   {obj: obj, write: '2', value: '5', lasttx: 0}];
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, writeset));

  reset();
  var obj = [1, 2, 3];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.shift();
  obj.pop();
  obj.push(4);
  obj.unshift(0);
  (<any>obj)._tracker.collect(obj);
  var writeset2: any[]= [
   {obj: obj, shift: true, lasttx: -1},
   {obj: obj, unshift: true, size: 1, lasttx: 0},
   {obj: obj, write: '0', value: '0', lasttx: 1},
   {obj: obj, write: '2', value: '4', lasttx: 2}];
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, writeset2));

  reset();
  var obj = [1, 2, 3];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.pop();
  obj.shift();
  obj.unshift(0);
  obj.push(4);
  (<any>obj)._tracker.collect(obj);
  var writeset3: any[] = [
   {obj: obj, shift: true, lasttx: -1},
   {obj: obj, unshift: true, size: 1, lasttx: 0},
   {obj: obj, write: '0', value: '0', lasttx: 1},
   {obj: obj, write: '2', value: '4', lasttx: 2}];
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, writeset3));

  reset();
  var obj = [1, 2, 3];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.pop();
  obj.pop();
  obj.shift();
  obj.unshift(0);
  obj.push(4);
  (<any>obj)._tracker.collect(obj);
  var writeset4: any[] = [
   {obj: obj, shift: true, lasttx: -1},
   {obj: obj, unshift: true, size: 1, lasttx: 0},
   {obj: obj, write: '0', value: '0', lasttx: 1},
   {obj: obj, write: '1', value: '4', lasttx: 2},
   {obj: obj, del: '2', lasttx: 3}];
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, writeset4));

  reset();
  var obj = [1, 2, 3];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.pop();
  obj.shift();
  obj.shift();
  obj.unshift(0);
  obj.push(4);
  (<any>obj)._tracker.collect(obj);
  var writeset5: any[] = [
   {obj: obj, shift: true, lasttx: -1},
   {obj: obj, shift: true, lasttx: 0},
   {obj: obj, unshift: true, size: 1, lasttx: 1},
   {obj: obj, write: '0', value: '0', lasttx: 2},
   {obj: obj, write: '1', value: '4', lasttx: 3}];
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, writeset5));

  reset();
  var obj = [1, 2, 3];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.pop();
  obj.pop();
  obj.pop();
  obj.pop();
  obj.unshift(4);
  (<any>obj)._tracker.collect(obj);
  var writeset6: any[] = [
   {obj: obj, unshift: true, size: 1, lasttx: -1},
   {obj: obj, write: '0', value: '4', lasttx: 0},
   {obj: obj, del: '1', lasttx: 1},
   {obj: obj, del: '2', lasttx: 2},
   {obj: obj, del: '3', lasttx: 3}];
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, writeset6));

  reset();
  var obj = [1, 2, 3];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.shift();
  obj.shift();
  obj.shift();
  obj.push(4);
  (<any>obj)._tracker.collect(obj);
  var writeset7: any[] = [
   {obj: obj, shift: true, lasttx: -1},
   {obj: obj, shift: true, lasttx: 0},
   {obj: obj, shift: true, lasttx: 1},
   {obj: obj, write: '0', value: '4', lasttx: 2}];
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, writeset7));

  test.done();
};

exports.delObject = function(test) {

  reset();
  var obj = {a: 1, b: 2, c: 3};
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  delete obj.b;
  (<any>obj)._tracker.collect(obj);
  var writeset : any[] = [
   {obj: obj, del: 'b', lasttx: -1}];
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, writeset));

  reset();
  var obj = {a: 1, b: 2, c: 3};
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  delete obj.a;
  delete obj.b;
  delete obj.b;
  delete obj.c;
  (<any>obj)._tracker.collect(obj);
  var writeset : any[] = [
   {obj: obj, del: 'a', lasttx: -1},
   {obj: obj, del: 'b', lasttx: 0},
   {obj: obj, del: 'c', lasttx: 1}];
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, writeset));

  reset();
  var obj = {a: 1, b: 2, c: 3};
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  delete obj.b;
  obj.b = 1;
  obj.b = 4;
  (<any>obj)._tracker.collect(obj);
  var writeset2 : any[] = [
   {obj: obj, del: 'b', lasttx: -1},
   {obj: obj, write: 'b', value: '4', lasttx: 0}];
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, writeset2));

  test.done();
};

exports.delArray = function(test) {

  reset();
  var obj = [1, 2, 3];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  delete obj[1];
  (<any>obj)._tracker.collect(obj);
  var writeset = [
   {obj: obj, del: '1', lasttx: -1}];
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, writeset));

  reset();
  var obj = [1, 2, 3];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  delete obj[0];
  delete obj[1];
  delete obj[1];
  delete obj[2];
  (<any>obj)._tracker.collect(obj);
  var writeset = [
   {obj: obj, del: '0', lasttx: -1},
   {obj: obj, del: '1', lasttx: 0},
   {obj: obj, del: '2', lasttx: 1}];
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, writeset));

  reset();
  var obj = [1, 2, 3];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  delete obj[1];
  delete obj[5];
  obj[1] = 1;
  obj[1] = 4;
  (<any>obj)._tracker.collect(obj);
  var writeset2 = [
   {obj: obj, write: '1', value: '4', lasttx: -1}];
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, writeset2));

  test.done();
};

exports.reverse = function(test) {

  reset();
  var obj:any = [1, 2, 3, 4];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.reverse();
  obj._tracker.collect(obj);
  var writeset = [
   {obj: obj, reverse: true, lasttx: -1}];
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, writeset));
  test.ok(_.isEqual(obj, [4, 3, 2, 1]));

  reset();
  var obj = [1, 2, 3, 4];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.reverse();
  obj.reverse();
  obj._tracker.collect(obj);
  var writeset = [
   {obj: obj, reverse: true, lasttx: -1},
   {obj: obj, reverse: true, lasttx: 0}];
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, writeset));
  test.ok(_.isEqual(obj, [1, 2, 3, 4]));

  reset();
  var obj = [1, 2, 3, 4];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  delete obj[1];
  obj[1] = 2;
  obj.reverse();
  obj._tracker.collect(obj);
  var writeset2:any[] = [
   {obj: obj, reverse: true, lasttx: -1},
   {obj: obj, write: '2', value: '2', lasttx: 0}];
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, writeset2));
  test.ok(_.isEqual(obj, [4, 3, 2, 1]));

  test.done();
};

exports.sort = function(test) {

  reset();
  var obj:any = [4, 2, 3, 1];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.sort();
  obj._tracker.collect(obj);
  var writeset = [
   {obj: obj, reinit: '[\'0\':1,\'1\':2,\'2\':3,\'3\':4]', lasttx: -1}];
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, writeset));
  test.ok(_.isEqual(obj, [1, 2, 3, 4]));

  reset();
  var obj = [4, 2, 3, 1];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.reverse();
  obj.sort();
  obj._tracker.collect(obj);
  var writeset = [null,
   {obj: obj, reinit: '[\'0\':1,\'1\':2,\'2\':3,\'3\':4]', lasttx: -1}];
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, writeset));
  test.ok(_.isEqual(obj, [1, 2, 3, 4]));

  reset();
  var obj = [4, 2, 3, 1];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj[1] = 2;
  obj.sort();
  obj._tracker.collect(obj);
  var writeset = [null,
   {obj: obj, reinit: '[\'0\':1,\'1\':2,\'2\':3,\'3\':4]', lasttx: -1}];
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, writeset));
  test.ok(_.isEqual(obj, [1, 2, 3, 4]));

  reset();
  var obj = [4, 2, 3, 1];
  test.ok(typeof new tracker.Tracker(obj) === 'object');
  obj.sort();
  delete obj[1];
  obj[1] = 2;
  obj.reverse();
  obj._tracker.collect(obj);
  var writeset2: any[] = [
   {obj: obj, reinit: '[\'0\':4,\'1\':3,\'2\':2,\'3\':1]', lasttx: -1},
   {obj: obj, reverse: true, lasttx: 0},
   {obj: obj, write: '2', value: '2', lasttx: 1}];
  test.ok(_.isEqual(tracker.Tracker.prototype.cset, writeset2));

  test.done();
};