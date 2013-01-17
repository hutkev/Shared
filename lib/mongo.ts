// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />
/// <reference path='tracker.ts' />
/// <reference path='types.ts' />
/// <reference path='serial.ts' />
/// <reference path='mtx.ts' />
/// <reference path='store.ts' />

module shared {
  export module store {

    var util = require('util');
    var mongo = require('mongodb');

    export class MongoStore implements Store extends mtx.mtxFactory {
      private _db: string;
      private _collection: string;
      private _mongo: mongodb.Server;

      private _logger: utils.Logger;          // Default logger
      private _pending: any[] = [];           // Outstanding work queue
      private _ostore: utils.Map = null;      // Object lookup

      constructor (host?: string = 'localhost', port?:number = 27017, db?: string = 'shared', collection?: string = 'shared') { 
        super();
        this._db = db;
        this._collection = collection;
        this._mongo = new mongo.Server(host, port);
      }

      atomic(handler: (store: any) => any, callback?: (error: string, arg: any) => void ): void {
        this._pending.push({ action: 'save', fn: handler, cb: callback});
        this.nextStep();
      }

      reset() {
        this.resetMtx();
      }

      private nextStep(): void {
        if (this._pending.length === 0)
          return;

        var r = this._pending[0];
        switch (r.action) {
          case 'get':
            r.action = 'waitget';
            this.getMongo(r.id); // sendPrimaryStore({ detail: 'get', id: r.id });
            break;
          case 'waitget':
            break;
          case 'save':
            //this.tryAtomic();
            break;
         case 'waitsave': 
           // Nothing to be done until reply
           break;
         default:
            this._logger.fatal('%s: Unexpected pending action: %j', this.id(), r.action);
        }
      }

      private getMongo(id: utils.uid) {
      }

    }

    /*
    export class SecondaryStore implements Store extends mtx.mtxFactory {

      private _router: router.Router = null;  // Message router
      private _logger: utils.Logger;          // Default logger
      private _pending: any[] = [];           // Outstanding work queue
      private _ostore: utils.Map = null;      // Object lookup

      constructor () {
        super();
        this._logger = utils.defaultLogger();
        this._ostore = new utils.Map(utils.hash);
        this._router = null;
        this.start();
        this._pending.unshift({ action: 'get', id: rootUID });
      }

      start(listen?: router.Router) {
        if (this._router === null) {
          if (listen !== undefined)
            this._router = listen;
          else
            this._router = router.ClusterRouter.instance();
          this._router.register(this);
          this._logger.debug('STORE','%s: Store started (primary=false)', this.id());
        }
      }

      stop(): void {
        if (this._router !== null) {
          this._router.deregister(this);
          this._router = null;
          this._logger.debug('STORE','%s: Store stoped (primary=true)', this.id());
        }
      }

      atomic(handler: (root: any) => any , callback?: (error: string, arg: any) => void): void {
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
          this._logger.fatal('%s: Message handling failed', this.id(), msg);
        }
      }

      unknownHandler(msg: message.Message): bool {
        // Secondary does not need to handle these, leave to primary
        return false;
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

      private nextStep(): void {
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
            this.tryAtomic();
            break;
         case 'waitsave': 
           // Nothing to be done until reply
           break;
         default:
            this._logger.fatal('%s: Unexpected pending action: %j', this.id(), r.action);
        }
      }

      // To worker  
      private dispatchSecondaryMsg(msg: message.Message): bool {
        utils.dassert(utils.isObject(msg));
        this._logger.debug('STORE', '%s: Dispatch secondary', this.id(), msg);

        switch (msg.body.detail) {
          case 'update':
            if (this._pending.length === 0 ||
              this._pending[0].action !== 'waitget' ||
              this._pending[0].id != msg.body.id) {
              this._logger.fatal('%s: Received update out of sequence', this.id(), msg);
            }

            this.disable++;
            var proto = this._ostore.find(msg.body.id);
            var obj = serial.readObject(msg.body.obj, proto);
            var t = tracker.getTrackerUnsafe(obj);
            if (t === null) {
              t = new tracker.Tracker(this, obj, msg.body.id, msg.body.rev);
              this._ostore.insert(t.id(), { ref: 0, obj: obj });
            } else {
              t.setRev(msg.body.rev);
              t.retrack(obj);
            }

            var e = this._pending[0];
            if (e.assignid !== undefined) {
              var assign = this._ostore.find(e.assignid);
              if (assign !== null)
                assign.obj[e.assignprop] = obj;
            }
            this._pending.shift();
            this.disable--;

            this.nextStep();
            return true;

          case 'ok':
          case 'fail':
            if (this._pending.length === 0 ||
              this._pending[0].action !== 'waitsave') {
              this._logger.fatal('%s: Received update out of sequence', this.id(), msg);
            }
            var passed: bool = msg.body.detail === 'ok';
            if (passed) {
              var cb = this._pending[0].cb;
              var arg = this._pending[0].arg;
              this._pending.shift();
              this.okMtx(this._ostore);
              if (utils.isValue(cb))
                cb(null,arg);
              this.nextStep();
            } else {
              this.undoMtx(this._ostore,false);
              this.compensate(msg.body.updates);
              this.tryAtomic();
            }
            return true;

          default:
            return false;
        }
      };

      private tryAtomic() {
        var r = this._pending[0];
        utils.dassert(r.action === 'save' || r.action === 'waitsave');
        try {
          // Get root
          var e = this._ostore.find(rootUID);
          if (e == null) {
            this._pending.unshift({ action: 'get', id: rootUID });
            this.nextStep();
            return;
          }

          // Invoke atomic block
          var root = e.obj;
          this.markRead(root);
          r.arg = r.fn(root);

          // Push to master (there is always something to do)
          r.action = 'waitsave';
          this.sendPrimaryStore({
            detail: 'mtx', mtx: this.mtx(this._ostore)
          });
        } catch (e) {

          this.undoMtx(this._ostore); // Force a reset

          // Cache miss when trying to commit
          if (e instanceof tracker.UnknownReference) {
            var unk: tracker.UnknownReference = e;
            var missing = this._ostore.find(unk.missing());
            if (missing === null) {
              // Request to the missing object
              this._pending.unshift({
                action: 'get', id: unk.missing(),
                assignid: unk.id(), assignprop: unk.prop()
              });
              this.nextStep();
            } else {

              // Commit available to the prop
              var to = this._ostore.find(unk.id());
              this.disable++;
              to.obj[unk.prop()] = missing.obj;
              this.disable--;
              this.tryAtomic();
            }
          } else {
            // Something else went wrong
            var cb = this._pending[0].cb;
            var arg = this._pending[0].arg;
            this._pending.shift();
            if (utils.isValue(cb))
              cb(e,arg);
          }
        }
      }

      private compensate(updates: any[]): void {
        this.disable++;
        for (var i = 0; i < updates.length; i++) {
          var id = updates[i].id;
          var rev = updates[i].rev;

          var obj = null;
          if (utils.isValue(id) && utils.isValue(rev)) {
            var rec = this._ostore.find(id);
            if (rec !== null) {
              obj = rec.obj;
              tracker.getTracker(obj).setRev(rev);
            }

            var data = updates[i].body;
            if (utils.isValue(data)) {
              obj = serial.readObject(data, obj);
              var t = tracker.getTrackerUnsafe(obj);
              if (t === null) {
                new tracker.Tracker(this, obj, id, rev);
                this._ostore.insert(id, { ref: 1, obj: obj });
              } else {
                t.retrack(obj);
              }
            }
          }
        }
        this.disable--;
      }


      /*
    export class MongoStore implements Store extends mtx.mtxFactory {

      static _primaryStore: MongoStore = null;    // Who is acting as primary

      private _router: router.Router;             // Message router
      private _logger: utils.Logger;              // Default logger
      private _root: any;                         // Root object
      private _ostore: utils.Map;                 // Object lookup

      static primaryStore(): MongoStore {
        return _primaryStore;
      }

      constructor () {
        super();

        

        // Setup as one and only primary in cluster
        if (cluster.isMaster) {
          if (MongoStore._primaryStore === null) {
            MongoStore._primaryStore = this;
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

      store(): any {
        this.markRead(this._root);
        return this._root;
      }

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

      undo() {
        this.undoMtx(this._ostore, true);
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

            var val = serial.readValue(e.value);
            if (val instanceof serial.Reference) {
              var trec = this._ostore.find(val.id());
              if (!utils.isObjectOrArray(trec.obj))
                this._logger.fatal('%s: cset contains unknown object ref', val.id);
              rec.obj[e.write] = trec.obj;
            } else {
              rec.obj[e.write] = val;
            }
          }

          // Delete Prop
          else if (e.del !== undefined) {
            var rec = this._ostore.find(e.id);
            if (rec === null)
              this._logger.fatal('%s: cset contains unknown object', e.id);
            if (!wset.has(e.id)) {
              wset.put(e.id);
              rec.obj._tracker._rev++;
            }
            delete rec.obj[e.del];
          }

          // Re-init array
          else if (e.reinit !== undefined) {
            var rec = this._ostore.find(e.id);
            if (rec === null)
              this._logger.fatal('%s: cset contains unknown object', e.id);
            if (!utils.isArray(rec.obj))
              this._logger.fatal('%s: cset re-init on non-array', e.id);
            if (!wset.has(e.id)) {
              wset.put(e.id);
              rec.obj._tracker._rev++;
            }

            rec.obj.length = 0;
            serial.readObject(e.reinit, rec.obj);
          } 

          // Reverse array
          else if (e.reverse !== undefined) {
            var rec = this._ostore.find(e.id);
            if (rec === null)
              this._logger.fatal('%s: cset contains unknown object', e.id);
            if (!utils.isArray(rec.obj))
              this._logger.fatal('%s: cset re-init on non-array', e.id);
            if (!wset.has(e.id)) {
              wset.put(e.id);
              rec.obj._tracker._rev++;
            }

            rec.obj.reverse();
          } 

          // Shift array
          else if (e.shift !== undefined) {
            var rec = this._ostore.find(e.id);
            if (rec === null)
              this._logger.fatal('%s: cset contains unknown object', e.id);
            if (!utils.isArray(rec.obj))
              this._logger.fatal('%s: cset re-init on non-array', e.id);
            if (!wset.has(e.id)) {
              wset.put(e.id);
              rec.obj._tracker._rev++;
            }

            rec.obj.splice(e.shift,e.size);
          } 

          // Unshift array
          else if (e.unshift !== undefined) {
            var rec = this._ostore.find(e.id);
            if (rec === null)
              this._logger.fatal('%s: cset contains unknown object', e.id);
            if (!utils.isArray(rec.obj))
              this._logger.fatal('%s: cset re-init on non-array', e.id);
            if (!wset.has(e.id)) {
              wset.put(e.id);
              rec.obj._tracker._rev++;
            }

            var args = [e.unshift,0];
            for (var j = 0 ; j < e.size; j++)
              args.push(undefined);
            Array.prototype.splice.apply(rec.obj, args);
          } 
          
          else {
            this._logger.fatal('%s: cset contains unexpected command', e.id);
          }
        }

        return null;
      }

      private gc(id: utils.uid) {
        // TODO: ??
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

    */


  } // store
} // shared
