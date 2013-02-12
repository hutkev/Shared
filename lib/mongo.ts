// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />
/// <reference path='tracker.ts' />
/// <reference path='types.ts' />
/// <reference path='serial.ts' />
/// <reference path='mtxfactory.ts' />
/// <reference path='store.ts' />

module shared {
  export module store {

    var util = require('util');
    var rsvp = require('rsvp');
    var mongo = require('mongodb');
    var bson = require('bson');

    var MINLOCK: number = 1;
    var CHECKRAND: number = 100;
    var MAXLOCK: number = 10000;

    var lockUID = utils.makeUID('000000000000000000000000');

    export class MongoStore implements Store extends mtx.mtxFactory {
      private _logger: utils.Logger = utils.defaultLogger();  

      private _host: string;                                    // Configuration
      private _port: number;
      private _dbName: string;                                  
      private _collectionName: string;
      private _safe: bool;

      private _db: mongodb.Db;                                  // Database stuff
      private _collection: mongodb.Collection = null;
      
      private _pending: any[] = [];                             // Outstanding work queue

      private _root: any = null;                                // Root object
      private _cache = new shared.mtx.ObjectCache();            // Cached objects

      private _lockRand: string;                                // For checking for lock changes

      constructor (options?: any = {}) {
        super();
        this._host = options.host || 'localhost';
        this._port = options.port || 27017;
        this._dbName = options.db || 'shared';
        this._collectionName = options.collection || 'shared';
        this._safe = options.safe || 'false';

        this._logger.debug('STORE', '%s: Store created', this.id());
      }

      close() : void {
        // Queue close, 
        this._pending.push({ close: true });

        // Process queue
        this.processPending();
      }

      apply(handler: (store: any) => any, callback?: (error: string, arg: any) => void = function () { }): void {

        // Queue
        this._pending.push({ handler: handler, callback: callback });

        // Process queue
        this.processPending();
      }

      private processPending(recurse: bool = false) {
        var that = this;

        // Processing is chained, so only start if only 1 to do
        if ((recurse && that._pending.length > 0) ||
          (!recurse && that._pending.length === 1)) {
          
          var pending = that._pending[0];
          if (pending.close) {
            // Close the db
            if (that._db) {
              that._db.close();
              that._collection = null;
              that._db = null;
              that._logger.debug('STORE', '%s: Database has been closed', that.id());
            }
            that._pending.shift();
          } else {
            // An Update
            that.getRoot().then(function (root) {
              that.tryHandler(pending.handler).then(function (ret) {
                // Completed
                that._logger.debug('STORE', '%s: Invoking user callback',that.id());
                pending.callback(null,ret);
                that._pending.shift();
                that.processPending(true);
              }, function (err) {
                if (err) {
                  // Some error during processing
                  that._logger.debug('STORE', '%s: Invoking user callback with error %j',that.id(),err);
                  pending.callback(err,null);
                  that._pending.shift();
                  that.processPending(true);
                } else {
                  // Needs re-try
                  that.processPending(true);
                }
              });
            }, function (err) {
              // No root object
              that._logger.debug('STORE', '%s: Invoking user callback with error %j',that.id(),err);
              pending.callback(err,null);
              that._pending.shift();
              that.processPending(true);
            });
          }
        }
      }

      private tryHandler(handler: (store: any) => any, done? = new rsvp.Promise()) {
        var that = this;
        try {
          that._logger.debug('STORE', '%s: Invoking user handler',that.id());
          that.markRead(that._root);
          var ret = handler(that._root)
          try {
            that._logger.debug('STORE', '%s: Attempting commit',that.id());
            that.commitMtx(that.mtx(that._cache)).then(function () {
              // It's passed :-)
              that._logger.debug('STORE', '%s: Update completed successfully',that.id());
              that.okMtx(that._cache);
              done.resolve(ret);
            }, function (err) {
              if (utils.isArray(err)) {
                if (err.length !== 0) {
                  that._logger.debug('STORE', 'Objects need refresh after commit failure');
                  that.undo();

                  // Refresh out-of date objects
                  that.locked(function () {
                    return that.refreshSet(err);
                  }).then(function () {
                    that._logger.debug('STORE', 'Starting re-try');
                    done.reject(null)
                  }, function (err) {
                    done.reject(err)
                  });
                }
              } else {
                done.reject(err);
              }
            });
          } catch (e) {
            that._logger.fatal('Unhandled exception', utils.exceptionInfo(e));
          }
        } catch (e) {
          that._logger.debug('STORE', 'Exception during try: ', utils.exceptionInfo(e));

          // Reset any changes
          that.undo(); 

          // Cache miss when trying to commit
          if (e instanceof tracker.UnknownReference) {
            var unk: tracker.UnknownReference = e;
            var missing = that._cache.find(unk.missing());
            if (missing === null) {

              // Load the object
              var curP = that.getCollection();
              curP = that.wait(curP, function () {
                return that.locked(function () {

                  // Get the object
                  var nestedP = that.getObject(unk.missing());

                  // Assign it if needed
                  nestedP = that.wrap(nestedP, function (obj) {
                    if (unk.id() !== undefined) {
                      var assign: any = that._cache.find(unk.id());
                      if (assign !== null) {
                        that.disable++;
                        assign[unk.prop()] = obj;
                        that.disable--;

                        // Request retry
                        done.reject(null);
                      }
                    }
                  });

                  return nestedP;
                });
              });

            } else {
              // Commit available to the prop
              var to = this._cache.find(unk.id());
              that.disable++;
              to[unk.prop()] = missing;
              that.disable--;
              done.reject(null);  // A retry request
            }
          } else {
            done.reject(e);
          }
        }
        return done;
      }

      private commitMtx(mtx: mtx.MTX): rsvp.Promise {
        utils.dassert(utils.isValue(mtx));
        this._logger.debug('STORE', '%s: commitMtx()', this.id(), mtx.toString());
        var that = this;

        return that.locked(function () {
          return that.applyMtx(mtx);
        });
      }

      private applyMtx(mtx: mtx.MTX): rsvp.Promise {
        var that = this;
        var curP = new rsvp.Promise();

        // Check readset is OK
        that.checkReadset(mtx.rset).then(
          function (fails) {
            var failed = fails.filter(function (v) { return v !== null })
            if (failed.length > 0) {
              that._logger.debug('STORE', '%s: checkReadset failures', that.id(), failed);
              curP.reject(failed);
            } else {
              curP.resolve();
            }
          }, function (err) {
            that._logger.debug('STORE', '%s: checkReadset failed', that.id());
            curP.reject(err);
          }
        );

        // Make changes
        return that.wait(curP, function () {
          return that.makeChanges(mtx);
        });
      }

      private makeChanges(mtx: mtx.MTX) : rsvp.Promise {
        var that = this;

        var curP = new rsvp.Promise();
        curP.resolve();

        // Ref change & Rev set, for later action
        // Note: New objects are given a starting ref change of -1 to counter 
        // the + 1 they are given when loaded into mongo. Net effect is that 
        // something must reference them to stop them being deleted at the end 
        // of the pass, which of course the normal case.
        var rrset = new utils.IdMap();

        // Scan nset for cross references
        var nset = mtx.nset;
        for (var i = 0; i < nset.size(); i++) {
          var nentry = nset.at(i);
          utils.dassert(this._cache.find(nentry.id) === null);

          // Scan for non-tracked objects
          var keys = Object.keys(nentry.obj);
          for (var k = 0 ; k < keys.length; k++) {
            var v=nentry.obj[keys[k]]
            if (utils.isObjectOrArray(v) && tracker.getTrackerUnsafe(v)===null) {
              var vid = this.valueId(v);
              var rr: RRData = rrset.findOrInsert(vid, { uprev: false, ref: -1, reinit: false });
              rr.ref++;
            }
          }
        }

        // Load up new objects
        for (var i = 0; i < nset.size(); i++) {
          var nentry = nset.at(i);
          utils.dassert(this._cache.find(nentry.id) === null);

          // Write with 1 ref, compensated in r&r set
          var writeObjectFn = (function (_id,_obj) {
            return function () {return that.writeObject(_id, _obj, 0, 1) };
          });
          curP = that.wait(curP, writeObjectFn(nentry.id, nentry.obj));
          var rr: RRData = { uprev: false, ref: -1, reinit: false};
          rrset.findOrInsert(nentry.id, { uprev: false, ref: -1, reinit: false });

          // Time to start tracking changes
          new tracker.Tracker(that, nentry.obj, nentry.id, 0);
          that._cache.insert(nentry.id, nentry.obj);
        }

        // Now for the main body of changes
        var cset = mtx.cset;
        for (var i = 0; i < cset.size(); i++) {

          // Pull some basic details about target object
          var e = cset.at(i);
          if (e === null) continue;
          var t = tracker.getTracker(e.obj);
          var id = t.id();
          var tdata: TrackerData = t.getData();

          // Record need to up revision, for later 
          var rr: RRData = rrset.findOrInsert(t.id(), { uprev: true, ref: 0, reinit: false });
          rr.uprev = true;

          // Write prop
          if (e.write !== undefined) {

            // Deref un-loaded value
            if (utils.isObjectOrArray(e.last)) {
              var vid = this.objectID(e.last);
              var lastrr: RRData = rrset.findOrInsert(vid, { uprev: true, ref: 0, reinit: false });
              lastrr.ref--;
              tdata.rout--;
            }

            // Upref if assigning object
            var val = e.value;
            if (utils.isObjectOrArray(val)) {
              var vid = this.objectID(val);
              val = new serial.Reference(vid);
              var valrr: RRData = rrset.findOrInsert(vid, { uprev: true, ref: 0, reinit: false });
              valrr.ref++;
              tdata.rout++;
            }

            var writePropFn = (function (_id,_write,_val) {
              return function () {return that.writeProp(_id, _write, _val) };
            });
            curP = that.wait(curP, writePropFn(id,e.write,val));
          }

          // Delete Prop
          else if (e.del !== undefined) {

            // Check for outbound to another object
            if (tdata.rout > 0) {

              var readPropFn = (function (_id,_del) {
                return function () {return that.readProp(_id, _del)};
              });
              curP = that.wait(curP, readPropFn(t.id(), e.del));

              curP = that.wrap(curP, function (value) {
                if (utils.isObject(value)) {
                  var vkeys = Object.keys(value);
                  if (vkeys.length === 1 && vkeys[0] === '_id') {
                    var valrr: RRData = rrset.findOrInsert(value._id, { uprev: false, ref: 0, reinit: false });
                    valrr.ref--;
                    tdata.rout--;
                  }
                }
              });
            }

            // Remove the prop
            var deletePropFn = (function (_id,_del) {
              return function () {return that.deleteProp(_id, _del)};
            });
            curP = that.wait(curP, deletePropFn(t.id(), e.del));
          }

          else if (e.shift !== undefined) {

            // Handle front pop
            if (e.shift === 0 || e.shift === -1) {
              var count = e.size;
              var front = (e.shift === 0);

              var arrayPopFn = (function (_id, _front) {
                return function () { return that.arrayPop(_id, _front) };
              });

              while (count--) {
                curP = that.wait(curP, arrayPopFn(id, front));
              }
            } else {
              // Need a re-init
              rr.reinit = true;
            }
          }  
          
          else if (e.unshift !== undefined) {
            rr.reinit = true;
          }

          else if (e.reinit !== undefined) {
            rr.reinit = true;
          }

          else if (e.reverse !== undefined) {
            rr.reinit = true;
          }

          else {
            this._logger.fatal('%s: cset contains unexpected command', t.id());
          }
        }

        // Do collected ref & rev changes
        var rrP = new rsvp.Promise();
        curP.then(function () {
          var done = new rsvp.Promise();
          done.resolve();

          rrset.apply(function (lid: utils.uid, rr: RRData) {

            if (rr.reinit) {
              // Worst case, have to write whole object again
              var reobj = that._cache.find(lid);
              var ret = tracker.getTracker(reobj);
              var ltdata: TrackerData = ret.getData();

              var writeObjectFn = (function (_id,_obj,_rev,_ref) {
                return function () {return that.writeObject(_id, _obj, _rev, _ref) };
              });

              done = that.wait(done, writeObjectFn(lid, reobj, ret.rev(), ltdata.rin+rr.ref));

            } else if (rr.uprev || rr.ref !== 0) {
              // Just ref & rev changes to do
              var changeRevAndRefFn = (function (_id,_uprev,_ref) {
                return function () {return that.changeRevAndRef(_id, _uprev, _ref) };
              });
              done = that.wait(done, changeRevAndRefFn(lid, rr.uprev, rr.ref));
            }
          });

          done.then(function () {
            rrP.resolve();
          }, function (err) {
            rrP.reject(err);
          });

        }, function (err) {
          rrP.reject(err);
        });

        return rrP;
      }

      private undo() {

        // Undo current transaction
        this.undoMtx(this._cache); 

        // Did the root die?
        var t = tracker.getTracker(this._root);
        if (t.isDead()) {
          this._root = null;
        }
      }

      private objectID(obj: any): utils.uid {
        utils.dassert(utils.isObjectOrArray(obj));

        if (obj instanceof serial.Reference) 
          return obj.id();
        var t = tracker.getTrackerUnsafe(obj);
        if (t)
          return t.id();
        return this.valueId(obj);
      }

      private fail(promise, fmt: string, ...msgs: any[]) {
        var msg=utils.format('', fmt, msgs);
        this._logger.debug('STORE', msg);
        promise.reject(new Error(msg));
      }

      private updateObject(doc: any, proto?: any) : ObjectData {

        // Sort out proto
        if (doc._type === 'Object') {
          if (!utils.isValue(proto)) {
            proto = {};
          } else {
            utils.dassert(utils.isObject(proto));
          }
        } else if (doc._type === 'Array') {
          if (!utils.isValue(proto)) {
            proto = [];
          } else {
            utils.dassert(utils.isArray(proto));
            // Prop delete does not work well on arrays so zero proto
            proto.length = 0;
          }
        } else {
          this._logger.fatal('%s: Unexpected document type: %j', this.id(), doc._type);
        }

        this.disable++;

        // Read props
        var dkeys = Object.keys(doc._data);
        var dk = 0;
        var pkeys = Object.keys(proto);
        var pk = 0;

        var out = 0;
        while (true) {
          // Run out?
          if (dk === dkeys.length)
            break;

          // Read prop name
          var prop = dkeys[dk];

          // Delete rest of proto props if does not match what is being read
          if (pk !== -1 && prop != pkeys[pk]) {
            for (var i = pk; i < pkeys.length; i++)
              delete proto[pkeys[i]];
            pk = -1;
          }

          // Check for a Reference
          var val = doc._data[dkeys[dk]];
          if (utils.isObject(val)) {
            var vkeys = Object.keys(val);
            if (vkeys.length === 1 && vkeys[0] === '_id') {
              val = new serial.Reference(val._id);
              out++;
            }
          }

          // Update proto value
          proto[prop] = val;
          dk++;
        }

        this.disable--;
        return { obj: proto, id: doc._id, rev: doc._rev, ref: doc._ref, out: out };
      }

      /* ----------------------------- ASYNC HELPERS ------------------------------- */

      private wait(chainP: rsvp.Promise, fn: (args: any[]) => rsvp.Promise): rsvp.Promise {
        var that = this;
        var p = new rsvp.Promise();
        chainP.then(function () {
          fn.apply(that,arguments).then(function () {
            p.resolve.apply(p,arguments);
          }, function (err) {
            p.reject(err);
          });
        }, function (err) {
          p.reject(err);
        });
        return p;
      }

      private wrap(chainP: rsvp.Promise, fn: (args: any[]) => any): rsvp.Promise {
        var that = this;
        var p = new rsvp.Promise();
        chainP.then(function () {
          p.resolve(fn.apply(that, arguments));
        });
        return p;
      }

      private locked(fn : () => rsvp.Promise): rsvp.Promise {
        var that = this;
        var p = new rsvp.Promise();

        that.lock().then(function () {

          fn().then(function () {
            var args = arguments;
            that.removeLock().then(function () {
              p.resolve(args);
            }, function (err) {
              p.reject(err);
            });
          }, function (err) {
            that.removeLock().then(function () {
              p.reject(err);
            }, function (err) {
              p.reject(err);
            });
          });

        }, function (err) {
          p.reject(err);
        });
        return p;
      }

      /* ----------------------------- MONGO CODE ----------------------------------- */

      private getCollection() : rsvp.Promise {
        var that = this;
        var done = new rsvp.Promise();

        // Shortcut if we have been here before
        if (that._collection!==null) {
          done.resolve(that._collection)
          return done;
        }

        // Open DB
        that._logger.debug('STORE', '%s: Connecting to database - %s', that.id(), that._dbName);
        that._db = new mongo.Db(that._dbName, new mongo.Server(that._host, that._port, { poolSize: 1 }), { w: 1 });
        that._db.open(function (err, db) {
          if (err) {
            that.fail(done, '%s: Unable to open db: %s : %s', that.id(), that._dbName, err.message);
          } else {
            // Open Collection
            that._logger.debug('STORE', '%s: Opening collection - %s', that.id(), that._collectionName);
            that._db.createCollection(that._collectionName, function (err, collection) {
              if (err) {
                that.fail(done, '%s: Unable to open collection: %s : %s', that.id(), that._collectionName, err.message);
              } else {
                that._collection = collection;

                // Init collection
                var curP = that.ensureExists(lockUID, {locked : false}, null);
                curP = that.wait(curP, function () {
                  return that.ensureExists(rootUID, { _rev: 0, _ref: 1, _type: 'Object', _data: {} }, collection);
                });

                curP.then(function () {
                  done.resolve();
                }, function (err) {
                  done.resolve(err);
                });
              }
            });
          }
        });
        return done;
      }

      private lock(timeout?: number=MINLOCK) : rsvp.Promise {
        var that = this;
        var p = new rsvp.Promise();

        that._logger.debug('STORE', '%s: Trying to acquire lock', that.id());
        var oid = utils.toObjectID(lockUID);
        var rand = new bson.ObjectId().toString();
        that._collection.findAndModify({ _id: oid, locked: false }, [], 
          { _id: oid, owner: that.id().toString(), host: utils.hostInfo(), pid: process.pid, rand: rand, locked: true },
          { safe: true, upsert: false, remove: false, new: false }, function (err, doc) {
          if (err) {
            that.fail(p,'%s: Unable query lock : %s', that.id(), err.message);
          } else if (!doc) {

            // Report on current state
            if (timeout > CHECKRAND) {
              that._collection.findOne({ _id: oid }, function (err, doc) {
                if (err) {
                  that.fail(p, '%s: Unable query lock : %s', that.id(), err.message);
                } else {
                  that._logger.debug('STORE', '%s: Locked by: %s', that.id(), doc.host);

                  // If lock rand is changing, reset timout so we don't kill unecessarily
                  if (doc && doc['rand'] !== undefined && that._lockRand !== doc.rand) {
                    if (that._lockRand)
                      that._logger.debug('STORE', '%s: Lock rand has changed, %s to %s, reseting timeout', that.id(), that._lockRand, doc.rand);
                    that._lockRand = doc.rand;
                    timeout = CHECKRAND;
                  }

                  // We are going to have to break this
                  if (timeout > MAXLOCK) {
                    that._logger.debug('STORE', '%s: Lock owner must be dead, trying to remove', that.id());
                    that.removeLock().then(function () {
                      that.lock().then(function () {
                        p.resolve();
                      }, function (err) {
                        p.reject(err);
                      });
                    }, function (err) {
                      p.resolve(err);
                    });
                  } else {
                    setTimeout(function () {
                      that.lock(timeout * 2).then(function () {
                        p.resolve();
                      }, function (err) {
                        p.reject(err);
                      })
                    }, timeout);
                  }
                }
              });
            } else {
              // < CHECK time, just try again
              setTimeout(function () {
                that.lock(timeout * 2).then(function () {
                  p.resolve();
                }, function (err) {
                  p.reject(err);
                })
              }, timeout);
            }
          } else {
            that._logger.debug('STORE', '%s: Acquired lock', that.id());
            p.resolve();
          }
        });
        return p;
      }

      private removeLock() : rsvp.Promise {
        var that = this;
        var done = new rsvp.Promise();
        
        var oid = utils.toObjectID(lockUID);
        that._collection.update({ _id: oid }, { _id: oid, locked: false }, 
          { safe: that._safe, upsert: true}, function (err, update) {
            if (err) {
              that.fail(done,'%s: Unable remove lock : %s', that.id(), err.message);
            } else {
              that._logger.debug('STORE', '%s: Released lock', that.id());
              that._lockRand = null;
              done.resolve();
            } 
        });
        return done;
      }

      private getRoot(): rsvp.Promise {
        var that = this;
        var done = new rsvp.Promise();
        
        if (that._root !== null) {
          done.resolve(that._root);
        } else {
          var curP = that.getCollection();
          curP.then(function () {
            that.lock().then(function () {
              that.getObject(rootUID).then(function (obj) {
                that.removeLock().then(function () {
                  that._root = obj;
                  done.resolve(obj);
                }, function (err) {
                  done.reject(err);
                });
              }, function (err) {
                that.removeLock().then(function () {;
                  done.reject(err);
                });
              });
            }, function (err) {
              done.reject(err);
            })
          }, function (err) {
            done.reject(err);
          });
        }
        return done;
      }

      private getObject(oid: utils.uid) : rsvp.Promise {
        var done = new rsvp.Promise();
        var that = this;

        that.getCollection().then(function (collection) {

          that._logger.debug('STORE', '%s: Searching for object: %s', that.id(), oid);
          collection.findOne({ _id: utils.toObjectID(oid) }, function (err, doc) {
            if (err) {
              that.fail(done, '%s: Unable to search collection: %s : %s', that.id(), that._collectionName, err.message);
            } else {
              if (doc === null) {
                that.fail(done, '%s: Object missing in store: %s', that.id(), oid);
              } else {
                that._logger.debug('STORE', '%s: Loading object: %s:%d', that.id(), oid, doc._rev);
                // Load the new object
                var obj = that._cache.find(oid);
                var rec = that.updateObject(doc, obj);

                // Reset tracking
                var t = tracker.getTrackerUnsafe(rec.obj);
                if (t === null) {
                  t = new tracker.Tracker(that, rec.obj, rec.id, rec.rev);
                  that._cache.insert(t.id(), rec.obj);
                } else {
                  t.setRev(rec.rev);
                  t.retrack(rec.obj);
                }
                var tdata : TrackerData = { rout: rec.out, rin: doc._ref };
                t.setData(tdata);

                // Catch root update
                if (t.id().toString() === rootUID.toString()) {
                  that._root = rec.obj;
                }

                // Return object
                done.resolve(rec.obj);     
              }
            }
          });
        });
        return done;
      }

      private refreshSet(failed: utils.uid[]): rsvp.Promise {
        var that = this;

        var fails = [];
        for (var i = 0; i < failed.length; i++) {
          fails.push(that.getObject(failed[i]));
        }
        return rsvp.all(fails);
      }

      private writeObject(oid:utils.uid, obj:any, rev:number, ref:number) : rsvp.Promise {
        utils.dassert(utils.isValue(oid) && utils.isObjectOrArray(obj));
        var that = this;

        // Prep a copy for upload
        var rout = 0;
        var fake : any = {};
        fake._data = utils.clone(obj);
        var keys = Object.keys(obj);
        for (var k = 0; k < keys.length; k++) {
          if (utils.isObjectOrArray(obj[keys[k]])) {
            var id = that.valueId(obj[keys[k]]);
            fake._data[keys[k]] = { _id: id.toString() };
            rout++;
          }
        }
        fake._id = utils.toObjectID(oid);  
        fake._rev = rev;
        fake._ref = ref;
        fake._type = utils.isObject(obj) ? 'Object' : 'Array';
        tracker.getTracker(obj).setData({ rout: rout, rin: ref });

        // Upload the fake
        var p = new rsvp.Promise();
        that._logger.debug('STORE', '%s: Updating object: %s %j', that.id(), oid, obj);
        that._collection.update({ _id: fake._id }, fake, { safe: that._safe, upsert: true }, function (err,count) {
          if (err) {
            that.fail(p, '%s: Update failed on new object %s=%j error %s', that.id(), id, obj, err.message);
          } else {
            if (that._safe && count !== 1) {
              that.fail(p, '%s: Update failed on new object %s=%j count %d', that.id(), id, obj, count);
            } else {
              p.resolve();
            }
          }
        });
        return p;
      }

      private ensureExists(oid: utils.uid, proto: any, arg: any) : rsvp.Promise{
        var that = this;

        var p = new rsvp.Promise();
        that._logger.debug('STORE', '%s: Checking/inserting for object: %s', that.id(), oid);
        proto._id = utils.toObjectID(oid);
        that._collection.findOne({ _id:  utils.toObjectID(oid) }, function (err, doc) {
          if (err) {
            that.fail(p, '%s: Unable to search collection: %s : %s', that.id(), that._collectionName, err.message);
          } else if (doc === null) {
            that._collection.insert(proto, { safe: true }, function (err, inserted) {
              // Here err maybe be because of a race so we just log it
              if (err) {
                that._logger.debug('STORE', '%s: Unable to insert %s (ignoring as maybe race)', that.id(), oid);
              } else {
                that._logger.debug('STORE', '%s: Object %s inserted', that.id(), oid);
              }
              p.resolve(arg);
            });
          } else {
            that._logger.debug('STORE', '%s: Object %s already exists', that.id(), oid);
            p.resolve(arg);
          }
        });
        return p;
      }

      private changeRevAndRef(oid: utils.uid, revchange: bool, refchange: number) : rsvp.Promise {
        var that = this;
        var p = new rsvp.Promise();

        that._logger.debug('STORE', '%s: Updating object rev & ref: %s uprev: %s, upref %d', that.id(), oid, revchange, refchange);
        var revinc = 0;
        if (revchange) 
          revinc = 1;
          that._collection.findAndModify({ _id:  utils.toObjectID(oid) }, [], { $inc: { _rev: revinc, _ref: refchange } }, 
            { safe: true, remove:false, upsert:false, new:true }, function (err,doc) {
          if (err) {
            that.fail(p, '%s: Update failed on object ref for %s error %s', that.id(), oid, err.message);
          } else {
            if (doc === null) {
              that.fail(p, '%s: Update failed on object ref for %s empty doc', that.id(), oid);
            } else {

              // Delete this object if needed
              var d;
              if (doc._ref === 0) {
                d = that.deleteObject(oid)

                // Scan object for outgoing links & down ref them
                var dropRefFn = (function (_id) {
                  return function () { return that.changeRevAndRef(utils.makeUID(_id), false, -1) };
                });

                var keys = Object.keys(doc._data);
                for (var k = 0 ; k < keys.length; k++) {
                  var v = doc._data[keys[k]];
                  if (utils.isObject(v) && utils.isEqual(Object.keys(v), ['_id'])) {
                    var rid = v._id;
                    d = that.wait(d, dropRefFn(rid));
                  }
                }

              } else {
                d = new rsvp.Promise();
                d.resolve();
              }

              d.then(function () {
                p.resolve();
              }, function (err) {
                p.reject(err);
              });
            }
          }
        });
        return p;
      }

      private deleteObject(oid: utils.uid) : rsvp.Promise {
        var that = this;
        var p = new rsvp.Promise();

        that._logger.debug('STORE', '%s: Deleting object: %s', that.id(), oid);
        that._collection.remove({ _id:  utils.toObjectID(oid) }, { safe: that._safe }, function (err,count) {
          if (err) {
            that.fail(p, '%s: Deleting failed on %s error %s', that.id(), oid, err.message);
          } else {
            if (that._safe && count !== 1) {
              that.fail(p, '%s: Deleting failed on %s count %d', that.id(), oid, count);
            } else {
              p.resolve();
            }
          }
        });
        return p;
      }

      private readProp(oid: utils.uid, prop:string) : rsvp.Promise {
        var that = this;
        var p = new rsvp.Promise();

        var fields = {};
        fields['_data.'+prop] = true;

        that._logger.debug('STORE', '%s: Reading prop for object: %s[%s]', that.id(), oid, prop);
        that._collection.findOne({ _id:  utils.toObjectID(oid) }, fields, function (err, doc) {
          if (err) {   
            that.fail(p, '%s: Unable to search collection: %s : %s', that.id(), that._collectionName, err.message);
          } else if (doc === null) {
            that.fail(p, '%s: Object missing in store: %s : %s', that.id(), oid);
          } else {
            p.resolve(doc._data[prop]);
          }
        });
        return p;
      }

      private writeProp(oid: utils.uid, prop:string, value:any) : rsvp.Promise {
        var that = this;
        var p = new rsvp.Promise();
        
        if (value instanceof serial.Reference)
          value = { _id: value.id() };
        var upd = {};
        upd['_data.'+prop] = value;
        that._logger.debug('STORE', '%s: Updating property: %s[%s] %j', that.id(), oid, prop, value);
        that._collection.update({ _id:  utils.toObjectID(oid) }, { $set: upd }, { safe: that._safe }, function (err,count) {
          if (err) {
            that.fail(p, '%s: Update failed on %s[%s] %j error %s', that.id(), oid, prop, value, err.message);
          } else {
            if (that._safe && count !== 1) {
              that.fail(p, '%s: Update failed on %s[%s] %j count %d', that.id(), oid, prop, value, count);
            } else {
              p.resolve();
            }
          }
        });
        return p;
      }

      private deleteProp(oid: utils.uid, prop:string) : rsvp.Promise {
        var that = this;
        var p = new rsvp.Promise();

        var upd = {};
        upd['_data.'+prop] = '';
        that._logger.debug('STORE', '%s: Deleting property: %s[%s]', that.id(), oid, prop);
        that._collection.update({ _id:  utils.toObjectID(oid) }, { $unset: upd }, { safe: that._safe }, function (err,count) {
          if (err) {
            that.fail(p, '%s: Deleting failed on %s[%s] error %s', that.id(), oid, prop, err.message);
          } else {
            if (that._safe && count !== 1) {
              that.fail(p, '%s: Deleting failed on %s[%s] count %d', that.id(), oid, prop, count);
            } else {
              p.resolve();
            }
          }
        });
        return p;
      }

      private arrayPop(oid: utils.uid, front: bool) : rsvp.Promise {
        var that = this;
        var p = new rsvp.Promise();

        var arg = 1;
        var name = 'back';
        if (front) {
          arg = -1;
          name = 'front';
        }
        that._logger.debug('STORE', '%s: Array pop: %s[%s]', that.id(), oid, name);
        that._collection.update({ _id: utils.toObjectID(oid) }, { $pop: { _data: arg } }, { safe: that._safe }, function (err,count) {
          if (err) {
            that.fail(p, '%s: Array pop failed on %s[%s] error %s', that.id(), oid, name, err.message);
          } else {
            if (that._safe && count !== 1) {
              that.fail(p, '%s: Array pop failed on %s[%s] count %d', that.id(), oid, name, count);
            } else {
              p.resolve();
            }
          }
        });
        return p;
      }

      private checkReadset(rset: mtx.ReadMap) : rsvp.Promise {
        this._logger.debug('STORE', '%s: checkReadset(%d)', this.id(), rset.size());
        var that = this;
        utils.dassert(rset.size() !== 0);

        var fails = [];
        rset.apply(function (oid, rev) {
          fails.push(that.revisionCheck(oid, rev));
          return true;
        });
        return rsvp.all(fails);
      }

      private revisionCheck(oid: utils.uid, revision: number) : rsvp.Promise {
        this._logger.debug('STORE', '%s: revisionCheck(%s,%s)', this.id(), oid, revision);
        var that = this;
        var promise = new rsvp.Promise();

        that._collection.find({ _id: utils.toObjectID(oid), _rev: revision}).count(function (err, num) {
          if (err) {
            promise.reject(err.message);
          } else {
            if (num === 1)
              promise.resolve(null);
            else
              promise.resolve(oid);
          }
        });
        return promise;
      }

    }

    export interface ObjectData {
      obj: any;
      id: string;
      rev: number;
      ref: number;
      out: number;
    }

    export interface TrackerData {
      rout: number;
      rin: number;
    }

    export interface RRData {
      uprev: bool;
      ref: number;
      reinit: bool;
    }

  } // store
} // shared
