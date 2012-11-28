
/// <reference path='import.ts' />

var utils: shared.utils = require('../lib/shared.js').tests.utils;
var router: shared.router = require('../lib/shared.js').tests.router;

var cluster = require('cluster');
utils.defaultLogger().enableDebugLogging('ROUTER');

exports.instance = function (test) {
  test.ok(utils.isObject(router.ClusterRouter.instance()));
  test.ok(router.ClusterRouter.instance() === router.ClusterRouter.instance());
  test.done();
}

exports.register = function (test) {
  var route = router.ClusterRouter.instance();
  test.throws(function () { route.register(null); }, Error);
  test.throws(function () { route.register(undefined); }, Error);
  var recv = new router.QueueReceiver();
  route.register(recv);
  test.ok(recv.queue().length === 0);
  route.register(recv);
  test.ok(recv.queue().length === 0);
  route.deregister(recv);
  test.ok(recv.queue().length === 0);
  route.deregister(recv);
  test.ok(recv.queue().length === 1);
  test.ok(recv.queue()[0].error.indexOf('This receiver is not currently registered')===0);
  test.done();
}

/*
exports.selfsend = function(test) {
  var route = router.ClusterRouter.instance();
  var recv = new router.QueueReceiver();
  route.register(recv);

  test.throws(function () { route.send(null, null, null); }, Error);
  test.throws(function () { route.send(recv.address(), null, null); }, Error);
  test.throws(function () { route.send(null, recv.address(), null); }, Error);
  test.throws(function () { route.send(undefined, undefined, null); }, Error);
  test.throws(function () { route.send(recv.address(), undefined, null); }, Error);
  test.throws(function () { route.send(undefined, recv.address(), null); }, Error);

  route.send(recv.address(), recv.address(), null);
  test.ok(utils.isEqual(recv.queue(), [{ from: recv.id(), msg: null }]));
  recv.queue().pop();

  route.send(recv.address(), recv.address(), undefined);
  test.ok(utils.isEqual(recv.queue(), [{ from: recv.id(), msg: undefined }]));
  recv.queue().pop();

  route.send(recv.address(), recv.address(), 0);
  test.ok(utils.isEqual(recv.queue(), [{ from: recv.id(), msg: 0 }]));
  recv.queue().pop();

  route.send(recv.address(), recv.address(), 1);
  test.ok(utils.isEqual(recv.queue(), [{ from: recv.id(), msg: 1 }]));
  recv.queue().pop();

  route.send(recv.address(), recv.address(), '');
  test.ok(utils.isEqual(recv.queue(), [{ from: recv.id(), msg: '' }]));
  recv.queue().pop();

  route.send(recv.address(), recv.address(), 'a');
  test.ok(utils.isEqual(recv.queue(), [{ from: recv.id(), msg: 'a' }]));
  recv.queue().pop();

  route.send(recv.address(), recv.address(), true);
  test.ok(utils.isEqual(recv.queue(), [{ from: recv.id(), msg: true }]));
  recv.queue().pop();

  route.send(recv.address(), recv.address(), false);
  test.ok(utils.isEqual(recv.queue(), [{ from: recv.id(), msg: false }]));
  recv.queue().pop();
  
  route.send(recv.address(), recv.address(), {});
  test.ok(utils.isEqual(recv.queue(), [{ from: recv.id(), msg: {} }]));
  recv.queue().pop();

  route.send(recv.address(), recv.address(), {a:1});
  test.ok(utils.isEqual(recv.queue(), [{ from: recv.id(), msg: {a:1} }]));
  recv.queue().pop();

  route.send(recv.address(), recv.address(), []);
  test.ok(utils.isEqual(recv.queue(), [{ from: recv.id(), msg: [] }]));
  recv.queue().pop();

  route.send(recv.address(), recv.address(), [1]);
  test.ok(utils.isEqual(recv.queue(), [{ from: recv.id(), msg: [1] }]));
  recv.queue().pop();

  route.deregister(recv);
  test.done();
}

exports.localsend = function (test) {
  var route = router.ClusterRouter.instance();
  var recv1 = new router.QueueReceiver();
  var recv2 = new router.QueueReceiver();
  route.register(recv1);
  route.register(recv2);

  route.send(recv1.address(), recv2.address(), {});
  test.ok(utils.isEqual(recv1.queue(), [{ from: recv2.id(), msg: {} }]));
  recv1.queue().pop();
  test.ok(utils.isEqual(recv2.queue(), []));

  route.send(recv2.address(), recv1.address(), {});
  test.ok(utils.isEqual(recv2.queue(), [{ from: recv1.id(), msg: {} }]));
  recv1.queue().pop();
  test.ok(utils.isEqual(recv1.queue(), []));

  route.deregister(recv1);
  route.deregister(recv2);
  test.done();
}

exports.noreceiver = function (test) {
  var route = router.ClusterRouter.instance();
  var recv1 = new router.QueueReceiver();
  var recv2 = new router.QueueReceiver();
  route.register(recv1);

  route.send(recv2.address(), recv1.address(), {});
  test.ok(utils.isEqual(recv1.queue(), []));
  test.ok(utils.isEqual(recv2.queue(), []));

  route.deregister(recv1);
  test.done();
}
*/
