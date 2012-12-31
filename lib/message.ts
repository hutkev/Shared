// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />
/// <reference path='utils.ts' />
/// <reference path='id.ts' />
/// <reference path='types.ts' />

module shared {
  export module message {

    var dassert = utils.dassert;
    var cluster = require('cluster');
    var workerno = cluster.worker ? cluster.worker.uniqueID : 0;

    /**
     * Uses the worker unique id to route data. All non-local messages
     * end up being routed via the cluster master. A null rid is used
     * to send data to the 'network' endpoint. Zero route data means
     * send to master, which is logically the same as saying I don't
     * know where to send it as the master will pass-on if needed.
     */
    export class Address {
      private static _network: Address = null;

      public worker: number;
      public rid: utils.uid;

      constructor (rid: utils.uid, worker?: number) {
        this.rid = rid;
        this.worker = utils.isValue(worker) ? worker : workerno;
      }

      static networkAddress() {
        if (Address._network === null)
          Address._network = new Address(null, 0);
        return Address._network; 
      }
    }

    export interface Message {
      next: Message;
      to_rid: utils.uid;
      to_worker: number;
      from_rid: utils.uid;
      from_worker: number;
      body: any;
    }

    class LocalMessage implements Message {
      public next: Message;
      public to_rid: utils.uid;
      public to_worker: number;
      public from_rid: utils.uid;
      public from_worker: number;
      public body: any;

      constructor () {
        this.next = null;
        this.to_rid = null;
        this.to_worker = null;
        this.from_rid = null;
        this.from_worker = null;
        this.body = null;
      }
    }

    var _messageType : types.TypeDesc = null;

    function messageType() : types.TypeDesc {
      if (_messageType === null)
        _messageType = types.TypeStore.instance().type(new LocalMessage());
      return _messageType;
    }

    export function isMessage(msg: any) {
      return types.TypeStore.instance().type(msg) === messageType();
    }

    export function setTo(msg: Message, addr: Address) {
      utils.dassert(utils.isObject(msg));
      utils.dassert(utils.isObject(addr));
      msg.to_rid = addr.rid;
      msg.to_worker = addr.worker;
    }

    export function setFrom(msg: Message, addr: Address) {
      utils.dassert(utils.isObject(msg));
      utils.dassert(utils.isObject(addr));
      msg.from_rid = addr.rid;
      msg.from_worker = addr.worker;
    }

    export function replyTo(to: Message, from: Message) {
      utils.dassert(utils.isObject(to));
      utils.dassert(utils.isObject(from));
      to.to_rid = from.from_rid;
      to.to_worker = from.from_worker;
    }

    var _message_list: Message = null;

    export function getMessage() {
      var message = _message_list;
      if (message != null) {
        _message_list = _message_list.next;
        message.next = null;
      } else {
        message = new LocalMessage();
      }
      return message;
    }

    export function getMessageFor(addr: Address) {
      var m = getMessage();
      message.setFrom(m, addr);
      return m;
    }

    export function returnMessage(msg: Message) {
      msg.next = _message_list;
      _message_list = msg;
    }

  } // message
} // shared
