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
    var rsvp = require('rsvp');
    var mongo = require('mongodb');
    var bson = require('bson');

    var MINLOCK: number = 1;
    var CHECKRAND: number = 100;
    var MAXLOCK: number = 10000;

    export class MongoStore implements Store extends mtx.mtxFactory {
      private _logger: utils.Logger = utils.defaultLogger();  

      private _dbName: string;                                  // Configuration
      private _collectionName: string;

      private _mongo: mongodb.Server;                           // Database stuff
      private _db: mongodb.Db;
      private _collection: mongodb.Collection = null;
      
      private _pending: any[] = [];                             // Outstanding work queue

      private _root: any = null;                                // Root object
      private _cache = new shared.mtx.ObjectCache();            // Cached objects

      private _lockRand: string;                                // For checking for lock changes

      constructor (host?: string = 'localhost', port?: number = 27017, db?: string = 'shared', collection?: string = 'shared') {
        super();
        this._dbName = db;
        this._collectionName = collection;

        this._mongo = new mongo.Server(host, port);
        this._db = new mongo.Db(db, this._mongo, { w: 1 });

        this._logger.debug('STORE', '%s: Store created', this.id());
      }

      atomic(handler: (store: any) => any, callback?: (error: string, arg: any) => void ): void {

        // Queue
        this._pending.push({ handler: handler, callback: callback });

        // Process queue
        this.processPending();
      }

      private processPending(recurse: bool = false) {
        // Processing is chained, so only start if only 1 to do
        if ((recurse && this._pending.length > 0) ||
          (!recurse && this._pending.length === 1)) {

          var that = this;
          var pending = this._pending[0];
          that.getRoot().then(function (root) {
            that.tryHandler(pending.handler).then(function (ret) {
              // Completed
              if (utils.isValue(pending.callback)) {
                pending.callback(null, ret);
              }
              that._pending.shift();
              that.processPending(true);
            }, function (err) {
              if (err) {
                // Some error during processing
                if (utils.isValue(pending.callback))
                  pending.callback(err, null);
                that._pending.shift();
                that.processPending(true);
              } else {
                // Needs re-try
                that.processPending(true);
              }
            });
          }, function (err) {
            // No root object
            if (utils.isValue(pending.callback))
              pending.callback(err, null);
            that._pending.shift();
            that.processPending(true);
          });
        }
      }

      private tryHandler(handler: (store: any) => any, done? = new rsvp.Promise()) {
        var that = this;
        try {
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
                  that.undoMtx(this._cache,false); 
                  that.refreshSet(err).then(function () {
                    that._logger.debug('STORE', 'Starting re-try');
                    done.reject(null);  // A retry request
                  }, function (err) {
                    done.reject(err);
                  });
                }
              } else {
                done.reject(err);
              }
            });
          } catch (e) {
            that._logger.fatal('Unhandled exception', e.stack);
          }
        } catch (e) {
          that._logger.debug('STORE', 'Exception during try: ',e.stack);

          // Reset any changes
          that.undoMtx(this._cache); 

          // Cache miss when trying to commit
          if (e instanceof tracker.UnknownReference) {
            var unk: tracker.UnknownReference = e;
            var missing = that._cache.find(unk.missing());
            if (missing === null) {
              this.getObject(unk.missing()).then(function (obj) {
                if (unk.id() !== undefined) {
                  var assign:any = that._cache.find(unk.id());
                  if (assign !== null) {
                    that.disable++;
                    assign.obj[unk.prop()] = obj;
                    that.disable--;
                  }
                }
                done.reject(null);  // A retry request
              }, function (err) {
                done.reject(err);
              });
            } else {
              // Commit available to the prop
              var to = this._cache.find(unk.id());
              that.disable++;
              to.obj[unk.prop()] = missing;
              that.disable--;
              done.reject(null);  // A retry request
            }
          } else {
            done.reject(e);
          }
        }
        return done;
      }

      private commitMtx(mtx: any) : rsvp.Promise {
        this._logger.debug('STORE', '%s: commitMtx()', this.id(), mtx);
        utils.dassert(utils.isArray(mtx) && mtx.length ===3)
        var that = this;

        // If not many new objects just take the lock
        var prelock = false;
        curP = new rsvp.Promise();
        curP.resolve();
        var curP: rsvp.Promise;
        if (mtx[1].length < 10) {
          curP = that.lock(curP, MINLOCK);
          prelock = true;
        }

        // Check for versions, rejects with array of out of date object ids
        curP = that.chain(curP, function () {
          var p = new rsvp.Promise();
          that.checkReadset(mtx[0]).then(
            function (fails) {
              var failed = fails.filter(function (v) { return v !== null })
              if (failed.length > 0) {
                that._logger.debug('STORE', '%s: checkReadset2 failures', that.id(), failed);
                p.reject(failed);
              } else {
                p.resolve();
              }
            }, function (err) {
              that._logger.debug('STORE', '%s: checkReadset2 failed', that.id());
              p.reject(err);
            }
          );
          return p;
        });

        /*
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
        */

        // If not pre-locked we need to lock and check versions again
        if (!prelock) {
          curP = that.lock(curP, MINLOCK)
          curP = that.chain(curP, function () {
            var p = new rsvp.Promise();
            that.checkReadset(mtx[0]).then(
              function (fails) {
                var failed = fails.filter(function (v) { return v !== null })
                if (failed.length > 0) {
                  that._logger.debug('STORE', '%s: checkReadset failures', that.id(), failed);
                  p.reject(failed);
                } else {
                  p.resolve();
                }
              }, function (err) {
                that._logger.debug('STORE', '%s: checkReadset failed', that.id());
                p.reject(err);
              }
            );
            return p;
          });
        }

        // Write changes & inc revs
        var cset = mtx[2];
        var wset = new utils.Map(utils.hash);
        for (var i = 0; i < cset.length; i++) {
          var e = cset[i];

          // Write prop
          if (e.write !== undefined) {
            // Locate target and uprev & ref if needed
            if (!wset.find(e.id) !== null) {
              var obj = this._cache.find(e.id);
              if (obj === null)
                this._logger.fatal('%s: cset contains unknown object', e.id);

              wset.insert(e.id,obj);
              curP = that.writeProp(curP, e.id.toString(), '_rev', obj._tracker._rev);
            }

            var val = serial.readValue(e.value);
            curP = that.writeProp(curP, e.id.toString(), e.write, val);

            /*
            if (val instanceof serial.Reference) {
              var trec = this._ostore.find(val.id());
              if (!utils.isObjectOrArray(trec.obj))
                this._logger.fatal('%s: cset contains unknown object ref', val.id);
              rec.obj[e.write] = trec.obj;
            } else {
              rec.obj[e.write] = val;
            }
            */

          }

          // Delete Prop
          /*
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
          */
          
          else {
            this._logger.fatal('%s: cset contains unexpected command', e.id);
          }
        }

        return this.chain(curP, this.removeLock);
      }

      private checkReadset(rset: any[]) : rsvp.Promise {
        this._logger.debug('STORE', '%s: checkReadset(%d)', this.id(), rset.length);
        utils.dassert(rset.length !== 0);

        var fails = [];
        for (var i = 0; i < rset.length; i++) {
          fails.push(this.revisionCheck(rset[i].id, rset[i].rev));
        }
        return rsvp.all(fails);
      }

      private revisionCheck(id: utils.uid, revision: number) : rsvp.Promise {
        this._logger.debug('STORE', '%s: revisionCheck(%s,%s)', this.id(), id, revision);
        var that = this;
        var promise = new rsvp.Promise();

        this._collection.find({ _id: new bson.ObjectId(id.toString()), _rev: revision}).count(function (err, num) {
          if (err) {
            promise.reject(err.message);
          } else {
            if (num === 1)
              promise.resolve(null);
            else
              promise.resolve(id.toString());
          }
        });
        return promise;
      }

      private writeProp(chainP: rsvp.Promise, id:string, prop:string, value:any) : rsvp.Promise {
        var that = this;
        var p = new rsvp.Promise();
        chainP.then(function () {
          var bid = new bson.ObjectId(id);
          var upd = {};
          upd[prop] = value;
          that._collection.update({ _id: bid }, { $set: upd }, { safe: true }, function (err,count) {
            if (err) {
              that.fail(p, '%s: Update failed on %s[%s] %j error %s', that.id(), id, prop, value, err.message);
            } else {
              if (count !== 1) {
                that.fail(p, '%s: Update failed on %s[%s] %j count %d', that.id(), id, prop, value, count);
              } else {
                p.resolve();
              }
            }
          });
        });
        return p;
      }

      private lock(chainP : rsvp.Promise, timeout: number) : rsvp.Promise {
        var that = this;
        var p = new rsvp.Promise();
        chainP.then(function () {
          that._logger.debug('STORE', '%s: Trying to acquire lock', that.id());
          var bid = new bson.ObjectId(lockUID.toString());
          var rand = new bson.ObjectId().toString();
          that._collection.findAndModify({ _id: bid, locked: false }, [], 
            { _id: bid, owner: that.id().toString(), host: utils.hostInfo(), pid: process.pid, rand: rand, locked: true },
            { safe: true, upsert: false, remove: false, new: false }, function (err, doc) {
            if (err) {
              that.fail(p,'%s: Unable query lock : %s', that.id(), err.message);
            } else if (!doc) {

              // Report on current state
              if (timeout > CHECKRAND) {
                that._collection.findOne({ _id: bid }, function (err, doc) {
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
        
        var bid = new bson.ObjectId(lockUID.toString());
        that._collection.update({ _id: bid }, { _id: bid, locked: false }, 
          { safe: true, upsert: true}, function (err, update) {
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

      private refreshSet(failed: utils.uid[]): rsvp.Promise {
        var fails = [];
        for (var i = 0; i < failed.length; i++) {
          fails.push(this.getObject(failed[i]));
        }
        return rsvp.all(fails);
      }

      private getCollection() {
        var that = this;
        var done = new rsvp.Promise();

        // Shortcut if we have been here before
        if (that._collection!==null) {
          done.resolve(that._collection)
          return done;
        }

        // Open DB
        that._logger.debug('STORE', '%s: Connecting to database - %s', that.id(), that._dbName);
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
                  that.ensureExists(rootUID, { _rev: 0, _type: 'Object' }, done, collection);
                }, function (err) {
                  done.reject(err)
                });
              }
            });
          }
        });
        return done;
      }

      private ensureExists(id: utils.uid, proto: any, done: rsvp.Promise, arg: any) {
        var that = this;

        that._logger.debug('STORE', '%s: Checking/inserting for object: %s', that.id(), id);
        var bid = new bson.ObjectId(id.toString());
        proto._id = bid
        that._collection.findOne({ _id: bid }, function (err, doc) {
          if (err) {
            that.fail(done, '%s: Unable to search collection: %s : %s', that.id(), that._collectionName, err.message);
          } else if (doc === null) {
            that._collection.insert(proto, { safe: true }, function (err, inserted) {
              // Here err maybe be because of a race so we just log it
              if (err) {
                that._logger.debug('STORE', '%s: Unable to insert %s (ignoring as maybe race)', that.id(), id);
              } else {
                that._logger.debug('STORE', '%s: Object %s inserted', that.id(), id);
              }
              done.resolve(arg);
            });
          } else {
            that._logger.debug('STORE', '%s: Object %s already exists', that.id(), id);
            done.resolve(arg);
          }
        });
      }

      private getObject(id: utils.uid) : rsvp.Promise {
        var done = new rsvp.Promise();
        var that = this;

        this.getCollection().then(function (collection) {

          that._logger.debug('STORE', '%s: Searching for object: %s', that.id(), id);
          collection.findOne({ _id: new bson.ObjectId(id) }, function (err, doc) {
            if (err) {
              that.fail(done, '%s: Unable to search collection: %s : %s', that.id(), that._collectionName, err.message);
            } else {
              if (doc === null) {
                that.fail(done, '%s: Object missing in store: %s : %s', that.id(), id);
              } else {
                that._logger.debug('STORE', '%s: Loading object: %s:%d', that.id(), id,doc._rev);
                // Load the new object
                var obj = that._cache.find(id);
                var rec = that.readObject(doc, obj);

                // Reset tracking
                var t = tracker.getTrackerUnsafe(rec.obj);
                if (t === null) {
                  t = new tracker.Tracker(that, rec.obj, rec.id, rec.rev);
                  that._cache.insert(t.id(), rec.obj);
                } else {
                  t.setRev(rec.rev);
                  t.retrack(rec.obj);
                }

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

      private getRoot(): rsvp.Promise {
        var that = this;
        var done = new rsvp.Promise();
        
        if (that._root !== null) {
          done.resolve(that._root);
        } else {
          that.getObject(rootUID).then(function (obj) {
            that._root = obj;
            done.resolve(obj);
          }, function (err) {
            done.reject(err);
          });
        }

        return done;
      }

      private readObject(doc: any, proto?: any) {

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
        var dkeys = Object.keys(doc);
        var dk = 0;
        var pkeys = Object.keys(proto);
        var pk = 0;

        while (true) {
          // Run out?
          if (dk === dkeys.length)
            break;

          // Read prop name
          var prop = dkeys[dk];
          if (prop !== '_id' && prop !== '_rev' && prop !== '_type') {

            // Delete rest of proto props if does not match what is being read
            if (pk !== -1 && prop != pkeys[pk]) {
              for (var i = pk; i < pkeys.length; i++)
                delete proto[pkeys[i]];
              pk = -1;
            }

            // Update proto value
            proto[prop] = doc[dkeys[dk]];
          }
          dk++;
        }
        return { obj: proto, id: doc._id, rev: doc._rev };
      }

      private fail(promise, fmt: string, ...msgs: any[]) {
        var msg=this._logger.format('', fmt, msgs);
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

    }

  } // store
} // shared
