// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />
/// <reference path='tracker.ts' />
/// <reference path='router.ts' />
/// <reference path='types.ts' />
/// <reference path='serial.ts' />
/// <reference path='mtx.ts' />
/// <reference path='store.ts' />

module shared {
  export module store {

    var cluster = require('cluster');
    var util = require('util');

    export class PrimaryStore implements Store extends mtx.mtxFactory {

      static _primaryStore: PrimaryStore = null;  // Who is acting as primary
      private _router: router.Router;             // Message router
      private _logger: utils.Logger;              // Default logger
      private _root: any;                         // Root object
      private _ostore: utils.Map;                 // Object lookup

      static primaryStore(): PrimaryStore {
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
        this._ostore = new utils.Map(utils.hash);
        this._root = new Object();
        var t = new tracker.Tracker(this, this._root, rootUID, 0);
        this._ostore.insert(t.id(), { ref: 1, obj: this._root });
        this._router = null;
        this.start();
      }

      start(listen?: router.Router) {
        if (this._router === null) {
          if (listen !== undefined)
            this._router = listen;
          else
            this._router = router.ClusterRouter.instance();
          this._router.register(this);
          this._logger.debug('STORE','%s: Store started (primary=true)', this.id());
        }
      }

      stop(): void {
        if (this._router !== null) {
          this._router.deregister(this);
          this._router = null;
          this._logger.debug('STORE','%s: Store stopped (primary=true)', this.id());
        }
      }

      atomic(handler: (root: any) => any , callback?: (error: string, arg: any) => void): void {
        var arg = handler(this.store());
        var ok = this.commit();
        if (utils.isValue(callback))
          callback(null,arg);
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
        this._logger.debug('STORE', '%s: Commiting local mtx to primary', this.id());
        var nset = this.localMtx(this._ostore);
        for (var i = 0; i < nset.length; i++) {
          var rec = nset[i];
          utils.dassert(this._ostore.find(rec.id) === null);
          new tracker.Tracker(this, rec.obj, rec.id, 0);
          this._ostore.insert(rec.id, { ref: 0, obj: rec.obj });
        }
        this.resetMtx();
        return true;
      }

      private address(): message.Address {
        return new message.Address(this.id());
      }

      private receive(msg: message.Message): void {
        utils.dassert(utils.isObject(msg));
        this._logger.debug('STORE', '%s: Primary received', this.id(), msg);

        switch (msg.body.detail) {
          case 'get':
            this._logger.debug('STORE', '%s: Attempting get', this.id(), msg);
            var rec = this._ostore.find(msg.body.id)
            if (rec === null) {
              this._logger.fatal('%s: No object for id: %s', this.id(), msg.body.id.toString());
            }
            this.replyMessage(msg, {
              detail: 'update', id: msg.body.id, rev: rec.obj._tracker.rev(),
              obj: serial.writeObject(this, rec.obj, '', false)
            });
            return;

          case 'mtx':
            this._logger.debug('STORE', '%s: Attempting commit', this.id(), msg);
            var fails = this.processRemoteMtx(msg.body.mtx);
            if (fails === null) {
              this._logger.debug('STORE', '%s: Commit passed', this.id());
              this.replyMessage(msg, { detail: 'ok' });
            } else {
              var update = [];
              for (var i = 0 ; i < fails.length; i++) {
                var t = tracker.getTracker(fails[i]);
                update.push({ id: t.id(), rev: t.rev(), body: serial.writeObject(this, fails[i]) });
              }
              this._logger.debug('STORE', '%s: Commit failed', this.id());
              this.replyMessage(msg, { detail: 'fail', updates: update });
            }
            return;

          default:
            this._logger.fatal('%s: Message handling failed', this.id(), msg);
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

      private processRemoteMtx(mtx: any): any {
        utils.dassert(utils.isArray(mtx) && mtx.length ===3)

        // Cmp rset TODO: Full mtx sematics test needed
        var rset = mtx[0];
        if (rset.length === 0) {
          this._logger.warn('Empty readset in mtx', mtx);
          return null;
        }

        var fails = [];
        for (var i = 0; i < rset.length; i++) {
          var rec = this._ostore.find(rset[i].id);
          if (rec !== null) {
            if (tracker.getTracker(rec.obj).rev() != rset[i].rev) {
              fails.push(rec.obj);
              this._logger.debug('STORE', 'Revision mismatch %d vs %d for %s', 
                tracker.getTracker(rec.obj).rev(), rset[i].rev, rset[i].id.toString());
            }
          } else {
            this._logger.fatal('%s: cmp set contains unknown object', rset[i].id);
          }
        }
        if (fails.length > 0) {
          return fails;
        }

        // Load in nset
        var nset = mtx[1];
        for (var i = 0; i < nset.length; i++) {
          var id = nset[i].id;
          utils.dassert(this._ostore.find(id) === null);

          var obj = serial.readObject(nset[i].value);
          this.resolveReferences(obj);
          new tracker.Tracker(this, obj, id, 0);
          this._ostore.insert(id, { ref: 0, obj: obj });
        }

        // Write changes & inc revs
        var cset = mtx[2];
        var wset = new utils.StringSet();
        for (var i = 0; i < cset.length; i++) {
          var e = cset[i];

          // Write prop
          if (e.write !== undefined) {
            // Locate target and uprev & ref if needed
            var rec = this._ostore.find(e.id);
            if (rec === null)
              this._logger.fatal('%s: cset contains unknown object', e.id);
            if (!wset.has(e.id)) {
              wset.put(e.id);
              rec.obj._tracker._rev++;
            }

            // Deref if needed
            if (rec.obj.hasOwnProperty(e.write)) {
              var t = tracker.getTrackerUnsafe(rec.obj[e.write]);
              if (t !== null) {
                var rec = this._ostore.find(e.id);
                rec.refs -= 1;
                if (rec.refs === 0)
                  this.gc(e.id);
              }
            }

            // Finally assign with possible upref
            var val = serial.readValue(e.value);
            var t = tracker.getTrackerUnsafe(val);
            if (t !== null) {
              var rec = this._ostore.find(e.id);
              rec.refs += 1;
            }
            rec.obj[e.write] = serial.readValue(e.value);
          }

          // Delete Prop
          if (e.del !== undefined) {
            var rec = this._ostore.find(e.id);
            if (rec === null)
              this._logger.fatal('%s: cset contains unknown object', e.id);
            if (!wset.has(e.id)) {
              wset.put(e.id);
              rec.obj._tracker._rev++;
            }
            delete rec.obj[e.prop];
          }
        }

        return null;
      }

      private gc(id: utils.uid) {
        console.log('GC: %j', id);
      }

      private resolveReferences(obj: any) {
        utils.dassert(utils.isObjectOrArray(obj));

        var keys = Object.keys(obj);
        for (var k = 0; k < keys.length; k++) {
          var key = keys[k];
          if (obj[key] instanceof serial.Reference) {
            var r: serial.Reference = obj[key];
            var rec = this._ostore.find(r.id());
            if (rec === null)
              this._logger.fatal('%s: reference contains unknown object', r.id());
            obj[key] = rec.obj;
            rec.refs += 1;
          }
        }
      }
    }

  } // store
} // shared
