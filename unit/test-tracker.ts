/// <reference path='../defs/node-0.8.d.ts' />
/// <reference path='../lib/store.ts' />

module testtracker {

  import utils = shared.utils;
  import tracker = shared.tracker;
  
  var store: shared.store.MongoStore = null;

  function reset() {
    if (store !== null)
      store.close();
    store = new shared.store.MongoStore();
    utils.defaultLogger().disableDebugLogging();
  }
  
  export function illegaltype(test) {
    reset();
    test.throws(function () { new tracker.Tracker(store,null); }, Error);
    test.throws(function () { new tracker.Tracker(store,undefined); }, Error);
    test.throws(function () { new tracker.Tracker(store,0); }, Error);
    test.throws(function () { new tracker.Tracker(store,1); }, Error);
    test.throws(function () { new tracker.Tracker(store,''); }, Error);
    test.throws(function () { new tracker.Tracker(store,'a'); }, Error);
    test.throws(function () { new tracker.Tracker(store,true); }, Error);
    test.throws(function () { new tracker.Tracker(store,false); }, Error);
    test.done();
  };

  export function objctor(test) {
    var obj: any = {};
    var t = new tracker.Tracker(store,obj);
    test.ok(typeof obj._tracker === 'object');
    test.ok(obj._tracker === t);
    test.ok(utils.isObject(t.type()));
    test.done();
  };

  export function idobjctor(test) {
    test.throws(function () { new tracker.Tracker(store,{}, '1'); }, Error);
    test.throws(function () { new tracker.Tracker(store,{}, '12'); }, Error);

    var obj = {};
    var t = new tracker.Tracker(store,{}, utils.makeUID('123456781234567812345678'));
    test.ok(typeof t == 'object');
    test.ok(t.id().toString() == '123456781234567812345678');
    test.done();
  };

  export function arrayctor(test) {
    var obj: any = [];
    var t = new tracker.Tracker(store,obj);
    test.ok(typeof obj._tracker === 'object');
    test.ok(obj._tracker === t);
    test.ok(utils.isObject(t.type()));
    test.done();
  };

  export function idarrayctor(test) {
    test.throws(function () { new tracker.Tracker(store,[], '1'); }, Error);
    test.throws(function () { new tracker.Tracker(store,[], '12'); }, Error);

    var obj = [];
    var t = new tracker.Tracker(store, {}, utils.makeUID('123456781234567812345678'));
    test.ok(typeof t == 'object');
    test.ok(t.id().toString() == '123456781234567812345678');
    test.done();
  };

  export function rev(test) {
    var obj = [];
    var t = new tracker.Tracker(store,obj);
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
    var t = new tracker.Tracker(store,obj);
    test.ok(typeof obj.a == 'number');
    test.ok(obj.a === 1);
    obj.a = 2;
    test.ok(utils.isEqual(store.cset()[0], { obj: obj, write: 'a', value: 2, last: 1, lasttx: -1 }));
    test.ok(store.readsetSize() === 0);
    test.ok(store.newsetSize() === 0);
    test.ok(obj.a === 2);
    test.done();
  };

  export function wrapString(test) {
    reset();
    var obj = { a: 'b' };
    var t = new tracker.Tracker(store,obj);
    test.ok(typeof obj.a == 'string');
    test.ok(obj.a === 'b');
    obj.a = 'c';
    test.ok(utils.isEqual(store.cset()[0], { obj: obj, write: 'a', value: 'c', last: 'b', lasttx: -1 }));
    test.ok(store.readsetSize() === 0);
    test.ok(store.newsetSize() === 0);
    test.ok(obj.a === 'c');
    test.done();
  };

  export function wrapBoolean(test) {
    reset();
    var obj = { a: true };
    var t = new tracker.Tracker(store,obj);
    test.ok(typeof obj.a == 'boolean');
    test.ok(obj.a === true);
    obj.a = false;
    test.ok(utils.isEqual(store.cset()[0], { obj: obj, write: 'a', value: false, last: true, lasttx: -1 }));
    test.ok(store.readsetSize() === 0);
    test.ok(store.newsetSize() === 0);
    test.ok(obj.a === false);
    test.done();
  };

  export function wrapFunc(test) {
    reset();
    var f = function () { };
    var obj: any = { a: f };
    var t = new tracker.Tracker(store,obj);
    test.ok(typeof obj.a == 'function');
    obj.a = function (a) { };
    test.ok(utils.isEqual(store.cset()[0], { obj: obj, write: 'a', value: null, last: f, lasttx: -1 }));
    test.ok(store.readsetSize() === 0);
    test.ok(store.newsetSize() === 0);
    test.done();
  };

  export function wrapObj(test) {
    reset();
    var nobj = {};
    var t2 = new tracker.Tracker(store,nobj);
    var obj: any = { a: nobj };
    var t = new tracker.Tracker(store,obj);
    test.ok(typeof obj.a == 'object');
    test.ok(utils.isEqual(obj.a, {}));
    test.ok(store.readsetObject(t2.id()) === 0);
    test.ok(store.readsetSize() === 1);
    obj.a = { b: 1 };
    test.ok(store.readsetSize() === 1);
    test.ok(utils.isEqual(store.cset()[0], { obj: obj, write: 'a', value: { b: 1 }, last: {}, lasttx: -1 }));
    var id = store.valueId(obj.a).toString();
    test.ok(utils.isEqual(store.newsetObject(id), { b: 1 }));
    test.ok(store.newsetSize() === 1);
    test.ok(utils.isEqual(obj.a, { b: 1 }));
    test.done();
  };

  export function wrapArray(test) {
    reset();
    var nobj = [];
    var t2 = new tracker.Tracker(store,nobj);
    var obj: any = { a: nobj };
    var t = new tracker.Tracker(store,obj);
    test.ok(typeof obj.a == 'object');
    test.ok(utils.isEqual(obj.a, []));
    test.ok(store.readsetObject(t2.id()) === 0);
    test.ok(store.readsetSize() === 1);
    obj.a = [1];
    test.ok(utils.isEqual(store.cset()[0], { obj: obj, write: 'a', value: [1], last: [], lasttx: -1 }));
    var id = store.valueId(obj.a).toString();
    test.ok(utils.isEqual(store.newsetObject(id), [1]));
    test.ok(store.newsetSize() === 1);
    test.ok(utils.isEqual(obj.a, [1]));
    test.done();
  };

  export function cycleTypes(test) {
    reset();
    var obj: any = { a: 1 };
    var t = new tracker.Tracker(store,obj);
    test.ok(typeof obj.a == 'number');
    test.ok(obj.a === 1);
    test.ok(store.readsetSize() === 0);
    obj.a = '';
    test.ok(obj.a === '');
    test.ok(store.readsetSize() === 0);
    test.ok(utils.isEqual(store.cset()[0], { obj: obj, write: 'a', value: '', last: 1, lasttx: -1 }));
    obj.a = true;
    test.ok(obj.a === true);
    test.ok(store.readsetSize() === 0);
    test.ok(utils.isEqual(store.cset()[1], { obj: obj, write: 'a', value: true, last: '', lasttx: 0 }));
    var f = function () { };
    obj.a = f;
    test.ok(obj.a === f);
    test.ok(store.readsetSize() === 0);
    test.ok(store.newsetSize() === 0);
    test.ok(utils.isEqual(store.cset()[2], { obj: obj, write: 'a', value: null, last: true, lasttx: 1 }));
    obj.a = {};
    test.ok(utils.isEqual(store.cset()[3], { obj: obj, write: 'a', value: {}, last: f, lasttx: 2 }));
    test.ok(store.readsetSize() === 0);
    var id = store.valueId(obj.a).toString();
    test.ok(utils.isEqual(store.newsetObject(id), {}));
    test.ok(store.newsetSize() === 1);
    obj.a = [];
    test.ok(utils.isEqual(store.cset()[4], { obj: obj, write: 'a', value: [], last: {}, lasttx: 3 }));
    test.ok(store.readsetSize() === 0);
    var id = store.valueId(obj.a).toString();
    test.ok(utils.isEqual(store.newsetObject(id), []));
    test.ok(store.newsetSize() === 2);

    test.done();
  };

  export function unwrapable(test) {
    var obj: any = {};
    Object.defineProperty(obj, 'a', {
      enumerable: true,
      configurable: false,
      value: 1
    });
    test.throws(function () { new tracker.Tracker(store,obj); }, Error);

    var obj: any = [];
    Object.defineProperty(obj, 'a', {
      enumerable: true,
      configurable: false,
      value: 1
    });
    test.throws(function () { new tracker.Tracker(store,obj); }, Error);
    
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
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    test.ok(obj.a === 1);
    test.ok(obj._tracker.tc().cset().length === 0);

    reset();
    var obj: any = [];
    Object.defineProperty(obj, 'a', {
      enumerable: false,
      configurable: true,
      value: 1
    });
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    test.ok(obj.a === 1);
    test.ok(obj._tracker.tc().cset().length === 0);

    test.done();
  };

  export function deleteable(test) {
    var obj: any = { a: 1 };
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    test.ok(obj.a === 1);
    delete obj.a;
    test.ok(obj.a === undefined);

    var obj: any = [1];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    test.ok(obj[0] === 1);
    delete obj[0];
    test.ok(obj[0] === undefined);

    test.done();
  };

  export function arrreverse(test) {
    reset();
    var obj = [1, 2, 3, 4];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.reverse();
    test.ok(utils.isEqual(store.cset()[0], { obj: obj, reverse: true, lasttx: -1 }));
    test.ok(utils.isEqual(obj, [4, 3, 2, 1]));

    reset();
    var obj = [1, 2, 3, 4];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.reverse();
    obj.reverse();
    test.ok(utils.isEqual(store.cset()[0], { obj: obj, reverse: true, lasttx: -1 }));
    test.ok(utils.isEqual(store.cset()[1], { obj: obj, reverse: true, lasttx: 0 }));
    test.ok(utils.isEqual(obj, [1, 2, 3, 4]));
    test.done();
  };

  export function arrsort(test) {
    reset();
    var obj = [1, 2, 3, 4];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.sort();
    test.ok(utils.isEqual(store.cset()[0], { obj: obj, sort: true, lasttx: -1 }));
    test.ok(utils.isEqual(obj, [1, 2, 3, 4]));

    reset();
    var obj = [1, 2, 3, 4];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.sort(function (a, b) { return b - a });
    obj.sort(function (a, b) { return b - a });
    test.ok(utils.isEqual(store.cset()[0], { obj: obj, sort: true, lasttx: -1 }));
    test.ok(utils.isEqual(store.cset()[1], { obj: obj, sort: true, lasttx: 0 }));
    test.ok(utils.isEqual(obj, [4, 3, 2, 1]));
    test.done();
  };

  export function arrshift(test) {
    reset();
    var obj = [1, 2];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.shift();
    test.ok(utils.isEqual(store.cset()[0], { obj: obj, shift: 0, size: 1, lasttx: -1 }));
    obj.unshift(3);
    test.ok(utils.isEqual(store.cset()[1], { obj: obj, unshift: 0, size: 1, lasttx: 0 }));
    test.ok(utils.isEqual(store.cset()[2], { obj: obj, write: '0', value: 3, lasttx: 1 }));
    obj.unshift(4, 5);
    test.ok(utils.isEqual(store.cset()[3], { obj: obj, unshift: 0, size: 2, lasttx: 2 }));
    test.ok(utils.isEqual(store.cset()[4], { obj: obj, write: '0', value: 4, lasttx: 3 }));
    test.ok(utils.isEqual(store.cset()[5], { obj: obj, write: '1', value: 5, lasttx: 4 }));
    test.ok(obj, [4, 5, 3, 1]);
    test.done();
  };
  
  export function pushNumberProp(test) {
    reset();
    var obj: any = {};
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.a = 1;
    store.collectObject(obj);
    test.ok(utils.isEqual(store.cset(), [{ obj: obj, write: 'a', value: 1, lasttx: -1 }]));

    reset();
    var obj = { a: 1 };
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.b = 2;
    store.collectObject(obj);
    test.ok(utils.isEqual(store.cset(), [{ obj: obj, write: 'b', value: 2, lasttx: -1 }]));
    test.done();
  };

  export function pushBoolProp(test) {
    reset();
    var obj: any = {};
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.a = true;
    store.collectObject(obj);
    test.ok(utils.isEqual(store.cset(), [{ obj: obj, write: 'a', value: true, lasttx: -1 }]));

    reset();
    var obj = { a: 1 };
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.b = false;
    store.collectObject(obj);
    test.ok(utils.isEqual(store.cset(), [{ obj: obj, write: 'b', value: false, lasttx: -1 }]));

    test.done();
  };

  export function pushStringProp(test) {
    reset();
    var obj: any = {};
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.a = 'a';
    store.collectObject(obj);
    test.ok(utils.isEqual(store.cset(), [{ obj: obj, write: 'a', value: 'a', lasttx: -1 }]));

    reset();
    var obj = { a: 1 };
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.b = 'b';
    store.collectObject(obj);
    test.ok(utils.isEqual(store.cset(), [{ obj: obj, write: 'b', value: 'b', lasttx: -1 }]));

    test.done();
  };

  export function pushOtherProp(test) {
    reset();
    var obj: any = {};
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.a = null;
    store.collectObject(obj);
    test.ok(utils.isEqual(store.cset(), [{ obj: obj, write: 'a', value: null, lasttx: -1 }]));

    reset();
    var obj = { a: 1 };
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.b = undefined;
    store.collectObject(obj);
    test.ok(utils.isEqual(store.cset(), [{ obj: obj, write: 'b', value: undefined, lasttx: -1 }]));

    test.done();
  };

  export function pushObjectProp(test) {
    reset();
    var obj: any = {};
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.a = {};
    store.collectObject(obj);
    test.ok(utils.isEqual(store.cset(), [{ obj: obj, write: 'a', value: {}, lasttx: -1 }]));
    var id = store.valueId(obj.a).toString();
    test.ok(utils.isEqual(store.newsetObject(id), {}));
    test.ok(store.newsetSize() === 1);
    test.ok(store.readsetSize() === 0);

    reset();
    var obj = { a: 1 };
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.b = {};
    store.collectObject(obj);
    test.ok(utils.isEqual(store.cset(), [{ obj: obj, write: 'b', value: {}, lasttx: -1 }]));
    var id = store.valueId(obj.b).toString();
    test.ok(utils.isEqual(store.newsetObject(id), {}));
    test.ok(store.newsetSize() === 1);
    test.ok(store.readsetSize() === 0);

    test.done();
  };

  export function pushRecuObjectProp(test) {
    reset();
    var obj: any = {};
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.a = { b: {} };
    store.collectObject(obj);
    test.ok(utils.isEqual(store.cset(), [{ obj: obj, write: 'a', value: { b: {} }, lasttx: -1 }]));
    var bid = store.valueId(obj.a.b).toString();
    test.ok(utils.isEqual(store.newsetObject(bid), {}));
    var id = store.valueId(obj.a).toString();
    test.ok(utils.isEqual(store.newsetObject(id), { b: {} }));

    test.ok(store.readsetSize() === 0);

    reset();
    var obj = { a: 1 };
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.b = { c: {} };
    store.collectObject(obj);
    test.ok(utils.isEqual(store.cset(), [{ obj: obj, write: 'b', value: { c: {} }, lasttx: -1 }]));
    var bid = store.valueId(obj.b.c).toString();
    test.ok(utils.isEqual(store.newsetObject(bid), {}));
    var id = store.valueId(obj.b).toString();
    test.ok(utils.isEqual(store.newsetObject(id), { c: {} }));
    test.ok(store.readsetSize() === 0);
    test.done();
  };

  export function pushArrayProp(test) {
    reset();
    var obj: any = {};
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.a = [];
    store.collectObject(obj);
    test.ok(utils.isEqual(store.cset(), [{ obj: obj, write: 'a', value: [], lasttx: -1 }]));
    var id = store.valueId(obj.a).toString();
    test.ok(utils.isEqual(store.newsetObject(id), []));
    test.ok(store.newsetSize() === 1);
    test.ok(store.readsetSize() === 0);

    reset();
    var obj = { a: 1 };
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.b = [];
    store.collectObject(obj);
    test.ok(utils.isEqual(store.cset(), [{ obj: obj, write: 'b', value: [], lasttx: -1 }]));
    var id = store.valueId(obj.b).toString();
    test.ok(utils.isEqual(store.newsetObject(id), []));
    test.ok(store.newsetSize() === 1);
    test.ok(store.readsetSize() === 0);

    test.done();
  };

  export function pushRecuArrayProp(test) {
    reset();
    var obj: any = {};
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.a = [[]];
    store.collectObject(obj);
    test.ok(utils.isEqual(store.cset(), [{ obj: obj, write: 'a', value: [[]], lasttx: -1 }]));
    var bid = store.valueId(obj.a[0]).toString();
    test.ok(utils.isEqual(store.newsetObject(bid), []));
    var id = store.valueId(obj.a).toString();
    test.ok(utils.isEqual(store.newsetObject(id), [[]]));
    test.ok(store.readsetSize() === 0);

    reset();
    var obj = { a: 1 };
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.b = [[]];
    store.collectObject(obj);
    test.ok(utils.isEqual(store.cset(), [{ obj: obj, write: 'b', value: [[]], lasttx: -1 }]));
    var bid = store.valueId(obj.b[0]).toString();
    test.ok(utils.isEqual(store.newsetObject(bid), []));
    var id = store.valueId(obj.b).toString();
    test.ok(utils.isEqual(store.newsetObject(id), [[]]));
    test.ok(store.readsetSize() === 0);

    test.done();
  };

  export function readsetArray(test) {
    reset();
    var obj: any[] = [1, true, '', null, undefined];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj[0]; obj[1]; obj[2]; obj[3]; obj[4];
    store.collectObject(obj);
    test.ok(store.newsetSize() === 0);
    test.ok(store.readsetSize() === 0);

    reset();
    var embed: any = {};
    test.ok(typeof new tracker.Tracker(store,embed) === 'object');
    var obj = [embed];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj[0];
    store.collectObject(obj);
    test.ok(store.newsetSize() === 0);
    test.ok(store.readsetSize() === 1);
    test.ok(store.readsetObject(embed._tracker._id) === 0);

    reset();
    var embed = [];
    test.ok(typeof new tracker.Tracker(store,embed) === 'object');
    var obj = [embed];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj[0];
    store.collectObject(obj);
    test.ok(store.newsetSize() === 0);
    test.ok(store.readsetSize() === 1);
    test.ok(store.readsetObject(embed._tracker._id) === 0);

    test.done();
  };

  export function readsetObject(test) {
    reset();
    var obj: any = { a: 1, b: true, c: '', d: null, e: undefined };
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.a; obj.b; obj.c; obj.d; obj.e;
    store.collectObject(obj);
    test.ok(store.newsetSize() === 0);
    test.ok(store.readsetSize() === 0);

    reset();
    var embed: any = {};
    test.ok(typeof new tracker.Tracker(store,embed) === 'object');
    var obj = { a: embed };
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.a;
    store.collectObject(obj);
    test.ok(store.newsetSize() === 0);
    test.ok(store.readsetSize() === 1);
    test.ok(store.readsetObject(embed._tracker._id) === 0);

    reset();
    var embed = [];
    test.ok(typeof new tracker.Tracker(store,embed) === 'object');
    var obj = { a: embed };
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.a;
    store.collectObject(obj);
    test.ok(store.newsetSize() === 0);
    test.ok(store.readsetSize() === 1);
    test.ok(store.readsetObject(embed._tracker._id) === 0);

    test.done();
  };

  export function writesetArray1(test) {
    reset();
    var obj: any[] = [1, true, '', null, undefined];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj[0] = 2; obj[1] = false; obj[2] = 'a'; obj[3] = undefined; obj[4] = null;
    store.collectObject(obj);
    var writeset : any[] = [
     { obj: obj, write: '0', value: 2, last: 1, lasttx: -1 },
     { obj: obj, write: '1', value: false, last: true, lasttx: 0 },
     { obj: obj, write: '2', value: 'a', last: '', lasttx: 1 },
     { obj: obj, write: '3', value: undefined, last: null, lasttx: 2 },
     { obj: obj, write: '4', value: null, last: undefined, lasttx: 3 }];
    test.ok(utils.isEqual(store.cset(), writeset));
    test.ok(store.newsetSize() === 0);
    test.ok(store.readsetSize() === 0);

    reset();
    var embed: any = {};
    var obj = [null];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj[0] = embed;
    store.collectObject(obj);
    var writeset = [
     { obj: obj, write: '0', value: {}, last: null, lasttx: -1 }];
    test.ok(utils.isEqual(store.cset(), writeset));
    var id = store.valueId(obj[0]).toString();
    test.ok(utils.isEqual(store.newsetObject(id), {}));
    test.ok(store.newsetSize() === 1);
    test.ok(store.readsetSize() === 0);

    reset();
    var embed = [];
    var obj = [null];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj[0] = embed;
    store.collectObject(obj);
    var writeset = [
     { obj: obj, write: '0', value: [], last: null, lasttx: -1 }];
    test.ok(utils.isEqual(store.cset(), writeset));
    var id = store.valueId(obj[0]).toString();
    test.ok(utils.isEqual(store.newsetObject(id), []));
    test.ok(store.newsetSize() === 1);
    test.ok(store.readsetSize() === 0);

    test.done();
  };
  
  export function writesetArray2(test) {
    reset();
    var obj = [1, 2, 3];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.shift();
    obj.shift();
    obj.unshift(5, 4);
    store.collectObject(obj);
    var writeset: any[] = [
     { obj: obj, shift: 0, size: 1, lasttx: -1 },
     { obj: obj, shift: 0, size: 1, lasttx: 0 },
     { obj: obj, unshift: 0, size: 2, lasttx: 1 },
     { obj: obj, write: '0', value: 5, lasttx: 2 },
     { obj: obj, write: '1', value: 4, lasttx: 3 }];
    test.ok(utils.isEqual(store.cset(), writeset));

    reset();
    var obj = [1, 2, 3];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.pop();
    obj.pop();
    obj.push(4, 5);
    store.collectObject(obj);
    var writeset: any[] = [
     { obj: obj, write: '1', value: 4, lasttx: -1 },
     { obj: obj, write: '2', value: 5, lasttx: 0 }];
    test.ok(utils.isEqual(store.cset(), writeset));

    reset();
    var obj = [1, 2, 3];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.shift();
    obj.pop();
    obj.push(4);
    obj.unshift(0);
    store.collectObject(obj);
    var writeset2: any[] = [
     { obj: obj, shift: 0, size: 1, lasttx: -1 },
     { obj: obj, unshift: 0, size: 1, lasttx: 0 },
     { obj: obj, write: '0', value: 0, lasttx: 1 },
     { obj: obj, write: '2', value: 4, lasttx: 2 }];
    test.ok(utils.isEqual(store.cset(), writeset2));

    reset();
    var obj = [1, 2, 3];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.pop();
    obj.shift();
    obj.unshift(0);
    obj.push(4);
    store.collectObject(obj);
    var writeset3: any[] = [
     { obj: obj, shift: 0, size: 1, lasttx: -1 },
     { obj: obj, unshift: 0, size: 1, lasttx: 0 },
     { obj: obj, write: '0', value: 0, lasttx: 1 },
     { obj: obj, write: '2', value: 4, lasttx: 2 }];
    test.ok(utils.isEqual(store.cset(), writeset3));
  
    reset();
    var obj = [1, 2, 3];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.pop();
    obj.pop();
    obj.shift();
    obj.unshift(0);
    obj.push(4);
    store.collectObject(obj);
    var writeset4: any[] = [
     { obj: obj, shift: 0, size: 1, lasttx: -1 },
     { obj: obj, unshift: 0, size: 1, lasttx: 0 },
     { obj: obj, write: '0', value: 0, lasttx: 1 },
     { obj: obj, shift: -1, size: 1, lasttx: 2 },
     { obj: obj, write: '1', value: 4, lasttx: 3 }];
    test.ok(utils.isEqual(store.cset(), writeset4));
  
    reset();
    var obj = [1, 2, 3];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.pop();
    obj.shift();
    obj.shift();
    obj.unshift(0);
    obj.push(4);
    store.collectObject(obj);
    var writeset5: any[] = [
     { obj: obj, shift: 0, size: 1, lasttx: -1 },
     { obj: obj, shift: 0, size: 1, lasttx: 0 },
     { obj: obj, unshift: 0, size: 1, lasttx: 1 },
     { obj: obj, write: '0', value: 0, lasttx: 2 },
     { obj: obj, write: '1', value: 4, lasttx: 3 }];
    test.ok(utils.isEqual(store.cset(), writeset5));

    reset();
    var obj = [1, 2, 3];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.pop();
    obj.pop();
    obj.pop();
    obj.pop();
    obj.unshift(4);
    store.collectObject(obj);
    var writeset6: any[] = [
     { obj: obj, unshift: 0, size: 1, lasttx: -1 },
     { obj: obj, write: '0', value: 4, lasttx: 0 },
     { obj: obj, shift: -1, size: 3, lasttx: 1 }];
    test.ok(utils.isEqual(store.cset(), writeset6));

    reset();
    var obj = [1, 2, 3];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.shift();
    obj.shift();
    obj.shift();
    obj.push(4);
    store.collectObject(obj);
    var writeset7: any[] = [
     { obj: obj, shift: 0, size: 1, lasttx: -1 },
     { obj: obj, shift: 0, size: 1, lasttx: 0 },
     { obj: obj, shift: 0, size: 1, lasttx: 1 },
     { obj: obj, write: '0', value: 4, lasttx: 2 }];
    test.ok(utils.isEqual(store.cset(), writeset7));

    test.done();
  };

  export function delObject(test) {

    reset();
    var obj = { a: 1, b: 2, c: 3 };
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    delete obj.b;
    store.collectObject(obj);
    var writeset: any[] = [
     { obj: obj, del: 'b', lasttx: -1 }];
    test.ok(utils.isEqual(store.cset(), writeset));

    reset();
    var obj = { a: 1, b: 2, c: 3 };
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    delete obj.a;
    delete obj.b;
    delete obj.b;
    delete obj.c;
    store.collectObject(obj);
    var writeset: any[] = [
     { obj: obj, del: 'a', lasttx: -1 },
     { obj: obj, del: 'b', lasttx: 0 },
     { obj: obj, del: 'c', lasttx: 1 }];
    test.ok(utils.isEqual(store.cset(), writeset));

    reset();
    var obj = { a: 1, b: 2, c: 3 };
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    delete obj.b;
    obj.b = 1;
    obj.b = 4;
    store.collectObject(obj);
    var writeset2: any[] = [
     { obj: obj, del: 'b', lasttx: -1 },
     { obj: obj, write: 'b', value: 4, lasttx: 0 }];
    test.ok(utils.isEqual(store.cset(), writeset2));

    test.done();
  };

  export function delArray(test) {

    reset();
    var obj = [1, 2, 3];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    delete obj[1];
    store.collectObject(obj);
    var writeset = [
     { obj: obj, del: '1', lasttx: -1 }];
    test.ok(utils.isEqual(store.cset(), writeset));

    reset();
    var obj = [1, 2, 3];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    delete obj[0];
    delete obj[1];
    delete obj[1];
    delete obj[2];
    store.collectObject(obj);
    var writeset = [
     { obj: obj, del: '0', lasttx: -1 },
     { obj: obj, del: '1', lasttx: 0 },
     { obj: obj, del: '2', lasttx: 1 }];
    test.ok(utils.isEqual(store.cset(), writeset));

    reset();
    var obj = [1, 2, 3];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    delete obj[1];
    delete obj[5];
    obj[1] = 1;
    obj[1] = 4;
    store.collectObject(obj);
    var writeset2 = [
     { obj: obj, write: '1', value: 4, lasttx: -1 }];
    test.ok(utils.isEqual(store.cset(), writeset2));

    test.done();
  };

  export function reverse(test) {

    reset();
    var obj: any = [1, 2, 3, 4];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.reverse();
    store.collectObject(obj);
    var writeset = [
     { obj: obj, reverse: true, lasttx: -1 }];
    test.ok(utils.isEqual(store.cset(), writeset));
    test.ok(utils.isEqual(obj, [4, 3, 2, 1]));

    reset();
    var obj = [1, 2, 3, 4];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.reverse();
    obj.reverse();
    store.collectObject(obj);
    var writeset = [
     { obj: obj, reverse: true, lasttx: -1 },
     { obj: obj, reverse: true, lasttx: 0 }];
    test.ok(utils.isEqual(store.cset(), writeset));
    test.ok(utils.isEqual(obj, [1, 2, 3, 4]));

    reset();
    var obj = [1, 2, 3, 4];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    delete obj[1];
    obj[1] = 2;
    obj.reverse();
    store.collectObject(obj);
    var writeset2: any[] = [
     { obj: obj, reverse: true, lasttx: -1 },
     { obj: obj, write: '2', value: 2, lasttx: 0 }];
    test.ok(utils.isEqual(store.cset(), writeset2));
    test.ok(utils.isEqual(obj, [4, 3, 2, 1]));

    test.done();
  };

  export function sort(test) {
    
    reset();
    var obj: any = [4, 2, 3, 1];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.sort();
    store.collectObject(obj);
    var writeset = [null,
     { obj: obj, reinit: '["0":1,"1":2,"2":3,"3":4]', lasttx: -1 }];
    test.ok(utils.isEqual(store.cset(), writeset));
    test.ok(utils.isEqual(obj, [1, 2, 3, 4]));

    reset();
    var obj = [4, 2, 3, 1];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.reverse();
    obj.sort();
    store.collectObject(obj);
    var writeset = [null,null,
     { obj: obj, reinit: '["0":1,"1":2,"2":3,"3":4]', lasttx: -1 }];
    test.ok(utils.isEqual(store.cset(), writeset));
    test.ok(utils.isEqual(obj, [1, 2, 3, 4]));

    reset();
    var obj = [4, 2, 3, 1];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj[1] = 2;
    obj.sort();
    store.collectObject(obj);
    var writeset = [null,null,
     { obj: obj, reinit: '["0":1,"1":2,"2":3,"3":4]', lasttx: -1 }];
    test.ok(utils.isEqual(store.cset(), writeset));
    test.ok(utils.isEqual(obj, [1, 2, 3, 4]));

    reset();
    var obj = [4, 2, 3, 1];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.sort();
    delete obj[1];
    obj[1] = 2;
    obj.reverse();
    store.collectObject(obj);
    var writeset2: any[] = [null,null,
     { obj: obj, reinit: '["0":4,"1":3,"2":2,"3":1]', lasttx: -1 }];
    test.ok(utils.isEqual(store.cset(), writeset2));

    test.done();
  };

  export function xstore(test) {
    reset();
    var s2 = new shared.store.MongoStore();
    var obj = {};
    test.ok(typeof new tracker.Tracker(s2,obj) === 'object');

    test.throws(function () { store.valueId(obj) });

    test.done();
  }

  export function spliceDel(test) {
    
    reset();
    var obj: any = [4, 2, 3, 1];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.splice(1,2);
    store.collectObject(obj);
    var writeset = [
     { obj: obj, shift: 1, size:2, lasttx: -1 }];
    test.ok(utils.isEqual(store.cset(), writeset));
    test.ok(utils.isEqual(obj, [4,1]));

    reset();
    var obj: any = [4, 2, 3, 1];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.splice(2);
    store.collectObject(obj);
    var writeset = [
     { obj: obj, shift: 2, size:2, lasttx: -1 }];
    test.ok(utils.isEqual(store.cset(), writeset));
    test.ok(utils.isEqual(obj, [4,2]));

    reset();
    var obj: any = [4, 2, 3, 1];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.splice(2,0);
    store.collectObject(obj);
    test.ok(utils.isEqual(store.cset(), []));
    test.ok(utils.isEqual(obj, [4,2,3,1]));

    reset();
    var obj: any = [4, 2, 3, 1];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.splice(-2,1);
    store.collectObject(obj);
    var writeset = [
     { obj: obj, shift: 2, size:1, lasttx: -1 }];
    test.ok(utils.isEqual(store.cset(), writeset));
    test.ok(utils.isEqual(obj, [4,2,1]));

    reset();
    var obj: any = [4, 2, 3, 1];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.splice(1,2);
    obj.push(5);
    store.collectObject(obj);
    var writeset2 : any[] = [
     { obj: obj, shift: 1, size:2, lasttx: -1 },
     { obj: obj, write: '2', value:5, lasttx: 0 }];
    test.ok(utils.isEqual(store.cset(), writeset2));
    test.ok(utils.isEqual(obj, [4,1,5]));

    reset();
    var obj: any = [4, 2, 3, 1];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.splice(1,2);
    obj.pop();
    store.collectObject(obj);
    var writeset3 : any[] = [
     { obj: obj, shift: 1, size:2, lasttx: -1 },
     { obj: obj, shift: -1, size:1, lasttx: 0 }];
    test.ok(utils.isEqual(store.cset(), writeset3));
    test.ok(utils.isEqual(obj, [4]));

    reset();
    var obj: any = [4, 2, 3, 1];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.splice(1,2);
    obj.shift();
    store.collectObject(obj);
    var writeset4 : any[] = [
     { obj: obj, shift: 1, size:2, lasttx: -1 },
     { obj: obj, shift: 0, size:1, lasttx: 0 }];
    test.ok(utils.isEqual(store.cset(), writeset4));
    test.ok(utils.isEqual(obj, [1]));

    reset();
    var obj: any = [4, 2, 3, 1];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.splice(1,2);
    obj.unshift(5);
    store.collectObject(obj);
    var writeset5 : any[] = [
     { obj: obj, shift: 1, size:2, lasttx: -1 },
     { obj: obj, unshift: 0, size:1, lasttx: 0 },
     { obj: obj, write: '0', value:5, lasttx: 1 }];
    test.ok(utils.isEqual(store.cset(), writeset5));
    test.ok(utils.isEqual(obj, [5,4,1]));

    reset();
    var obj: any = [4, 2, 3, 1];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.splice(1,2);
    delete obj[0];
    store.collectObject(obj);
    var writeset6 : any[] = [
     { obj: obj, shift: 1, size:2, lasttx: -1 },
     { obj: obj, del: '0', lasttx: 0 }];
    test.ok(utils.isEqual(store.cset(), writeset6));
    test.ok(utils.isEqual(obj, [,1]));

    reset();
    var obj: any = [4, 2, 3, 1];
    test.ok(typeof new tracker.Tracker(store,obj) === 'object');
    obj.splice(1,2);
    obj[0]=5;
    store.collectObject(obj);
    var writeset7 : any[] = [
     { obj: obj, shift: 1, size:2, lasttx: -1 },
     { obj: obj, write: '0', value: 5, last: 4, lasttx: 0 }];
    test.ok(utils.isEqual(store.cset(), writeset7));
    test.ok(utils.isEqual(obj, [5,1]));
    
    test.done();
  };

  export function spliceIns(test) {

    reset();
    var obj: any = [4, 2, 3, 1];
    test.ok(typeof new tracker.Tracker(store, obj) === 'object');
    obj.splice(1, 0);
    store.collectObject(obj);
    var writeset = [];
    test.ok(utils.isEqual(store.cset(), writeset));
    test.ok(utils.isEqual(obj, [4, 2, 3, 1]));

    reset();
    var obj: any = [4, 2, 3, 1];
    test.ok(typeof new tracker.Tracker(store, obj) === 'object');
    obj.splice(1, 0, 5);
    store.collectObject(obj);
    var writeset1 : any[] = [
     { obj: obj, unshift: 1, size:1, lasttx: -1 },
     { obj: obj, write: '1', value: 5, lasttx: 0 }];
    test.ok(utils.isEqual(store.cset(), writeset1));
    test.ok(utils.isEqual(obj, [4, 5, 2, 3, 1]));

    reset();
    var obj: any = [4, 2, 3, 1];
    test.ok(typeof new tracker.Tracker(store, obj) === 'object');
    obj.splice(1, 0, 5, 6);
    store.collectObject(obj);
    var writeset2 : any[] = [
     { obj: obj, unshift: 1, size: 2, lasttx: -1 },
     { obj: obj, write: '1', value: 5, lasttx: 0 },
     { obj: obj, write: '2', value: 6, lasttx: 1 }];
    test.ok(utils.isEqual(store.cset(), writeset2));
    test.ok(utils.isEqual(obj, [4, 5, 6, 2, 3, 1]));

    reset();
    var obj: any = [4, 2, 3, 1];
    test.ok(typeof new tracker.Tracker(store, obj) === 'object');
    obj.splice(4, 0, 5, 6);
    store.collectObject(obj);
    var writeset3 : any[] = [
     { obj: obj, unshift: 4, size: 2, lasttx: -1 },
     { obj: obj, write: '4', value: 5, lasttx: 0 },
     { obj: obj, write: '5', value: 6, lasttx: 1 }];
    test.ok(utils.isEqual(store.cset(), writeset3));
    test.ok(utils.isEqual(obj, [4, 2, 3, 1, 5, 6]));

    reset();
    var obj: any = [4, 2, 3, 1];
    test.ok(typeof new tracker.Tracker(store, obj) === 'object');
    obj.splice(0, 0, 5, 6);
    store.collectObject(obj);
    var writeset4 : any[] = [
     { obj: obj, unshift: 0, size: 2, lasttx: -1 },
     { obj: obj, write: '0', value: 5, lasttx: 0 },
     { obj: obj, write: '1', value: 6, lasttx: 1 }];
    test.ok(utils.isEqual(store.cset(), writeset4));
    test.ok(utils.isEqual(obj, [5, 6, 4, 2, 3, 1]));

    test.done();
  }

  export function sparseArray(test) {
    reset();
    var obj: any = [4, , , 1];
    test.ok(typeof new tracker.Tracker(store, obj) === 'object');
    obj[2] = 5;
    store.collectObject(obj);
    var writeset1 : any[] = [
     { obj: obj, write: '2', value: 5, lasttx: -1 }];
    test.ok(utils.isEqual(store.cset(), writeset1));
    test.ok(utils.isEqual(obj, [4, , 5, 1]));

    reset();
    var obj: any = [4, , , 1];
    test.ok(typeof new tracker.Tracker(store, obj) === 'object');
    obj[1] = 5;
    delete obj[3];
    store.collectObject(obj);
    var writeset2 : any[] = [
     { obj: obj, del: '3', lasttx: -1 },
     { obj: obj, write: '1', value: 5, lasttx: 0 }];
    test.ok(utils.isEqual(store.cset(), writeset2));
    test.ok(utils.isEqual(obj, [4, 5, undefined ,undefined ]));

    reset();
    var obj: any = [4, , , 1];
    test.ok(typeof new tracker.Tracker(store, obj) === 'object');
    obj[1] = 5;
    obj.push(6);
    store.collectObject(obj);
    var writeset3 : any[] = [
     { obj: obj, write: '1', value: 5, lasttx: -1 },
     { obj: obj, write: '4', value: 6, lasttx: 0 }];
    test.ok(utils.isEqual(store.cset(), writeset3));
    test.ok(utils.isEqual(obj, [4, 5, undefined , 1, 6 ]));

    reset();
    var obj: any = [4, , , 1];
    test.ok(typeof new tracker.Tracker(store, obj) === 'object');
    obj.pop();
    obj[1] = 5;
    store.collectObject(obj);
    var writeset4 : any[] = [
     { obj: obj, shift: -1, size: 1, lasttx: -1 },
     { obj: obj, write: '1', value: 5, lasttx: 0 }];
    test.ok(utils.isEqual(store.cset(), writeset4));
    test.ok(utils.isEqual(obj, [4, 5, undefined ]));

    reset();
    var obj: any = [4, , , 1];
    test.ok(typeof new tracker.Tracker(store, obj) === 'object');
    obj.shift();
    obj[1] = 5;
    store.collectObject(obj);
    var writeset5 : any[] = [
     { obj: obj, shift: 0, size: 1, lasttx: -1 },
     { obj: obj, write: '1', value: 5, lasttx: 0 }];
    test.ok(utils.isEqual(store.cset(), writeset5));
    test.ok(utils.isEqual(obj, [undefined, 5, 1 ]));

    reset();
    var obj: any = [4, , , 1];
    test.ok(typeof new tracker.Tracker(store, obj) === 'object');
    obj.unshift(6);
    obj[1] = 5;
    store.collectObject(obj);
    var writeset6 : any[] = [
     { obj: obj, unshift: 0, size: 1, lasttx: -1 },
     { obj: obj, write: '0', value: 6, lasttx: 0 },
     { obj: obj, write: '1', value: 5, last: 4, lasttx: 1 }];
    test.ok(utils.isEqual(store.cset(), writeset6));
    test.ok(utils.isEqual(obj, [6, 5, undefined, undefined, 1 ]));

    reset();
    var obj: any = [4, , , 1];
    test.ok(typeof new tracker.Tracker(store, obj) === 'object');
    obj.unshift(6,7);
    obj[1] = 5;
    store.collectObject(obj);
    var writeset7 : any[] = [
     { obj: obj, unshift: 0, size: 2, lasttx: -1 },
     { obj: obj, write: '0', value: 6, lasttx: 0 },
     { obj: obj, write: '1', value: 7, lasttx: 1 },
     { obj: obj, write: '1', value: 5, last: 7, lasttx: 2 }];
    test.ok(utils.isEqual(store.cset(), writeset7));
    test.ok(utils.isEqual(obj, [6, 5, 4, undefined, undefined, 1 ]));

    reset();
    var obj: any = [4, , , 1];
    test.ok(typeof new tracker.Tracker(store, obj) === 'object');
    obj.reverse();
    obj[1] = 5;
    store.collectObject(obj);
    var writeset7a : any[] = [
     { obj: obj, reverse: true, lasttx: -1 },
     { obj: obj, write: '1', value: 5, lasttx: 0 }];
    test.ok(utils.isEqual(store.cset(), writeset7a));
    test.ok(utils.isEqual(obj, [1, 5, undefined, 4 ]));

    reset();
    var obj: any = [4, , , 1];
    test.ok(typeof new tracker.Tracker(store, obj) === 'object');
    obj.sort();
    obj[1] = 5;
    store.collectObject(obj);
    var writeset8: any[] = [null,
     { obj: obj, reinit: '["0":1,"1":5,"3":4]', lasttx: -1 }];
    test.ok(utils.isEqual(store.cset(), writeset8));
    test.ok(utils.isEqual(obj, [1, 5, undefined, 4 ]));

    reset();
    var obj: any = [4, , , 1];
    test.ok(typeof new tracker.Tracker(store, obj) === 'object');
    obj.splice(1,2);
    obj[1] = 5;
    store.collectObject(obj);
    var writeset9: any[] = [
      { obj: obj, shift: 1, size: 2, lasttx: -1 },
      { obj: obj, write: '1', value: 5, last: 1, lasttx: 0 }];
    test.ok(utils.isEqual(store.cset(), writeset9));
    test.ok(utils.isEqual(obj, [4, 5 ]));

    reset();
    var obj: any = [4, , , 1];
    test.ok(typeof new tracker.Tracker(store, obj) === 'object');
    obj.splice(1,2,6);
    obj[1] = 5;
    store.collectObject(obj);
    var writeset9a: any[] = [
      { obj: obj, shift: 1, size: 2, lasttx: -1 },
      { obj: obj, unshift: 1, size: 1, lasttx: 0 },
      { obj: obj, write: '1', value: 5, lasttx: 1 }];
    test.ok(utils.isEqual(store.cset(), writeset9a));
    test.ok(utils.isEqual(obj, [4, 5, 1 ]));

    reset();
    var obj: any = [4, , , 1];
    test.ok(typeof new tracker.Tracker(store, obj) === 'object');
    obj.splice(1,1,6);
    obj.unshift(7);
    store.collectObject(obj);
    var writeset10: any[] = [
      { obj: obj, shift: 1, size: 1, lasttx: -1 },
      { obj: obj, unshift: 1, size: 1, lasttx: 0 },
      { obj: obj, unshift: 0, size: 1, lasttx: 1 },
      { obj: obj, write: '0', value: 7, lasttx: 2 },
      { obj: obj, write: '2', value: 6, lasttx: 3 }];
    test.ok(utils.isEqual(store.cset(), writeset10));
    test.ok(utils.isEqual(obj, [7, 4, 6, undefined, 1 ]));

    reset();
    var obj: any = [4, , , 1];
    test.ok(typeof new tracker.Tracker(store, obj) === 'object');
    obj.unshift(6);
    obj.splice(1,1,7);
    obj.shift();
    store.collectObject(obj);
    var writeset11: any[] = [
      { obj: obj, unshift: 0, size: 1, lasttx: -1 },
      { obj: obj, write: '0', value: 6, lasttx: 0 },
      { obj: obj, shift: 1, size: 1, lasttx: 1 },
      { obj: obj, unshift: 1, size: 1, lasttx: 2 },
      { obj: obj, shift: 0, size: 1, lasttx: 3 },
      { obj: obj, write: '0', value: 7, lasttx: 4 }];
    test.ok(utils.isEqual(store.cset(), writeset11));
    test.ok(utils.isEqual(obj, [7, undefined, undefined, 1 ]));

    reset();
    var obj: any = [4, , , 1];
    test.ok(typeof new tracker.Tracker(store, obj) === 'object');
    obj.shift();
    obj.splice(1,1,7);
    obj.unshift(6);
    store.collectObject(obj);
    var writeset12: any[] = [
      { obj: obj, shift: 0, size: 1, lasttx: -1 },
      { obj: obj, shift: 1, size: 1, lasttx: 0 },
      { obj: obj, unshift: 1, size: 1, lasttx: 1 },
      { obj: obj, unshift: 0, size: 1, lasttx: 2 },
      { obj: obj, write: '0', value: 6, lasttx: 3 },
      { obj: obj, write: '2', value: 7, lasttx: 4 }];
    test.ok(utils.isEqual(store.cset(), writeset12));
    test.ok(utils.isEqual(obj, [6, undefined, 7, 1 ]));

    reset();
    var obj: any = [4, , , 1];
    test.ok(typeof new tracker.Tracker(store, obj) === 'object');
    delete obj[3];
    obj.splice(1,1,7);
    obj.unshift(6);
    store.collectObject(obj);
    var writeset14: any[] = [
      { obj: obj, shift: 1, size: 1, lasttx: -1 },
      { obj: obj, unshift: 1, size: 1, lasttx: 0 },
      { obj: obj, unshift: 0, size: 1, lasttx: 1 },
      { obj: obj, write: '0', value: 6, lasttx: 2 },
      { obj: obj, write: '2', value: 7, lasttx: 3 },
      { obj: obj, del: '4', lasttx: 4 }];
    test.ok(utils.isEqual(store.cset(), writeset14));
    test.ok(utils.isEqual(obj, [6, 4 , 7, undefined, undefined ]));

    reset();
    var obj: any = [4, , , 1];
    test.ok(typeof new tracker.Tracker(store, obj) === 'object');
    delete obj[3];
    obj.splice(1,1,7);
    obj.reverse();
    obj.unshift(6);
    store.collectObject(obj);
    var writeset15: any[] = [
      { obj: obj, shift: 1, size: 1, lasttx: -1 },
      { obj: obj, unshift: 1, size: 1, lasttx: 0 },
      { obj: obj, reverse: true, lasttx: 1 },
      { obj: obj, unshift: 0, size: 1, lasttx: 2 },
      { obj: obj, write: '0', value: 6, lasttx: 3 },
      { obj: obj, del: '1', lasttx: 4 },
      { obj: obj, del: '2', lasttx: 5 },
      { obj: obj, write: '3', value: 7, lasttx: 6 }];
    test.ok(utils.isEqual(store.cset(), writeset15));
    test.ok(utils.isEqual(obj, [6, undefined, undefined, 7, 4 ]));

    reset();
    var obj: any = [4, , , 1];
    test.ok(typeof new tracker.Tracker(store, obj) === 'object');
    obj.push(8);
    delete obj[3];
    obj.splice(1,1,7);
    obj.reverse();
    obj.pop();
    obj.unshift(6);
    store.collectObject(obj);
    var writeset16: any[] = [
      { obj: obj, shift: 1, size: 1, lasttx: -1 },
      { obj: obj, unshift: 1, size: 1, lasttx: 0 },
      { obj: obj, reverse: true, lasttx: 1 },
      { obj: obj, unshift: 0, size: 1, lasttx: 2 },
      { obj: obj, write: '0', value: 6, lasttx: 3 },
      { obj: obj, write: '1', value: 8, lasttx: 4 },
      { obj: obj, del: '2', lasttx: 5 },
      { obj: obj, write: '4', value: 7, lasttx: 6 }];
    test.ok(utils.isEqual(store.cset(), writeset16));
    test.ok(utils.isEqual(obj, [6, 8, undefined, undefined, 7 ]));

    test.done();
  }
} // testtracker