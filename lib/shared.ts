// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />
/// <reference path='tracker.ts' />
/// <reference path='router.ts' />
/// <reference path='types.ts' />
/// <reference path='serial.ts' />

module shared {
  export module main {

    var Tracker = shared.tracker.Tracker;
    var router = shared.router;

    var cluster = require('cluster');

    export class Cache implements tracker.TrackCache extends utils.UniqueObject {
      public disable: number =0;
      private _cset = [];
      private _rset = {};
      private _nset = [];

      cset() { return this._cset; }
      rset() { return this._rset; }
      nset() { return this._nset; }

      private tracker(value: any): tracker.Tracker {
        utils.dassert(utils.isObjectOrArray(value));
        if (value._tracker === undefined) {
          // Must be new object
          var t = new tracker.Tracker(this, value);

          // TODO: Maybe should just save obj, serialze later?
          t.tc().nset()[t.id().toString()] = serial.writeObject(this, value, '');
        }
        return value._tracker;
      }

      valueId(value: any): utils.uid {
        return this.tracker(value).id();
      }

      valueRev(value: any) : number {
        return this.tracker(value).rev();
      }
    }

    export class Store implements router.Receiver extends Cache {

      static _primaryStore: Store = null; // Who is acting as primary
      private _router: router.Router;     // Message router
      private _logger: utils.Logger;      // Default logger
      private _pending: any[] = [];       // Outstanding work queue
      private _root: any = null;          // Root object
      private _ostore: utils.Map = null;  // Object lookup

      static primaryStore(): Store {
        return _primaryStore;
      }

      constructor () {
        super();
        this._logger = utils.defaultLogger();

        // Always use cluster router for now
        // First in the master node is nominated primary
        this._router = router.ClusterRouter.instance();
        if (cluster.isMaster && Store._primaryStore === null) {
          Store._primaryStore = this;
        }

        // Init
        this._router.register(this);
        this._ostore = new utils.Map(utils.hash);
        if (this.isPrimaryStore()) {
          // Set up root
          this._root = new Object();
          new tracker.Tracker(this, this._root);
          this._ostore.insert(this._root._tracker.id(), this._root);
        } else {
          // Get root
          this._pending.push({ action: 'get', id: null });
          this.nextStep();
        }
        this._logger.info('%s: Store started (primary=%s)', this.id(),
          this.isPrimaryStore());
      }

      isPrimaryStore(): bool {
        return Store._primaryStore === this;
      }

      address(): message.Address {
        return new message.Address(this.id());
      }

      pending(): bool {
        return this._pending.length > 0;
      }

      receive(msg: message.Message): void {
        var ok: bool;
        if (this.isPrimaryStore()) {
          ok = this.dispatchPrimaryMsg(msg);
        } else {
          ok = this.dispatchSecondaryMsg(msg);
        }
        if (!ok) {
          this._logger.fatal('STORE', '%s: Message handling failed', this.id(), msg);
        }
      }

      unknownHandler(msg: message.Message): bool {
        this._logger.debug('STORE', '%s: unknownHandler called', this.id(), msg);
        if (this.isPrimaryStore()) {
          return this.dispatchPrimaryMsg(msg);
        }
        return false;
      }

      fatal(fmt: string, ...args: any[]): void {
      }

      root(): any {
        this.rset()[this._root._tracker._id] = this._root._tracker._rev;
        return this._root;
      }

      private sendPrimaryStore(body: any) {
        var msg = message.getMessage();
        message.setTo(msg, message.Address.networkAddress());
        message.setFrom(msg, this.address())
        msg.body = body;
        this._logger.debug('STORE', '%s: Sending to primary', this.id(), msg);
        this._router.send(msg);
        message.returnMessage(msg);
      }

      private replyMessage(inmsg: message.Message, body: any) {
        var msg = message.getMessage();
        message.replyTo(msg, inmsg);
        message.setFrom(msg, this.address())
        msg.body = body;
        this._logger.debug('STORE', '%s: Replying', this.id(), msg);
        this._router.send(msg);
        message.returnMessage(msg);
      }

      nextStep(): void {
        if (this._pending.length === 0)
          return;

        var r = this._pending[0];
        switch (r.action) {
          case 'get':
            r.action = 'waitget';
            this.sendPrimaryStore({ detail: 'get', id: r.id });
            break;
          case 'waitget':
            break;
          case 'save':
            if (r.fn !== null) {
              try {
                r.fn(this._root);
                r.action = 'waitsave';
                this.sendChanges();
              } catch (e) {
                // Cache miss when trying to commit
                if (e instanceof tracker.UnknownReference) {
                  var missing = this._ostore.find(e.missing());

                  if (missing === null) {
                    // Request to the missing object
                    this._pending.unshift({
                      action: 'get', id: e.missing(),
                      assignid: e.id(), assignprop: e.prop()
                    });
                    this.nextStep();
                  } else {
                    // Commit available to the prop
                    var to = this._ostore.find(e.id());
                    to[e.assignprop] = missing;
                    return;
                  }
                } else {
                  // Something else went wrong
                  throw e;
                }
              }
            }
            break;
          default:
            throw new Error('Unexpected command');
        }
      }

      save(handler: (root: any) => void , callback: (success: bool) => void , idx): void {
        this._pending.push({ action: 'save', fn: handler, cb: callback, idx: idx });
        this.nextStep();
      }

      // To master  
      dispatchPrimaryMsg(msg: message.Message): bool {
        utils.dassert(utils.isObject(msg));
        this._logger.debug('STORE', '%s: Dispatch primary', this.id(), msg);

        switch (msg.body.detail) {
          case 'get':
            this._logger.debug('STORE', '%s: Attempting get', this.id(), msg);
            var obj;
            if (msg.body.id === null) {
              obj = this._root;
            } else {
              var e = this._ostore.find(msg.body.id)
              if (e !== null)
                obj = e;
              else
                this._logger.fatal('STORE', '%s: No object for id: %s', msg.body.id);
            }
            this.replyMessage(msg, {
              detail: 'update', id: msg.body.id, rev: obj._tracker.rev(),
              obj: serial.writeObject(this, obj, '', true)
            });
            return true;

          case 'mtx':
            this._logger.debug('STORE', '%s: Attempting commit', this.id(), msg);
            if (this.processMtx(msg.body.mtx)) {
              this.replyMessage(msg, { detail: 'ok' });
              this._logger.debug('STORE', '%s: Commit passed', this.id());
            } else {
              this._logger.debug('STORE', '%s: Commit failed', this.id());
            }
            return true;

          default:
            return false;
        }
      };

      // To worker  
      dispatchSecondaryMsg(msg: message.Message): bool {
        utils.dassert(utils.isObject(msg));
        this._logger.debug('STORE', '%s: Dispatch secondary', this.id(), msg);

        switch (msg.body.detail) {
          case 'update':
            if (this._pending.length === 0 ||
              this._pending[0].action !== 'waitget' ||
              this._pending[0].id !== msg.body.id) {
              this._logger.fatal('%s: Received update out of sequence', this.id(), msg);
            }

            var proto = this._ostore.find(msg.body.id);
            if (proto) {
              proto._tracker._rev = msg.body.rev;
            }

            var obj = serial.readObject(msg.body.obj, proto);
            this._ostore.insert(obj._tracker.id(), obj);
            if (msg.body.id === null) {
              this._logger.debug('STORE', '%s: Bootstraped root node', this.id(), obj);
              this._root = obj;
            }

            var e = this._pending[0];
            if (e.assignid !== undefined) {
              var assign = this._ostore.find(e.assignid);
              if (assign !== null)
                assign[e.assignprop] = obj;
            }
            this._pending.shift();
            this.nextStep();
            return true;

          case 'ok':
            if (this._pending.length === 0 ||
              this._pending[0].action !== 'waitsave') {
              this._logger.fatal('%s: Received update out of sequence', this.id(), msg);
            }
            this._pending[0].cb(true);
            this._pending.shift();
            this.nextStep();
            return true;

          default:
            return false;
        }
      };

      processMtx(mtx): bool {
        // Cmp rset
        var rset = mtx[0];
        var rkeys = Object.keys(rset);
        for (var i = 0; i < rkeys.length; i++) {
          var o = this._ostore.find(rkeys[i]);
          if (o !== null) {
            if (o._tracker._rev != rset[rkeys[i]])
              return false;
          } else {
            throw new Error('Missing object');
          }
        }

        // Write changes & inc revs
        var cset = mtx[2];
        var wset = {};
        for (var i = 0; i < cset.length; i++) {
          var e = cset[i];
          if (e.write !== undefined) {
            var o = this._ostore.find(e.id);
            if (o === null)
              throw new Error('Missing object');
            if (!wset.hasOwnProperty(e.id)) {
              wset[e.id] = 0;
              o._tracker._rev++;
            }
            o[e.write] = serial.readValue(e.value);
          }
        }

        return true;
      }

      /**
       * Send mini-TX
       */
      sendChanges(): void {

        // Collect over accessed objects
        var rkeys = Object.keys(this.rset());
        for (var i = 0; i < rkeys.length; i++) {
          var o = this._ostore.find(rkeys[i]);
          if (o !== null) {
            o._tracker.collect(o);
          } else {
            // TODO: ?
            throw new Error('Unexpected object in read list');
          }
        }

        // Collect written objects and up rev them
        var wkeys = {};
        for (var i = 0; i < this.cset().length; i++) {
          var e = this.cset()[i];
          if (e !== null) {
            var t = e.obj._tracker;
            if (wkeys.hasOwnProperty(t._id)) {
              wkeys[t._id] = 0;
              t._ver++;
            }
            e.id = t._id;
            delete e.obj;
            delete e.lasttx;
          }
        }

        // Push to master (there is always something to do)
        this.sendPrimaryStore({
          detail: 'mtx',
          mtx: [<any>this.rset(), this.nset(), this.cset()]
        });
      }
    }

  } // main
} // shared