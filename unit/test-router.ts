/// <reference path='../defs/node-0.8.d.ts' />
/// <reference path='../lib/shared.ts' />

module testrouter {

  import utils = shared.utils;
  import message = shared.message;
  import router = shared.router;

  var util = require('util');
  var cluster = require('cluster');
  //utils.defaultLogger().enableDebugLogging('ROUTER');

  /* 
    * Simple queueing receiver
    */
  class QueueReceiver implements router.Receiver extends utils.UniqueObject {
    private _address: message.Address;
    private _queue: any[] = [];

    constructor () {
      super();
      this._address = new message.Address(this.id())
    }

    queue() {
      return this._queue;
    }
      
    address() { 
      return this._address 
    }

    receive(msg: message.Message): void {
      this._queue.push(msg);
    }

    unknownHandler(msg: message.Message): bool {
      return false; // Not handled here
    }

    fatal(fmt: string, ...args: any[]): void {
      var s = util.format(fmt, args);
      this._queue.push({error: s});
    }
  }
  
  export function instance(test) {
    test.ok(utils.isObject(router.ClusterRouter.instance()));
    test.ok(router.ClusterRouter.instance() === router.ClusterRouter.instance());
    test.done();
  }

  export function register(test) {
    var route = router.ClusterRouter.instance();
    test.throws(function () { route.register(null); }, Error);
    test.throws(function () { route.register(undefined); }, Error);
    var recv = new QueueReceiver();
    route.register(recv);
    test.ok(recv.queue().length === 0);
    route.register(recv);
    test.ok(recv.queue().length === 0);
    route.deregister(recv);
    test.ok(recv.queue().length === 0);
    route.deregister(recv);
    test.ok(recv.queue().length === 1);
    test.ok(recv.queue()[0].error.indexOf('This receiver is not currently registered') === 0);
    test.done();
  }

  function send(r : router.Router, to: message.Address, from: message.Address, body: any) {
    var m = message.getMessage()
    message.setTo(m, to);
    message.setFrom(m, from);
    m.body = body;
    r.send(m);
    message.returnMessage(m);
  }

  function isMessage(m: message.Message, to: message.Address, from: message.Address, body: any) {
    return (
      m.to_rid === to.rid &&
      m.to_worker === to.worker &&
      m.from_rid === from.rid &&
      m.from_worker === from.worker &&
      utils.isEqual(m.body, body));
  }

  export function selfsend(test) {
    var route = router.ClusterRouter.instance();
    var recv = new QueueReceiver();
    route.register(recv);

    test.throws(function () { send(route,null, null, null); });
    test.throws(function () { send(route,recv.address(), null, null); });
    test.throws(function () { send(route,null, recv.address(), null); });
    test.throws(function () { send(route,undefined, undefined, null); });
    test.throws(function () { send(route,recv.address(), undefined, null); });
    test.throws(function () { send(route,undefined, recv.address(), null); });
  
    send(route,recv.address(), recv.address(), null);
    test.ok(isMessage(recv.queue()[0], recv.address(), recv.address(), null));
    recv.queue().pop();

    send(route,recv.address(), recv.address(), undefined);
    test.ok(isMessage(recv.queue()[0], recv.address(), recv.address(), undefined));
    recv.queue().pop();
  
    send(route,recv.address(), recv.address(), 0);
    test.ok(isMessage(recv.queue()[0], recv.address(), recv.address(), 0));
    recv.queue().pop();
  
    send(route,recv.address(), recv.address(), 1);
    test.ok(isMessage(recv.queue()[0], recv.address(), recv.address(), 1));
    recv.queue().pop();
  
    send(route,recv.address(), recv.address(), '');
    test.ok(isMessage(recv.queue()[0], recv.address(), recv.address(), ''));
    recv.queue().pop();
  
    send(route,recv.address(), recv.address(), 'a');
    test.ok(isMessage(recv.queue()[0], recv.address(), recv.address(), 'a'));
    recv.queue().pop();
  
    send(route,recv.address(), recv.address(), true);
    test.ok(isMessage(recv.queue()[0], recv.address(), recv.address(), true));
    recv.queue().pop();
  
    send(route,recv.address(), recv.address(), false);
    test.ok(isMessage(recv.queue()[0], recv.address(), recv.address(), false));
    recv.queue().pop();
    
    send(route,recv.address(), recv.address(), {});
    test.ok(isMessage(recv.queue()[0], recv.address(), recv.address(), {}));
    recv.queue().pop();
  
    send(route,recv.address(), recv.address(), {a:1});
    test.ok(isMessage(recv.queue()[0], recv.address(), recv.address(), {a:1}));
    recv.queue().pop();
  
    send(route,recv.address(), recv.address(), []);
    test.ok(isMessage(recv.queue()[0], recv.address(), recv.address(), []));
    recv.queue().pop();
  
    send(route,recv.address(), recv.address(), [1]);
    test.ok(isMessage(recv.queue()[0], recv.address(), recv.address(), [1]));
    recv.queue().pop();

    route.deregister(recv);
    test.done();
  }
  
  exports.localsend = function (test) {
    var route = router.ClusterRouter.instance();
    var recv1 = new QueueReceiver();
    var recv2 = new QueueReceiver();
    route.register(recv1);
    route.register(recv2);
  
    send(route,recv1.address(), recv2.address(), {});
    test.ok(isMessage(recv1.queue()[0], recv1.address(), recv2.address(), {}));
    recv1.queue().pop();
    test.ok(utils.isEqual(recv2.queue(), []));
  
    send(route,recv2.address(), recv1.address(), {});
    test.ok(isMessage(recv2.queue()[0], recv2.address(), recv1.address(), {}));
    recv1.queue().pop();
    test.ok(utils.isEqual(recv1.queue(), []));
  
    route.deregister(recv1);
    route.deregister(recv2);
    test.done();
  }
  
  export function noreceiver(test) {
    var route = router.ClusterRouter.instance();
    var recv1 = new QueueReceiver();
    var recv2 = new QueueReceiver();
    route.register(recv1);
  
    send(route,recv2.address(), recv1.address(), {});
    test.ok(utils.isEqual(recv1.queue(), []));
    test.ok(utils.isEqual(recv2.queue(), []));
  
    route.deregister(recv1);
    test.done();
  }
  
}