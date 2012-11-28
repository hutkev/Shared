/// <reference path='../defs/node-0.8.d.ts' />
/// <reference path='../lib/shared.d.ts' />

var utils: shared.utils = require('../lib/shared.js').tests.utils;
var tracker: shared.tracker = require('../lib/shared.js').tests.tracker;
var main: shared.main = require('../lib/shared.js').tests.main;

var Store = main.Store;

function isEqual(test, obj1, obj2) {
  test.ok(utils.isEqual(obj1,obj2));
  test.ok(obj1._tracker._id === obj2._tracker._id);
  test.ok(obj1._tracker._rev === obj2._tracker._rev);
}

exports.master = function(test) {
  test.ok(typeof Store === 'function');
  var m = new Store();
  test.ok(typeof m.id === 'function');
  test.ok(typeof m.master === 'function');
  test.ok(typeof m.save === 'function');
  test.ok(typeof m.root === 'function');
  test.ok(utils.isEqual(m.root(),{}));
  test.ok(m.master() === m);
  test.done();
};

/*
exports.updateObj = function(test) {
  var s = Store.prototype.master();
  var str = s.writeObj(s.root(),'');
  var obj = s.updateObj(str);
  isEqual(test, s.root(), obj);
  
  s.root().a = undefined;
  var str = s.writeObj(s.root(),'');
  var obj = s.updateObj(str);
  isEqual(test, s.root(), obj);
  
  s.root().a = null;
  var str = s.writeObj(s.root(),'');
  var obj = s.updateObj(str);
  isEqual(test, s.root(), obj);

  s.root().a = 0;
  var str = s.writeObj(s.root(),'');
  var obj = s.updateObj(str);
  isEqual(test, s.root(), obj);

  s.root().a = 1;
  var str = s.writeObj(s.root(),'');
  var obj = s.updateObj(str);
  isEqual(test, s.root(), obj);

  s.root().a = true;
  var str = s.writeObj(s.root(),'');
  var obj = s.updateObj(str);
  isEqual(test, s.root(), obj);

  s.root().a = false;
  var str = s.writeObj(s.root(),'');
  var obj = s.updateObj(str);
  isEqual(test, s.root(), obj);

  s.root().a = '';
  var str = s.writeObj(s.root(),'');
  var obj = s.updateObj(str);
  isEqual(test, s.root(), obj);

  s.root().a = 'a';
  var str = s.writeObj(s.root(),'');
  var obj = s.updateObj(str);
  isEqual(test, s.root(), obj);

  s.root().a = undefined;
  s.root().b = null;
  s.root().c = 0;
  s.root().d = 1;
  s.root().e = true;
  s.root().f = false;
  s.root().g = '';
  s.root().h = 'a';
  var str = s.writeObj(s.root(),'');
  var obj = s.updateObj(str);
  isEqual(test, s.root(), obj);

  delete s.root().a;
  delete s.root().b;
  delete s.root().c;
  delete s.root().d;
  delete s.root().e;
  delete s.root().f;
  delete s.root().g;
  delete s.root().h;

  test.done();
}

exports.readNestedObj = function(test) {
  var s = Store.prototype.master();
  var nested = {};
  new tracker.Tracker(nested);
  s.root().a = nested;
  var str = s.writeObj(s.root(),'');
  var obj = s.updateObj(str);
  test.throws(function() {obj.a}, types.UnknownReference);
  delete s.root().a; 
  test.done();
}

exports.readNestedArray = function(test) {
  var s = Store.prototype.master();
  var nested = [];
  new tracker.Tracker(nested);
  s.root().a = nested;
  var str = s.writeObj(s.root(),'');
  var obj = s.updateObj(str);
  test.throws(function() {obj.a}, types.UnknownReference);
  delete s.root().a; 
  test.done();
}

exports.emptySaveObj = function(test) {
  var m = Store.prototype.master();
  var nested = {};
  new tracker.Tracker(nested);
  m.root().a = nested;

  test.expect(1);
  var s = new Store();
  s.save(function(root) {
    test.ok(typeof root === 'object');
  });
  delete m.root().a;
  test.done();
}

exports.emptySaveArray = function(test) {
  var m = Store.prototype.master();
  var nested = [];
  new tracker.Tracker(nested);
  m.root().a = nested;

  test.expect(1);
  var s = new Store();
  s.save(function(root) {
    test.ok(typeof root === 'object');
  });
  delete m.root().a;
  test.done();
}

exports.objAccessSave = function(test) {
  var m = Store.prototype.master();
  var nested:any = {};
  new tracker.Tracker(nested);
  m.root().a = nested;
  m._tree.insert({id: nested._tracker._id, obj: nested});

  test.expect(3);
  var s = new Store();
  s.save(function(root) {
    isEqual(test, root.a, nested);
  });
  test.done();
}
*/

exports.objAccessSave2 = function(test) {
  var m = Store.prototype.master();
  var nested:any = {};
  new tracker.Tracker(nested);
  m.root().a = nested;
  m.root().b = nested;
  m._tree.insert({id: nested._tracker._id, obj: nested});

  test.expect(3);
  var s = new Store();
  s.save(function(root) {
    isEqual(test, root.a, nested);
    isEqual(test, root.b, nested);
  });
  test.done();
}

exports.arrayAccessSave = function(test) {
  var m = Store.prototype.master();
  var nested:any = [];
  new tracker.Tracker(nested);
  m.root().a = nested;
  m._tree.clear();
  m._tree.insert({id: nested._tracker._id, obj: nested});

  test.expect(3);
  var s = new Store();
  s.save(function(root) {
    isEqual(test, root.a, nested);
  });
  test.done();
}
