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

    var util = require('util');
    var cluster = require('cluster');

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

    }
  } // store
} // shared