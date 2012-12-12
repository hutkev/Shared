// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />
/// <reference path='tracker.ts' />
/// <reference path='router.ts' />
/// <reference path='types.ts' />
/// <reference path='serial.ts' />
/// <reference path='mtx.ts' />


module shared {
  export module main {

    var cluster = require('cluster');
    var rootUID = utils.makeUID('00000000-0000-0000-0000-000000000001');

    /*
     * Create a store, possibly the primary if running on a cluster master
     * node and a primary has not yet been started.
     */
    export function createStore() : Store {
      if (cluster.isMaster && PrimaryStore.primaryStore() === null) {
        return new PrimaryStore();
      } else {
        return new SecondaryStore();
      }
    }

    export interface Store extends router.Receiver {
      save(handler: (store: any) => void , callback: (success: bool) => void ): void;

      store(): any;
      commit(): bool;
    }

    export class PrimaryStore implements Store extends mtx.mtxFactory {

      static _primaryStore: Store = null; // Who is acting as primary
      private _router: router.Router;     // Message router
      private _logger: utils.Logger;      // Default logger
      private _root: any = null;          // Root object
      private _ostore: utils.Map = null;  // Object lookup

      static primaryStore(): Store {
        return _primaryStore;
      }

      constructor () {
        super();

        // Setup as one and only primary in cluster
        if (cluster.isMaster) {
          if (PrimaryStore._primaryStore === null) {
            PrimaryStore._primaryStore = this;
          } else {
            utils.defaultLogger().fatal('A Primary store has already been started');
          }
        }

        // Init
        this._logger = utils.defaultLogger();
        this._router = router.ClusterRouter.instance();
        this._router.register(this);
        this._ostore = new utils.Map(utils.hash);
        this._root = new Object();
        new tracker.Tracker(this, this._root, rootUID, 0);
        this._ostore.insert(this._root._tracker.id(), this._root);
        this._logger.info('%s: Store started (primary=true)', this.id());
      }

      save(handler: (root: any) => void , callback: (success: bool) => void): void {
        handler(this.store());
        callback(this.commit());
      }

      /*
       * This is only public for debugging purposes.
       */
      store(): any {
        this.markRead(this._root);
        return this._root;
      }

      /*
       * This is only public for debugging purposes.
       */
      commit(): bool {
        var mtx = this.mtx(this._ostore,true);
        console.log(mtx);
        this._logger.debug('STORE', '%s: Commiting local mtx to primary', this.id(), mtx);
        this.processMtxLocal(mtx);
        return true;
      }

      private address(): message.Address {
        return new message.Address(this.id());
      }

      private receive(msg: message.Message): void {
        utils.dassert(utils.isObject(msg));
        this._logger.debug('STORE', '%s: Dispatch primary', this.id(), msg);

        switch (msg.body.detail) {
          case 'get':
            this._logger.debug('STORE', '%s: Attempting get', this.id(), msg);
            var obj = this._ostore.find(msg.body.id)
            if (obj === null) {
              this._logger.fatal('STORE', '%s: No object for id: %s', msg.body.id);
            }
            this.replyMessage(msg, {
              detail: 'update', id: msg.body.id, rev: obj._tracker.rev(),
              obj: serial.writeObject(this, obj, '', false)
            });
            return;

          case 'mtx':
            this._logger.debug('STORE', '%s: Attempting commit', this.id(), msg);
            if (this.processMtxRemote(msg.body.mtx)) {
              this.replyMessage(msg, { detail: 'ok' });
              this._logger.debug('STORE', '%s: Commit passed', this.id());
            } else {
              this._logger.debug('STORE', '%s: Commit failed', this.id());
            }
            return;

          default:
            this._logger.fatal('STORE', '%s: Message handling failed', this.id(), msg);
        }
      }

      private unknownHandler(msg: message.Message): bool {
        this.receive(msg);
        return true;
      }

      private fatal(fmt: string, ...args: any[]): void {
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

      private processMtxLocal(mtx: any): void {
        utils.dassert(utils.isArray(mtx) && mtx.length ===3)

        // Just check versions if in debug
        if (utils.assertsEnabled()) {
          var rset = mtx[0];
          var rkeys = Object.keys(rset);
          for (var i = 0; i < rkeys.length; i++) {
            var o = this._ostore.find(rkeys[i]);
            utils.dassert(o != null);
            utils.dassert(o._tracker._rev === rset[rkeys[i]]);
          }
        }

        // Load new objects
        var nset = mtx[1];
        var nkeys = Object.keys(nset);
        for (var i = 0; i < nkeys.length; i++) {
          var key = nkeys[i];
          utils.dassert(this._ostore.find(key) === null);

          new tracker.Tracker(this, nset[key], key, 0);
          this._ostore.insert(key, nset[key]);
        }

        // Inc revs for changed objects
        var cset = mtx[2];
        var wset = new utils.StringSet();
        for (var i = 0; i < cset.length; i++) {
          var e = cset[i];
          var o = this._ostore.find(e.id);
          if (o === null)
            this._logger.fatal('STORE', '%s: cset contains unknown object', e.id);
          if (!wset.has(e.id)) {
            wset.put(e._id);
            o._tracker._rev++;
          }
        }
      }

      private processMtxRemote(mtx: any): bool {
        utils.dassert(utils.isArray(mtx) && mtx.length ===3)

        // Cmp rset
        var rset = mtx[0];
        var rkeys = Object.keys(rset);
        for (var i = 0; i < rkeys.length; i++) {
          var o = this._ostore.find(rkeys[i]);
          if (o !== null) {
            if (o._tracker._rev != rset[rkeys[i]])
              return false;
          } else {
            this._logger.fatal('STORE', '%s: cmp set contains unknown object', rkeys[i]);
          }
        }

        // Load in nset
        var nset = mtx[1];
        var nkeys = Object.keys(nset);
        for (var i = 0; i < nkeys.length; i++) {
          var key = nkeys[i];
          utils.dassert(this._ostore.find(key) === null);

          var obj = serial.readObject(nset[key]);
          new tracker.Tracker(this, obj, key, 0);
          this._ostore.insert(key, obj);
        }

        // Write changes & inc revs
        var cset = mtx[2];
        var wset = new utils.StringSet();
        for (var i = 0; i < cset.length; i++) {
          var e = cset[i];

          // Write prop
          if (e.write !== undefined) {
            var o = this._ostore.find(e.id);
            if (o === null)
              this._logger.fatal('STORE', '%s: cset contains unknown object', e.id);
            if (!wset.has(e.id)) {
              wset.put(e._id);
              o._tracker._rev++;
            }
            o[e.write] = serial.readValue(e.value);
          }

          // Delete Prop
          if (e.del !== undefined) {
            var o = this._ostore.find(e.id);
            if (o === null)
              this._logger.fatal('STORE', '%s: cset contains unknown object', e.id);
            if (!wset.has(e.id)) {
              wset.put(e._id);
              o._tracker._rev++;
            }
            delete o[e.prop];
          }
        }

        return true;
      }
    }

    export class SecondaryStore implements Store extends mtx.mtxFactory {

      private _router: router.Router;     // Message router
      private _logger: utils.Logger;      // Default logger
      private _pending: any[] = [];       // Outstanding work queue
      private _root: any = null;          // Root object
      private _ostore: utils.Map = null;  // Object lookup

      constructor () {
        super();
        this._logger = utils.defaultLogger();

        // Init
        this._router = router.ClusterRouter.instance();
        this._router.register(this);
        this._ostore = new utils.Map(utils.hash);
        this._root = new Object();
        new tracker.Tracker(this, this._root, rootUID, 0);
        this._ostore.insert(this._root._tracker.id(), this._root);
        this._logger.info('%s: Store started (primary=false)', this.id());
      }

      store(): any {
        this.markRead(this._root);
        return this._root;
      }

      commit(): bool {

        return true;
      }

      save(handler: (root: any) => void , callback: (success: bool) => void): void {
        this._pending.push({ action: 'save', fn: handler, cb: callback});
        this.nextStep();
      }

      address(): message.Address {
        return new message.Address(this.id());
      }

      pending(): bool {
        return this._pending.length > 0;
      }

      receive(msg: message.Message): void {
        var ok: bool;
        ok = this.dispatchSecondaryMsg(msg);
        if (!ok) {
          this._logger.fatal('STORE', '%s: Message handling failed', this.id(), msg);
        }
      }

      unknownHandler(msg: message.Message): bool {
        this._logger.debug('STORE', '%s: unknownHandler called', this.id(), msg);
        return true;
      }

      fatal(fmt: string, ...args: any[]): void {
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
                // Push to master (there is always something to do)
                this.sendPrimaryStore({
                  detail: 'mtx', mtx: this.mtx(this._ostore)});
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
            var obj = serial.readObject(msg.body.obj, proto);
            obj._tracker._rev = msg.body.rev;

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
    }
  } // main
} // shared