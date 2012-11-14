
/// <reference path='../defs/node-0.8.d.ts' />

import modrouter = module('../lib/router');
var router = modrouter.router;

var uuid = require('node-uuid');
var _ = require('underscore');
var cluster = require('cluster');

exports.exports = function(test) {
  test.ok(typeof router === 'object');
  test.done();
};

exports.methods = function(test) {
  test.ok(typeof router.register === 'function');
  test.ok(typeof router.deregister === 'function');
  test.ok(typeof router.dispatch === 'function');
  test.ok(typeof router.clear === 'function');
  test.done();
};

function Dummy() {
  this._id = uuid.v1();
}

Dummy.prototype.id = function() {
  return this._id;
}

Dummy.prototype.handle = function(msg) {
  this._last = msg;
}

exports.register = function(test) {
  router.clear();
  var d1 = new Dummy();

  router.register(d1);
  test.ok(router._map[d1.id()] !== undefined);
  router.deregister(d1);
  test.ok(router._map[d1.id()] === undefined);

  test.ok(router.register(d1) === true);
  test.ok(router._map[d1.id()] !== undefined);
  test.ok(router.register(d1) === false);
  test.ok(router.register(d1) === false);
  test.ok(router._map[d1.id()] !== undefined);
  test.ok(router.deregister(d1) === true);
  test.ok(router._map[d1.id()] === undefined);
  test.ok(router.deregister(d1) === false);
  test.ok(router.deregister(d1) === false);
  test.ok(router._map[d1.id()] === undefined);
  
  var d2 = new Dummy();
  router.register(d1);
  test.ok(router._map[d1.id()] !== undefined);
  test.ok(router._map[d2.id()] === undefined);
  router.register(d2);
  test.ok(router._map[d1.id()] !== undefined);
  test.ok(router._map[d2.id()] !== undefined);
  router.deregister(d1);
  test.ok(router._map[d1.id()] === undefined);
  test.ok(router._map[d2.id()] !== undefined);
  router.deregister(d2);
  test.ok(router._map[d1.id()] === undefined);
  test.ok(router._map[d2.id()] === undefined);

  router.register(d1);
  test.ok(router._map[d1.id()] !== undefined);
  test.ok(router._map[d2.id()] === undefined);
  router.register(d2);
  test.ok(router._map[d1.id()] !== undefined);
  test.ok(router._map[d2.id()] !== undefined);
  router.deregister(d2);
  test.ok(router._map[d1.id()] !== undefined);
  test.ok(router._map[d2.id()] === undefined);
  router.deregister(d1);
  test.ok(router._map[d1.id()] === undefined);
  test.ok(router._map[d2.id()] === undefined);

  router.register(d1);
  router.register(d2);
  test.ok(router._map[d1.id()] !== undefined);
  test.ok(router._map[d2.id()] !== undefined);
  router.clear();
  test.ok(router._map[d1.id()] === undefined);
  test.ok(router._map[d2.id()] === undefined);

  test.done();
};

exports.send = function(test) {
  router.clear();
  var d1 = new Dummy();
  router.register(d1);
  var d2 = new Dummy();
  router.register(d2);

  var msg = {route_to: {id: 0, task: d1._id}, text: 'hello'};
  router.dispatch(msg);
  if (cluster.isMaster)
    test.ok(d1._last === msg);

  var msg = {route_to: {id: 0, task: d1._id}, text: 'goodbye'};
  router.dispatch(msg);
  if (cluster.isMaster)
    test.ok(d1._last === msg);

  var msg2 = {route_to: {id: 0, task: d2._id}, text: 'another'};
  router.dispatch(msg2);
  if (cluster.isMaster) {
    test.ok(d1._last === msg);
    test.ok(d2._last === msg2);
  }
  test.done();
}

exports.names = function(test) {
  router.clear();
  var d1 = new Dummy();
  router.register(d1,'d1');
  var d2 = new Dummy();
  router.register(d2,'d2');

  var msg = {route_to: {name: 'd1'}, text: 'hello'};
  router.dispatch(msg);
  if (cluster.isMaster)
    test.ok(_.isEqual(d1._last, {route_to: {id: 0, task: d1._id}, text: 'hello'}));

  var msg = {route_to: {name: 'd1'}, text: 'goodbye'};
  router.dispatch(msg);
  if (cluster.isMaster)
    test.ok(_.isEqual(d1._last, {route_to: {id: 0, task: d1._id}, text: 'goodbye'}));

  var msg2 = {route_to: {name: 'd2'}, text: 'another'};
  router.dispatch(msg2);
  if (cluster.isMaster) {
    test.ok(d1._last === msg);
    test.ok(_.isEqual(d1._last, {route_to: {id: 0, task: d1._id}, text: 'goodbye'}));
    test.ok(_.isEqual(d2._last, {route_to: {id: 0, task: d2._id}, text: 'another'}));
  }
    
  test.done();
}

exports.fork = function(test) {
  var count = 0;
  if (cluster.isMaster) {
    router.dispatch = function(msg) {
      count++;
    }
    cluster.fork();
    var terminate = function() {
      if (count === 3)
        process.exit(0);
      else
        process.nextTick(terminate);
    };
    process.nextTick(terminate);
  }
  test.done();
}