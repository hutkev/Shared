/// <reference path='../defs/node-0.8.d.ts' />
/// <reference path='../lib/shared.ts' />

module testtracker {

  import tracker = shared.tracker;
  import utils = shared.utils;

  var cache : tracker.TrackCache;

  function reset() {
    cache = new shared.main.Cache();
  }

  export function methods(test) {
    reset();
    var obj = [];
    var t = new tracker.Tracker(cache,obj);
    test.ok(typeof t.id === 'function');
    test.ok(typeof t.rev === 'function');
    test.ok(typeof t.collect === 'function');
    test.done();
  };

  export function illegaltype(test) {
    reset();
    test.throws(function () { new tracker.Tracker(cache,null); }, Error);
    test.throws(function () { new tracker.Tracker(cache,undefined); }, Error);
    test.throws(function () { new tracker.Tracker(cache,0); }, Error);
    test.throws(function () { new tracker.Tracker(cache,1); }, Error);
    test.throws(function () { new tracker.Tracker(cache,''); }, Error);
    test.throws(function () { new tracker.Tracker(cache,'a'); }, Error);
    test.throws(function () { new tracker.Tracker(cache,true); }, Error);
    test.throws(function () { new tracker.Tracker(cache,false); }, Error);
    test.done();
  };

  export function objctor(test) {
    var obj: any = {};
    var t = new tracker.Tracker(cache,obj);
    test.ok(typeof obj._tracker === 'object');
    test.ok(obj._tracker === t);
    test.ok(utils.isObject(t.type()));
    test.done();
  };

  export function idobjctor(test) {
    test.throws(function () { new tracker.Tracker(cache,{}, '1'); }, Error);
    test.throws(function () { new tracker.Tracker(cache,{}, '12'); }, Error);

    var obj = {};
    var t = new tracker.Tracker(cache,{}, '12345678-1234-1234-1234-123456789012');
    test.ok(typeof t == 'object');
    test.ok(t.id().toString() == '12345678-1234-1234-1234-123456789012');
    test.done();
  };

  export function arrayctor(test) {
    var obj: any = [];
    var t = new tracker.Tracker(cache,obj);
    test.ok(typeof obj._tracker === 'object');
    test.ok(obj._tracker === t);
    test.ok(utils.isObject(t.type()));
    test.done();
  };

  export function idarrayctor(test) {
    test.throws(function () { new tracker.Tracker(cache,[], '1'); }, Error);
    test.throws(function () { new tracker.Tracker(cache,[], '12'); }, Error);

    var obj = [];
    var t = new tracker.Tracker(cache,{}, '12345678-1234-1234-1234-123456789012');
    test.ok(typeof t == 'object');
    test.ok(t.id().toString() == '12345678-1234-1234-1234-123456789012');
    test.done();
  };

  export function rev(test) {
    var obj = [];
    var t = new tracker.Tracker(cache,obj);
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

  export function wrapNumber(test) {
    reset();
    var obj = { a: 1 };
    var t = new tracker.Tracker(cache,obj);
    test.ok(typeof obj.a == 'number');
    test.ok(obj.a === 1);
    obj.a = 2;
    test.ok(utils.isEqual(cache.cset()[0], { obj: obj, write: 'a', value: '2', lasttx: -1 }));
    test.ok(Object.keys(cache.rset()).length === 0);
    test.ok(Object.keys(cache.nset()).length === 0);
    test.ok(obj.a === 2);
    test.done();
  };

  export function wrapString(test) {
    reset();
    var obj = { a: 'b' };
    var t = new tracker.Tracker(cache,obj);
    test.ok(typeof obj.a == 'string');
    test.ok(obj.a === 'b');
    obj.a = 'c';
    test.ok(utils.isEqual(cache.cset()[0], { obj: obj, write: 'a', value: '"c"', lasttx: -1 }));
    test.ok(Object.keys(cache.rset()).length === 0);
    test.ok(Object.keys(cache.nset()).length === 0);
    test.ok(obj.a === 'c');
    test.done();
  };

  export function wrapBoolean(test) {
    reset();
    var obj = { a: true };
    var t = new tracker.Tracker(cache,obj);
    test.ok(typeof obj.a == 'boolean');
    test.ok(obj.a === true);
    obj.a = false;
    test.ok(utils.isEqual(cache.cset()[0], { obj: obj, write: 'a', value: 'false', lasttx: -1 }));
    test.ok(Object.keys(cache.rset()).length === 0);
    test.ok(Object.keys(cache.nset()).length === 0);
    test.ok(obj.a === false);
    test.done();
  };

  export function wrapFunc(test) {
    reset();
    var f = function () { };
    var obj: any = { a: f };
    var t = new tracker.Tracker(cache,obj);
    test.ok(typeof obj.a == 'function');
    obj.a = function (a) { };
    test.ok(utils.isEqual(cache.cset()[0], { obj: obj, write: 'a', value: 'null', lasttx: -1 }));
    test.ok(Object.keys(cache.rset()).length === 0);
    test.ok(Object.keys(cache.nset()).length === 0);
    test.done();
  };

  export function wrapObj(test) {
    reset();
    var nobj = {};
    var t2 = new tracker.Tracker(cache,nobj);
    var obj: any = { a: nobj };
    var t = new tracker.Tracker(cache,obj);
    test.ok(typeof obj.a == 'object');
    test.ok(utils.isEqual(obj.a, {}));
    test.ok(utils.isEqual(cache.rset()[t2.id().toString()], 0));
    test.ok(Object.keys(cache.rset()).length === 1);
    obj.a = { b: 1 };
    test.ok(Object.keys(cache.rset()).length === 1);
    var v = '<' + obj.a._tracker._id + '>';
    test.ok(utils.isEqual(cache.cset()[0], { obj: obj, write: 'a', value: v, lasttx: -1 }));
    var id = obj.a._tracker._id;
    test.ok(utils.isEqual(cache.nset()[id], '{"b":1}'));
    test.ok(Object.keys(cache.nset()).length === 1);
    test.ok(utils.isEqual(obj.a, { b: 1 }));
    test.done();
  };

  export function wrapArray(test) {
    reset();
    var nobj = [];
    var t2 = new tracker.Tracker(cache,nobj);
    var obj: any = { a: nobj };
    var t = new tracker.Tracker(cache,obj);
    test.ok(typeof obj.a == 'object');
    test.ok(utils.isEqual(obj.a, []));
    test.ok(utils.isEqual(cache.rset()[t2.id().toString()], 0));
    test.ok(Object.keys(cache.rset()).length === 1);
    obj.a = [1];
    var v = '<' + obj.a._tracker._id + '>';
    test.ok(utils.isEqual(cache.cset()[0], { obj: obj, write: 'a', value: v, lasttx: -1 }));
    var id = obj.a._tracker._id;
    test.ok(utils.isEqual(cache.nset()[id], '["0":1]'));
    test.ok(Object.keys(cache.nset()).length === 1);
    test.ok(utils.isEqual(obj.a, [1]));
    test.done();
  };

  export function cycleTypes(test) {
    reset();
    var obj: any = { a: 1 };
    var t = new tracker.Tracker(cache,obj);
    test.ok(typeof obj.a == 'number');
    test.ok(obj.a === 1);
    test.ok(Object.keys(cache.rset()).length === 0);
    obj.a = '';
    test.ok(obj.a === '');
    test.ok(Object.keys(cache.rset()).length === 0);
    test.ok(utils.isEqual(cache.cset()[0], { obj: obj, write: 'a', value: '""', lasttx: -1 }));
    obj.a = true;
    test.ok(obj.a === true);
    test.ok(Object.keys(cache.rset()).length === 0);
    test.ok(utils.isEqual(cache.cset()[1], { obj: obj, write: 'a', value: 'true', lasttx: 0 }));
    var f = function () { };
    obj.a = f;
    test.ok(obj.a === f);
    test.ok(Object.keys(cache.rset()).length === 0);
    test.ok(Object.keys(cache.nset()).length === 0);
    test.ok(utils.isEqual(cache.cset()[2], { obj: obj, write: 'a', value: 'null', lasttx: 1 }));
    obj.a = {};
    var id = obj.a._tracker._id;
    var v = '<' + id + '>';
    test.ok(utils.isEqual(cache.cset()[3], { obj: obj, write: 'a', value: v, lasttx: 2 }));
    test.ok(utils.isEqual(cache.rset()[id], 0));
    test.ok(Object.keys(cache.rset()).length === 1);
    test.ok(utils.isEqual(cache.nset()[id], '{}'));
    test.ok(Object.keys(cache.nset()).length === 1);
    obj.a = [];
    var id = obj.a._tracker._id;
    var v = '<' + id + '>';
    test.ok(utils.isEqual(cache.cset()[4], { obj: obj, write: 'a', value: v, lasttx: 3 }));
    test.ok(utils.isEqual(cache.rset()[id], 0));
    test.ok(Object.keys(cache.rset()).length === 2);
    test.ok(utils.isEqual(cache.nset()[id], '[]'));
    test.ok(Object.keys(cache.nset()).length === 2);
    test.done();
  };

  export function unwrapable(test) {
    var obj: any = {};
    Object.defineProperty(obj, 'a', {
      enumerable: true,
      configurable: false,
      value: 1
    });
    test.throws(function () { new tracker.Tracker(cache,obj); }, Error);

    var obj: any = [];
    Object.defineProperty(obj, 'a', {
      enumerable: true,
      configurable: false,
      value: 1
    });
    test.throws(function () { new tracker.Tracker(cache,obj); }, Error);

    test.done();
  };

  export function nonenum(test) {
    reset();
    var obj: any = {};
    Object.defineProperty(obj, 'a', {
      enumerable: false,
      configurable: true,
      value: 1
    });
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    test.ok(obj.a === 1);
    test.ok(obj._tracker.tc().cset().length === 0);

    reset();
    var obj: any = [];
    Object.defineProperty(obj, 'a', {
      enumerable: false,
      configurable: true,
      value: 1
    });
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    test.ok(obj.a === 1);
    test.ok(obj._tracker.tc().cset().length === 0);

    test.done();
  };

  export function deleteable(test) {
    var obj: any = { a: 1 };
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    test.ok(obj.a === 1);
    delete obj.a;
    test.ok(obj.a === undefined);

    var obj: any = [1];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    test.ok(obj[0] === 1);
    delete obj[0];
    test.ok(obj[0] === undefined);

    test.done();
  };

  export function arrreverse(test) {
    reset();
    var obj = [1, 2, 3, 4];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.reverse();
    test.ok(utils.isEqual(cache.cset()[0], { obj: obj, reverse: true, lasttx: -1 }));
    test.ok(utils.isEqual(obj, [4, 3, 2, 1]));

    reset();
    var obj = [1, 2, 3, 4];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.reverse();
    obj.reverse();
    test.ok(utils.isEqual(cache.cset()[0], { obj: obj, reverse: true, lasttx: -1 }));
    test.ok(utils.isEqual(cache.cset()[1], { obj: obj, reverse: true, lasttx: 0 }));
    test.ok(utils.isEqual(obj, [1, 2, 3, 4]));
    test.done();
  };

  export function arrsort(test) {
    reset();
    var obj = [1, 2, 3, 4];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.sort();
    test.ok(utils.isEqual(cache.cset()[0], { obj: obj, sort: true, lasttx: -1 }));
    test.ok(utils.isEqual(obj, [1, 2, 3, 4]));

    reset();
    var obj = [1, 2, 3, 4];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.sort(function (a, b) { return b - a });
    obj.sort(function (a, b) { return b - a });
    test.ok(utils.isEqual(cache.cset()[0], { obj: obj, sort: true, lasttx: -1 }));
    test.ok(utils.isEqual(cache.cset()[1], { obj: obj, sort: true, lasttx: 0 }));
    test.ok(utils.isEqual(obj, [4, 3, 2, 1]));
    test.done();
  };

  export function arrshift(test) {
    reset();
    var obj = [1, 2];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.shift();
    test.ok(utils.isEqual(cache.cset()[0], { obj: obj, shift: true, lasttx: -1 }));
    obj.unshift(3);
    test.ok(utils.isEqual(cache.cset()[1], { obj: obj, unshift: true, size: 1, lasttx: 0 }));
    test.ok(utils.isEqual(cache.cset()[2], { obj: obj, write: '0', value: '3', lasttx: 1 }));
    obj.unshift(4, 5);
    test.ok(utils.isEqual(cache.cset()[3], { obj: obj, unshift: true, size: 2, lasttx: 2 }));
    test.ok(utils.isEqual(cache.cset()[4], { obj: obj, write: '0', value: '4', lasttx: 3 }));
    test.ok(utils.isEqual(cache.cset()[5], { obj: obj, write: '1', value: '5', lasttx: 4 }));

    test.ok(obj, [4, 5, 3, 1]);
    test.done();
  };

  export function pushNumberProp(test) {
    reset();
    var obj: any = {};
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.a = 1;
    obj._tracker.collect(obj);
    test.ok(utils.isEqual(cache.cset(), [{ obj: obj, write: 'a', value: '1', lasttx: -1 }]));

    reset();
    var obj = { a: 1 };
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.b = 2;
    obj._tracker.collect(obj);
    test.ok(utils.isEqual(cache.cset(), [{ obj: obj, write: 'b', value: '2', lasttx: -1 }]));

    test.done();
  };

  export function pushBoolProp(test) {
    reset();
    var obj: any = {};
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.a = true;
    obj._tracker.collect(obj);
    test.ok(utils.isEqual(cache.cset(), [{ obj: obj, write: 'a', value: 'true', lasttx: -1 }]));

    reset();
    var obj = { a: 1 };
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.b = false;
    obj._tracker.collect(obj);
    test.ok(utils.isEqual(cache.cset(), [{ obj: obj, write: 'b', value: 'false', lasttx: -1 }]));

    test.done();
  };

  export function pushStringProp(test) {
    reset();
    var obj: any = {};
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.a = 'a';
    obj._tracker.collect(obj);
    test.ok(utils.isEqual(cache.cset(), [{ obj: obj, write: 'a', value: '"a"', lasttx: -1 }]));

    reset();
    var obj = { a: 1 };
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.b = 'b';
    obj._tracker.collect(obj);
    test.ok(utils.isEqual(cache.cset(), [{ obj: obj, write: 'b', value: '"b"', lasttx: -1 }]));

    test.done();
  };

  export function pushOtherProp(test) {
    reset();
    var obj: any = {};
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.a = null;
    obj._tracker.collect(obj);
    test.ok(utils.isEqual(cache.cset(), [{ obj: obj, write: 'a', value: 'null', lasttx: -1 }]));

    reset();
    var obj = { a: 1 };
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.b = undefined;
    obj._tracker.collect(obj);
    test.ok(utils.isEqual(cache.cset(), [{ obj: obj, write: 'b', value: 'undefined', lasttx: -1 }]));

    test.done();
  };

  export function pushObjectProp(test) {
    reset();
    var obj: any = {};
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.a = {};
    obj._tracker.collect(obj);
    var id = obj.a._tracker._id;
    var v = '<' + id + '>';
    test.ok(utils.isEqual(cache.cset(), [{ obj: obj, write: 'a', value: v, lasttx: -1 }]));
    test.ok(utils.isEqual(cache.nset()[id], '{}'));
    test.ok(Object.keys(cache.nset()).length === 1);
    test.ok(Object.keys(cache.rset()).length === 0);

    reset();
    var obj = { a: 1 };
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.b = {};
    obj._tracker.collect(obj);
    var id = obj.b._tracker._id;
    var v = '<' + id + '>';
    test.ok(utils.isEqual(cache.cset(), [{ obj: obj, write: 'b', value: v, lasttx: -1 }]));
    test.ok(utils.isEqual(cache.nset()[id], '{}'));
    test.ok(Object.keys(cache.nset()).length === 1);
    test.ok(Object.keys(cache.rset()).length === 0);

    test.done();
  };

  export function pushRecuObjectProp(test) {
    reset();
    var obj: any = {};
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.a = { b: {} };
    obj._tracker.collect(obj);
    var id = obj.a._tracker._id;
    var v = '<' + id + '>';
    test.ok(utils.isEqual(cache.cset(), [{ obj: obj, write: 'a', value: v, lasttx: -1 }]));
    var bid = obj.a.b._tracker._id;
    var v2 = '{"b":<' + bid + '>}';
    test.ok(utils.isEqual(cache.nset()[bid], '{}'));
    test.ok(utils.isEqual(cache.nset()[id], v2));
    test.ok(utils.isEqual(cache.rset()[bid], 0));

    reset();
    var obj = { a: 1 };
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.b = { c: {} };
    obj._tracker.collect(obj);
    var id = obj.b._tracker._id;
    var v = '<' + id + '>';
    test.ok(utils.isEqual(cache.cset(), [{ obj: obj, write: 'b', value: v, lasttx: -1 }]));
    var bid = obj.b.c._tracker._id;
    var v2 = '{"c":<' + bid + '>}';
    test.ok(utils.isEqual(cache.nset()[bid], '{}'));
    test.ok(utils.isEqual(cache.nset()[id], v2));
    test.ok(utils.isEqual(cache.rset()[bid], 0));
    test.done();
  };

  export function pushArrayProp(test) {
    reset();
    var obj: any = {};
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.a = [];
    obj._tracker.collect(obj);
    var id = obj.a._tracker._id;
    var v = '<' + id + '>';
    test.ok(utils.isEqual(cache.cset(), [{ obj: obj, write: 'a', value: v, lasttx: -1 }]));
    test.ok(utils.isEqual(cache.nset()[id], '[]'));
    test.ok(Object.keys(cache.nset()).length === 1);
    test.ok(Object.keys(cache.rset()).length === 0);

    reset();
    var obj = { a: 1 };
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.b = [];
    obj._tracker.collect(obj);
    var id = obj.b._tracker._id;
    var v = '<' + id + '>';
    test.ok(utils.isEqual(cache.cset(), [{ obj: obj, write: 'b', value: v, lasttx: -1 }]));
    test.ok(utils.isEqual(cache.nset()[id], '[]'));
    test.ok(Object.keys(cache.nset()).length === 1);
    test.ok(Object.keys(cache.rset()).length === 0);

    test.done();
  };

  export function pushRecuArrayProp(test) {
    reset();
    var obj: any = {};
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.a = [[]];
    obj._tracker.collect(obj);
    var id = obj.a._tracker._id;
    var v = '<' + id + '>';
    test.ok(utils.isEqual(cache.cset(), [{ obj: obj, write: 'a', value: v, lasttx: -1 }]));
    var bid = obj.a[0]._tracker._id;
    var v2 = '["0":<' + bid + '>]';
    test.ok(utils.isEqual(cache.nset()[bid], '[]'));
    test.ok(utils.isEqual(cache.nset()[id], v2));
    test.ok(utils.isEqual(cache.rset()[bid], 0));

    reset();
    var obj = { a: 1 };
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.b = [[]];
    obj._tracker.collect(obj);
    var id = obj.b._tracker._id;
    var v = '<' + id + '>';
    test.ok(utils.isEqual(cache.cset(), [{ obj: obj, write: 'b', value: v, lasttx: -1 }]));
    var bid = obj.b[0]._tracker._id;
    var v2 = '["0":<' + bid + '>]';
    test.ok(utils.isEqual(cache.nset()[bid], '[]'));
    test.ok(utils.isEqual(cache.nset()[id], v2));
    test.ok(utils.isEqual(cache.rset()[bid], 0));

    test.done();
  };

  export function readsetArray(test) {
    reset();
    var obj: any[] = [1, true, '', null, undefined];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj[0]; obj[1]; obj[2]; obj[3]; obj[4];
    (<any>obj)._tracker.collect(obj);
    test.ok(Object.keys(cache.nset()).length === 0);
    test.ok(Object.keys(cache.rset()).length === 0);

    reset();
    var embed: any = {};
    test.ok(typeof new tracker.Tracker(cache,embed) === 'object');
    var obj = [embed];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj[0];
    (<any>obj)._tracker.collect(obj);
    test.ok(Object.keys(cache.nset()).length === 0);
    test.ok(Object.keys(cache.rset()).length === 1);
    test.ok(utils.isEqual(cache.rset()[embed._tracker._id], 0));

    reset();
    var embed = [];
    test.ok(typeof new tracker.Tracker(cache,embed) === 'object');
    var obj = [embed];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj[0];
    (<any>obj)._tracker.collect(obj);
    test.ok(Object.keys(cache.nset()).length === 0);
    test.ok(Object.keys(cache.rset()).length === 1);
    test.ok(utils.isEqual(cache.rset()[embed._tracker._id], 0));

    test.done();
  };

  export function readsetObject(test) {
    reset();
    var obj: any = { a: 1, b: true, c: '', d: null, e: undefined };
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.a; obj.b; obj.c; obj.d; obj.e;
    (<any>obj)._tracker.collect(obj);
    test.ok(Object.keys(cache.nset()).length === 0);
    test.ok(Object.keys(cache.rset()).length === 0);

    reset();
    var embed: any = {};
    test.ok(typeof new tracker.Tracker(cache,embed) === 'object');
    var obj = { a: embed };
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.a;
    obj._tracker.collect(obj);
    test.ok(Object.keys(cache.nset()).length === 0);
    test.ok(Object.keys(cache.rset()).length === 1);
    test.ok(utils.isEqual(cache.rset()[embed._tracker._id], 0));

    reset();
    var embed = [];
    test.ok(typeof new tracker.Tracker(cache,embed) === 'object');
    var obj = { a: embed };
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.a;
    obj._tracker.collect(obj);
    test.ok(Object.keys(cache.nset()).length === 0);
    test.ok(Object.keys(cache.rset()).length === 1);
    test.ok(utils.isEqual(cache.rset()[embed._tracker._id], 0));

    test.done();
  };

  export function writesetArray1(test) {
    reset();
    var obj: any[] = [1, true, '', null, undefined];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj[0] = 2; obj[1] = false; obj[2] = 'a'; obj[3] = undefined; obj[4] = null;
    (<any>obj)._tracker.collect(obj);
    var writeset = [
     { obj: obj, write: '0', value: '2', lasttx: -1 },
     { obj: obj, write: '1', value: 'false', lasttx: 0 },
     { obj: obj, write: '2', value: '"a"', lasttx: 1 },
     { obj: obj, write: '3', value: 'undefined', lasttx: 2 },
     { obj: obj, write: '4', value: 'null', lasttx: 3 }];
    test.ok(utils.isEqual(cache.cset(), writeset));
    test.ok(Object.keys(cache.nset()).length === 0);
    test.ok(Object.keys(cache.rset()).length === 0);

    reset();
    var embed: any = {};
    var obj = [null];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj[0] = embed;
    (<any>obj)._tracker.collect(obj);
    var id = embed._tracker._id;
    var v = '<' + id + '>';
    var writeset = [
     { obj: obj, write: '0', value: v, lasttx: -1 }];
    test.ok(utils.isEqual(cache.cset(), writeset));
    test.ok(utils.isEqual(cache.nset()[id], '{}'));
    test.ok(Object.keys(cache.nset()).length === 1);
    test.ok(Object.keys(cache.rset()).length === 0);

    reset();
    var embed = [];
    var obj = [null];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj[0] = embed;
    (<any>obj)._tracker.collect(obj);
    var id = embed._tracker._id;
    var v = '<' + id + '>';
    var writeset = [
     { obj: obj, write: '0', value: v, lasttx: -1 }];
    test.ok(utils.isEqual(cache.cset(), writeset));
    test.ok(utils.isEqual(cache.nset()[id], '[]'));
    test.ok(Object.keys(cache.nset()).length === 1);
    test.ok(Object.keys(cache.rset()).length === 0);

    test.done();
  };

  export function writesetArray2(test) {
    reset();
    var obj = [1, 2, 3];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.shift();
    obj.shift();
    obj.unshift(5, 4);
    (<any>obj)._tracker.collect(obj);
    var writeset: any[] = [
     { obj: obj, shift: true, lasttx: -1 },
     { obj: obj, shift: true, lasttx: 0 },
     { obj: obj, unshift: true, size: 2, lasttx: 1 },
     { obj: obj, write: '0', value: '5', lasttx: 2 },
     { obj: obj, write: '1', value: '4', lasttx: 3 }];
    test.ok(utils.isEqual(cache.cset(), writeset));

    reset();
    var obj = [1, 2, 3];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.pop();
    obj.pop();
    obj.push(4, 5);
    (<any>obj)._tracker.collect(obj);
    var writeset: any[] = [
     { obj: obj, write: '1', value: '4', lasttx: -1 },
     { obj: obj, write: '2', value: '5', lasttx: 0 }];
    test.ok(utils.isEqual(cache.cset(), writeset));

    reset();
    var obj = [1, 2, 3];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.shift();
    obj.pop();
    obj.push(4);
    obj.unshift(0);
    (<any>obj)._tracker.collect(obj);
    var writeset2: any[] = [
     { obj: obj, shift: true, lasttx: -1 },
     { obj: obj, unshift: true, size: 1, lasttx: 0 },
     { obj: obj, write: '0', value: '0', lasttx: 1 },
     { obj: obj, write: '2', value: '4', lasttx: 2 }];
    test.ok(utils.isEqual(cache.cset(), writeset2));

    reset();
    var obj = [1, 2, 3];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.pop();
    obj.shift();
    obj.unshift(0);
    obj.push(4);
    (<any>obj)._tracker.collect(obj);
    var writeset3: any[] = [
     { obj: obj, shift: true, lasttx: -1 },
     { obj: obj, unshift: true, size: 1, lasttx: 0 },
     { obj: obj, write: '0', value: '0', lasttx: 1 },
     { obj: obj, write: '2', value: '4', lasttx: 2 }];
    test.ok(utils.isEqual(cache.cset(), writeset3));

    reset();
    var obj = [1, 2, 3];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.pop();
    obj.pop();
    obj.shift();
    obj.unshift(0);
    obj.push(4);
    (<any>obj)._tracker.collect(obj);
    var writeset4: any[] = [
     { obj: obj, shift: true, lasttx: -1 },
     { obj: obj, unshift: true, size: 1, lasttx: 0 },
     { obj: obj, write: '0', value: '0', lasttx: 1 },
     { obj: obj, write: '1', value: '4', lasttx: 2 },
     { obj: obj, del: '2', lasttx: 3 }];
    test.ok(utils.isEqual(cache.cset(), writeset4));

    reset();
    var obj = [1, 2, 3];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.pop();
    obj.shift();
    obj.shift();
    obj.unshift(0);
    obj.push(4);
    (<any>obj)._tracker.collect(obj);
    var writeset5: any[] = [
     { obj: obj, shift: true, lasttx: -1 },
     { obj: obj, shift: true, lasttx: 0 },
     { obj: obj, unshift: true, size: 1, lasttx: 1 },
     { obj: obj, write: '0', value: '0', lasttx: 2 },
     { obj: obj, write: '1', value: '4', lasttx: 3 }];
    test.ok(utils.isEqual(cache.cset(), writeset5));

    reset();
    var obj = [1, 2, 3];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.pop();
    obj.pop();
    obj.pop();
    obj.pop();
    obj.unshift(4);
    (<any>obj)._tracker.collect(obj);
    var writeset6: any[] = [
     { obj: obj, unshift: true, size: 1, lasttx: -1 },
     { obj: obj, write: '0', value: '4', lasttx: 0 },
     { obj: obj, del: '1', lasttx: 1 },
     { obj: obj, del: '2', lasttx: 2 },
     { obj: obj, del: '3', lasttx: 3 }];
    test.ok(utils.isEqual(cache.cset(), writeset6));

    reset();
    var obj = [1, 2, 3];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.shift();
    obj.shift();
    obj.shift();
    obj.push(4);
    (<any>obj)._tracker.collect(obj);
    var writeset7: any[] = [
     { obj: obj, shift: true, lasttx: -1 },
     { obj: obj, shift: true, lasttx: 0 },
     { obj: obj, shift: true, lasttx: 1 },
     { obj: obj, write: '0', value: '4', lasttx: 2 }];
    test.ok(utils.isEqual(cache.cset(), writeset7));

    test.done();
  };

  export function delObject(test) {

    reset();
    var obj = { a: 1, b: 2, c: 3 };
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    delete obj.b;
    (<any>obj)._tracker.collect(obj);
    var writeset: any[] = [
     { obj: obj, del: 'b', lasttx: -1 }];
    test.ok(utils.isEqual(cache.cset(), writeset));

    reset();
    var obj = { a: 1, b: 2, c: 3 };
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    delete obj.a;
    delete obj.b;
    delete obj.b;
    delete obj.c;
    (<any>obj)._tracker.collect(obj);
    var writeset: any[] = [
     { obj: obj, del: 'a', lasttx: -1 },
     { obj: obj, del: 'b', lasttx: 0 },
     { obj: obj, del: 'c', lasttx: 1 }];
    test.ok(utils.isEqual(cache.cset(), writeset));

    reset();
    var obj = { a: 1, b: 2, c: 3 };
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    delete obj.b;
    obj.b = 1;
    obj.b = 4;
    (<any>obj)._tracker.collect(obj);
    var writeset2: any[] = [
     { obj: obj, del: 'b', lasttx: -1 },
     { obj: obj, write: 'b', value: '4', lasttx: 0 }];
    test.ok(utils.isEqual(cache.cset(), writeset2));

    test.done();
  };

  export function delArray(test) {

    reset();
    var obj = [1, 2, 3];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    delete obj[1];
    (<any>obj)._tracker.collect(obj);
    var writeset = [
     { obj: obj, del: '1', lasttx: -1 }];
    test.ok(utils.isEqual(cache.cset(), writeset));

    reset();
    var obj = [1, 2, 3];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    delete obj[0];
    delete obj[1];
    delete obj[1];
    delete obj[2];
    (<any>obj)._tracker.collect(obj);
    var writeset = [
     { obj: obj, del: '0', lasttx: -1 },
     { obj: obj, del: '1', lasttx: 0 },
     { obj: obj, del: '2', lasttx: 1 }];
    test.ok(utils.isEqual(cache.cset(), writeset));

    reset();
    var obj = [1, 2, 3];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    delete obj[1];
    delete obj[5];
    obj[1] = 1;
    obj[1] = 4;
    (<any>obj)._tracker.collect(obj);
    var writeset2 = [
     { obj: obj, write: '1', value: '4', lasttx: -1 }];
    test.ok(utils.isEqual(cache.cset(), writeset2));

    test.done();
  };

  export function reverse(test) {

    reset();
    var obj: any = [1, 2, 3, 4];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.reverse();
    obj._tracker.collect(obj);
    var writeset = [
     { obj: obj, reverse: true, lasttx: -1 }];
    test.ok(utils.isEqual(cache.cset(), writeset));
    test.ok(utils.isEqual(obj, [4, 3, 2, 1]));

    reset();
    var obj = [1, 2, 3, 4];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.reverse();
    obj.reverse();
    obj._tracker.collect(obj);
    var writeset = [
     { obj: obj, reverse: true, lasttx: -1 },
     { obj: obj, reverse: true, lasttx: 0 }];
    test.ok(utils.isEqual(cache.cset(), writeset));
    test.ok(utils.isEqual(obj, [1, 2, 3, 4]));

    reset();
    var obj = [1, 2, 3, 4];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    delete obj[1];
    obj[1] = 2;
    obj.reverse();
    obj._tracker.collect(obj);
    var writeset2: any[] = [
     { obj: obj, reverse: true, lasttx: -1 },
     { obj: obj, write: '2', value: '2', lasttx: 0 }];
    test.ok(utils.isEqual(cache.cset(), writeset2));
    test.ok(utils.isEqual(obj, [4, 3, 2, 1]));

    test.done();
  };

  export function sort(test) {
    
    reset();
    var obj: any = [4, 2, 3, 1];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.sort();
    obj._tracker.collect(obj);
    var writeset = [
     { obj: obj, reinit: '["0":1,"1":2,"2":3,"3":4]', lasttx: -1 }];
    test.ok(utils.isEqual(cache.cset(), writeset));
    test.ok(utils.isEqual(obj, [1, 2, 3, 4]));

    reset();
    var obj = [4, 2, 3, 1];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.reverse();
    obj.sort();
    obj._tracker.collect(obj);
    var writeset = [null,
     { obj: obj, reinit: '["0":1,"1":2,"2":3,"3":4]', lasttx: -1 }];
    test.ok(utils.isEqual(cache.cset(), writeset));
    test.ok(utils.isEqual(obj, [1, 2, 3, 4]));

    reset();
    var obj = [4, 2, 3, 1];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj[1] = 2;
    obj.sort();
    obj._tracker.collect(obj);
    var writeset = [null,
     { obj: obj, reinit: '["0":1,"1":2,"2":3,"3":4]', lasttx: -1 }];
    test.ok(utils.isEqual(cache.cset(), writeset));
    test.ok(utils.isEqual(obj, [1, 2, 3, 4]));

    reset();
    var obj = [4, 2, 3, 1];
    test.ok(typeof new tracker.Tracker(cache,obj) === 'object');
    obj.sort();
    delete obj[1];
    obj[1] = 2;
    obj.reverse();
    obj._tracker.collect(obj);
    var writeset2: any[] = [
     { obj: obj, reinit: '["0":4,"1":3,"2":2,"3":1]', lasttx: -1 },
     { obj: obj, reverse: true, lasttx: 0 },
     { obj: obj, write: '2', value: '2', lasttx: 1 }];
    test.ok(utils.isEqual(cache.cset(), writeset2));

    test.done();
  };

} // testtracker