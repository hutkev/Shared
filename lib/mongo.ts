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

    export class MongoStore implements Store extends mtx.mtxFactory {
      private _logger: utils.Logger = utils.defaultLogger();  

      private _host: string;                                   // Configuration
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

      constructor (host?: string = 'localhost', port?: number = 27017, db?: string = 'shared', collection?: string = 'shared') {
        super();
        this._host = host;
        this._port = port;
        this._dbName = db;
        this._collectionName = collection;
        this._safe = false;

        this._logger.debug('STORE', '%s: Store created', this.id());
      }

      close() : void {
        // Queue close, 
        this._pending.push({ close: true });

        // Process queue
        this.processPending();
      }

      atomic(handler: (store: any) => any, callback?: (error: string, arg: any) => void = function () { }): void {

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

                  var curP = new rsvp.Promise();
                  curP.resolve();
                  that.lock(curP, MINLOCK).then(function () {
                    that.refreshSet(err).then(function () {
                      that.removeLock().then(function () {
                        that._logger.debug('STORE', 'Starting re-try');
                        done.reject(null);  // A retry request
                      }, function (err) {
                        that.removeLock().then(function () {
                          done.reject(err);
                        });
                      });
                    }, function (err) {
                      that.removeLock().then(function () {
                        done.reject(err);
                      });
                    });
                  }, function (err) {
                    done.reject(err);
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
              var curP = that.getCollection();
              that.lock(curP, MINLOCK).then(function () {
                that.getObject(unk.missing()).then(function (obj) {
                  that.removeLock().then(function () {
                    if (unk.id() !== undefined) {
                      var assign: any = that._cache.find(unk.id());
                      if (assign !== null) {
                        that.disable++;
                        assign[unk.prop()] = obj;
                        that.disable--;
                      }
                    }
                    done.reject(null);  // A retry request
                  }, function (err) {
                    done.reject(err);
                  });
                }, function (err) {
                  that.removeLock().then(function () {
                    done.reject(err);
                  });
                });
              }, function (err) {
                done.reject(err);
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

      private commitMtx(mtx: mtx.MTX) : rsvp.Promise {
        utils.dassert(utils.isValue(mtx));
        this._logger.debug('STORE', '%s: commitMtx()', this.id(), mtx.toString());
        var that = this;

        // If not many new objects just take the lock
        var prelock = false;
        curP = new rsvp.Promise();
        curP.resolve();
        var curP: rsvp.Promise;
        if (mtx.nset.size() < 10) {
          curP = that.lock(curP, MINLOCK);
          prelock = true;
        }

        // Check for versions, rejects with array of out of date object ids
        curP = that.chain(curP, function () {
          var p = new rsvp.Promise();
          that.checkReadset(mtx.rset).then(
            function (fails) {
              var failed = fails.filter(function (v) { return v !== null })
              if (failed.length > 0) {
                that._logger.debug('STORE', '%s: checkReadset2 failures', that.id(), failed);
                that.failInLock(p, failed, prelock);
              } else {
                p.resolve();
              }
            }, function (err) {
              that._logger.debug('STORE', '%s: checkReadset2 failed', that.id());
              that.failInLock(p, err, prelock);
            }
          );
          return p;
        });
        
        // Ref & Rev set, for later action
        var rrset = new utils.IdMap();

        // Load up new objects
        var nset = mtx.nset;
        for (var i = 0; i < nset.size(); i++) {
          var nentry = nset.at(i);
          utils.dassert(this._cache.find(nentry.id) === null);

          // Write with 1 ref, but compensate in r&r set
          curP = that.writeObject(curP, nentry.id, nentry.obj, 1);
          var rr: RRData = { uprev: false, ref: -1, };
          rrset.insert(nentry.id, rr);

          // Time to start tracking changes
          new tracker.Tracker(that, nentry.obj, nentry.id, 0);
          that._cache.insert(nentry.id, nentry.obj);
        }

        // If not pre-locked we need to lock and check versions again
        if (!prelock) {
          curP = that.lock(curP, MINLOCK)
          curP = that.chain(curP, function () {
            var p = new rsvp.Promise();
            that.checkReadset(mtx.rset).then(
              function (fails) {
                var failed = fails.filter(function (v) { return v !== null })
                if (failed.length > 0) {
                  that._logger.debug('STORE', '%s: checkReadset failures', that.id(), failed);
                  that.failInLock(p, failed);
                } else {
                  p.resolve();
                }
              }, function (err) {
                that._logger.debug('STORE', '%s: checkReadset failed', that.id());
                that.failInLock(p, err);
              }
            );
            return p;
          });
        }

        // Now for the main body of changes
        var cset = mtx.cset;
        for (var i = 0; i < cset.size(); i++) {

          // Pull some basic details about target object
          var e = cset.at(i);
          var t = tracker.getTracker(e.obj);
          var id = t.id();
          var refdata: RefData = t.getData();

          // Record need to up revision, for later 
          var rr: RRData = rrset.findOrInsert(t.id(), {uprev: true, ref: 0 });
          rr.uprev = true;

          // Write prop
          if (e.write !== undefined) {
            // TODO: Do we need to de-serial?
            var val = serial.readValue(e.value);

            // Deref un-loaded value
            if (utils.isObject(e.last)) {
              var vid = this.objectID(e.last);
              var rr: RRData = rrset.findOrInsert(vid, { uprev: true, ref: 0 });
              rr.ref--;
              //curP = that.changeRef(curP, vid, -1);
            }

            // Upref loaded value
            if (utils.isObject(val)) {
              var vid = this.objectID(val);
              var rr: RRData = rrset.findOrInsert(vid, { uprev: true, ref: 0 });
              rr.ref++;
              //curP = that.changeRef(curP, vid, 1);
            }

            curP = that.writeProp(curP, id, e.write, val);
          }

          // Delete Prop
          else if (e.del !== undefined) {

            var t = tracker.getTracker(e.obj);
            var rd: RefData = t.getData();
            if (rd.rout > 0) {
              var oldP = curP;
              curP = new rsvp.Promise();
              var greenP = curP;
              that.readProp(oldP, t.id(), e.del).then(function (value) {
                if (utils.isObject(value)) {
                  var vkeys = Object.keys(value);
                  if (vkeys.length === 1 && vkeys[0] === '_id') {
                    var rr: RRData = rrset.findOrInsert(value._id, { uprev: false, ref: 0 });
                    rr.ref--;
                  }
                  greenP.resolve();
                }
              }, function (err) {
                that.failInLock(greenP, err);
              });
            }

            curP = that.deleteProp(curP, t.id(), e.del);
          }

            /*
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
          */
          
          else {
            this._logger.fatal('%s: cset contains unexpected command', t.id());
          }
        }

        // Do collected ref & rev changes
        var rrP = new rsvp.Promise();
        curP.then(function () {
          var done = new rsvp.Promise();
          done.resolve();
          rrset.apply(function (id: utils.uid, rr: RRData) {
            if (rr.uprev || rr.ref !== 0) {
              done = that.changeRevAndRef(done, id, rr.uprev, rr.ref);
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

        return this.chain(rrP, this.removeLock);
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

      private chain(chainP: rsvp.Promise, fn): rsvp.Promise {
        var that = this;
        var p = new rsvp.Promise();
        chainP.then(function () {
          fn.apply(that).then(function () {
            p.resolve();
          }, function (err) {
            p.reject(err);
          });
        }, function (err) {
          p.reject(err);
        });
        return p;
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
        return { obj: proto, id: doc._id, rev: doc._rev, ref: doc._ref, out: out };
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
                var lockP = new rsvp.Promise()
                that.ensureExists(lockUID, {locked : false}, lockP, null);
                lockP.then(function () {
                  that.ensureExists(rootUID, { _rev: 0, _ref: 1, _type: 'Object', _data : { } }, done, collection);
                }, function (err) {
                  done.reject(err)
                });
              }
            });
          }
        });
        return done;
      }

      private lock(chainP : rsvp.Promise, timeout: number) : rsvp.Promise {
        var that = this;
        var p = new rsvp.Promise();
        chainP.then(function () {
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
                        that.lock(chainP, MINLOCK).then(function () {
                          p.resolve();
                        }, function (err) {
                          p.reject(err);
                        });
                      }, function (err) {
                        p.resolve(err);
                      });
                    } else {
                      setTimeout(function () {
                        that.lock(chainP, timeout * 2).then(function () {
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
                  that.lock(chainP, timeout * 2).then(function () {
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
        }, function (err) {
          p.reject(err);
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

      private failInLock(promise: rsvp.Promise, error: any, inlock?: bool =true) {
        if (inlock) {
          this.removeLock().then(function () {
            promise.reject(error);
          }, function (err) {
            promise.reject(err);
          });
        } else {
          promise.reject(error);
        }
      }

      private getRoot(): rsvp.Promise {
        var that = this;
        var done = new rsvp.Promise();
        
        if (that._root !== null) {
          done.resolve(that._root);
        } else {
          var curP = that.getCollection();
          that.lock(curP, MINLOCK).then(function () {
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
                that.fail(done, '%s: Object missing in store: %s : %s', that.id(), oid);
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
                var rd : RefData = { rin: rec.ref, rout: rec.out };
                t.setData(rd);

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

      private writeObject(chainP: rsvp.Promise, oid:utils.uid, obj:any, ref:number) : rsvp.Promise {
        utils.dassert(utils.isValue(oid) && utils.isValue(obj));
        var that = this;

        var p = new rsvp.Promise();
        chainP.then(function () {
          // Prep a copy for upload
          var fake : any = {};
          fake._data = utils.cloneObject(obj);
          var keys = Object.keys(obj);
          for (var k = 0; k < keys.length; k++) {
            if (utils.isObjectOrArray(obj[keys[k]])) {
              var id = that.valueId(obj[keys[k]]);
              fake._data[keys[k]] = { _id: id.toString() };
            }
          }
          fake._id = utils.toObjectID(oid);  
          fake._rev = 0;
          fake._ref = ref;
          fake._type = utils.isObject(obj)?'Object':'Array';

          // Upload the fake
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
        });
        return p;
      }

      private ensureExists(oid: utils.uid, proto: any, done: rsvp.Promise, arg: any) {
        var that = this;

        that._logger.debug('STORE', '%s: Checking/inserting for object: %s', that.id(), oid);
        proto._id = utils.toObjectID(oid);
        that._collection.findOne({ _id:  utils.toObjectID(oid) }, function (err, doc) {
          if (err) {
            that.fail(done, '%s: Unable to search collection: %s : %s', that.id(), that._collectionName, err.message);
          } else if (doc === null) {
            that._collection.insert(proto, { safe: true }, function (err, inserted) {
              // Here err maybe be because of a race so we just log it
              if (err) {
                that._logger.debug('STORE', '%s: Unable to insert %s (ignoring as maybe race)', that.id(), oid);
              } else {
                that._logger.debug('STORE', '%s: Object %s inserted', that.id(), oid);
              }
              done.resolve(arg);
            });
          } else {
            that._logger.debug('STORE', '%s: Object %s already exists', that.id(), oid);
            done.resolve(arg);
          }
        });
      }

      private changeRevAndRef(chainP: rsvp.Promise, oid: utils.uid, revchange: bool, refchange: number) : rsvp.Promise {
        var that = this;
        var p = new rsvp.Promise();
        chainP.then(function () {
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
                if (doc._ref === 0) {
                  that.deleteObject(oid).then(function () {
                    p.resolve();
                  }, function (err) {
                    p.reject(err);
                  });
                } else {
                  p.resolve();
                }
              }
            }
          });
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

      private readProp(chainP: rsvp.Promise, oid: utils.uid, prop:string) : rsvp.Promise {
        var that = this;
        var p = new rsvp.Promise();

        var fields = {};
        fields['_data.'+prop] = true;
        chainP.then(function () {
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
        }, function (err) {
          p.reject(err);
        });
        return p;
      }

      private writeProp(chainP: rsvp.Promise, oid: utils.uid, prop:string, value:any) : rsvp.Promise {
        var that = this;
        var p = new rsvp.Promise();
        chainP.then(function () {
          var upd = { _data: {} };
          if (value instanceof serial.Reference)
            value = { _id: value.id() };
          upd._data[prop] = value;
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
        }, function (err) {
          p.reject(err);
        });
        return p;
      }

      private deleteProp(chainP: rsvp.Promise, oid: utils.uid, prop:string) : rsvp.Promise {
        var that = this;
        var p = new rsvp.Promise();

        chainP.then(function () {
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
        }, function (err) {
          p.reject(err);
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
              promise.resolve(oid.toString());
          }
        });
        return promise;
      }

      private refreshSet(failed: utils.uid[]): rsvp.Promise {
        var that = this;

        var fails = [];
        for (var i = 0; i < failed.length; i++) {
          fails.push(that.getObject(failed[i]));
        }
        return rsvp.all(fails);
      }
    }

    export interface ObjectData {
      obj: any;
      id: string;
      rev: number;
      ref: number;
      out: number;
    }

    export interface RefData {
      rin: number;
      rout: number;
    }

    export interface RRData {
      uprev: bool;
      ref: number;
    }

  } // store
} // shared
