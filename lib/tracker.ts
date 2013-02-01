// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />
/// <reference path='utils.ts' />
/// <reference path='id.ts' />
/// <reference path='types.ts' />
/// <reference path='serial.ts' />

/*
 * Tracking provides a core service to enabling monitoring of how objects
 * an arrays are changed over some period. It has similar motives to the
 * proposed Object.observe model but is specifically designed to be 
 * node portable & suitable for distributed transactions.
 *
 * This code generates raw tracking logs. They need post-processing for
 * most use cases, see mtx.ts for code that does this in this case.
 */
module shared {
  export module tracker {

    var Buffer = require('buffer');

    /*
     * Tracker cache interface. Used to store change details that are 
     * generated when traversing/changing tracked objects & arrays. 
     * The concrete implementation is in mtx.ts.
     *
     * There is no handling of new objects here as they are discovered
     * after the fact when changes are examined. This is just the minimum
     * interface needs by the tracking code and its unit tests.
     */
    export interface TrackCache extends serial.ReferenceHandler {

      /*
       * If >0 then tracking should be disabled. This is only for 
       * internal code to make sure it is not creating false 
       * tracking data when manipulating the tracked objects/arrays.
       */
      disable: number; 

      /*
       * Mark an object as read during tracking. It is assumed the
       * object has a tracker that uses this TrackCache.
       */
      markRead(value: any) : void;

      /*
       * Record a modification on an object. The lasttx argument stores
       * a unique id for the previous modification. The id of the current
       * modification is returned for use on the next call. This makes it
       * easy to create linked lists of changes for a specific object to
       * aid post-processing speed.
       */
      addNew(obj: any, prop: string, value: any, lasttx: number) : number;
      addWrite(obj: any, prop: string, value: any, last: any, lasttx: number) : number;
      addDelete(obj: any, prop: string, lasttx: number): number;
      addReverse(obj: any, lasttx: number): number;
      addSort(obj: any, lasttx: number): number;
      addShift(obj: any, at:number, size:number, lasttx: number): number;
      addUnshift(obj: any, at:number, size:number, lasttx: number): number;
    }

    /*
     * Exception for indicating the cache is missing an object
     * needed for navigation.
     */
    export class UnknownReference {
      private _id: string;      // Id of containing object 
      private _prop: string;    // Name of property wit
      private _missing: any;    // Id of missing object

      constructor (id, prop, missing) {
        this._id = id;
        this._prop = prop;
        this._missing = missing;
      }

      id() {
        return this._id;
      }

      prop() {
        return this._prop;
      }

      missing() {
        return this._missing;
      }
    }

    /* 
     * Recover the tracker for an object/array, may return null
     */
    export function getTrackerUnsafe(value: any) : Tracker {
      if (value._tracker === undefined)
        return null;
      return value._tracker;
    }

    /* 
     * Recover the tracker for an object/array
     */
    export function getTracker(value: any) : Tracker {
      utils.dassert(utils.isObject(value._tracker));
      return value._tracker;
    }

    /* 
     * Test if object is tracked
     */
    export function isTracked(value: any) : bool {
      return utils.isObject(value._tracker);
    }

    /*
     * Object/Array tracker. Construct this over an object/array and it will
     * attach itself to that object/array as a non-enumerable '_tracker' property.
     * This is kind of odd, but saves doing object->tracker lookups. The downside
     * is to avoid a circular ref many tracker methods must be passed the objects 
     * they are tracking as this is not recorded in the tracker itself.
     *
     * The tracker wraps the enumerable properties of the object/array so that
     * it can log reads to other objects/arrays and any mutations. The log can
     * be accessed via changes().
     *
     * The mechanics here are messy so I have simply tried to write this as correct
     * rather than as quick & correct. A bit of extra thought can probably
     * improve the performance a lot.
     */
    export class Tracker {
      private _tc: TrackCache;
      private _id: utils.uid;
      private _rev;
      private _ref;
      private _type: types.TypeDesc;
      private _lastTx: number;
      private _userdata: any;

      constructor(tc: TrackCache, obj: any, id: utils.uid = utils.UID(), rev?: number) {
        utils.dassert(utils.isObject(tc));
        utils.dassert(utils.isUID(id));

        // Error check
        if (obj === null || typeof (obj) !== 'object')
          utils.defaultLogger().fatal('Trying to track non-object/array type');

        if (obj.hasOwnProperty('_tracker'))
          utils.defaultLogger().fatal('Trying to track already tracked object or array');

        // Init
        this._tc = tc;
        this._rev = rev || 0;
        this._id = id;
        this._lastTx = -1;
        this._id = id;
        this._type = types.TypeStore.instance().type(obj);
        this._userdata = null
        this._ref = 0;

        // Add tracker to object
        Object.defineProperty(obj, '_tracker', {
          value: this
        });

        // Start tracking
        if (obj instanceof Array) {
          trackArray(obj);
        }
        for (var prop in obj) {
          this.track(obj, prop);
        }
      }

      /*
       * When trackers die they lose connection to the cache. Normally
       * they die when changes to the object can not be undone and so 
       * the object needs to be refreshed from the master cache.
       */
      kill() {
        this._tc = null;
      }

      /*
       * Has this tracker/object combo died
       */
      isDead(): bool {
        return this._tc === null;
      }

      /**
       * Get the tracker cache this tracker is using
       */
      tc() : TrackCache {
        return this._tc;
      };

      /**
       * Get the unique object id
       */
      id() : utils.uid {
        return this._id;
      };

      /**
       * Get the objects (pre-changes) type
       */
      type() : types.TypeDesc {
        return this._type;
      };

      /**
       * Get/Increment the object revision, returning new value
       */
      rev(by?: number) : number {
        if (by !== undefined)
          this._rev += by;
        return this._rev;
      };

      /**
       * Set object rev to a value, must be >= to existing rev
       */
      setRev(to: number) : number {
        if (to >= this._rev) {
          this._rev = to;
        }
        return this._rev;
      };

      /**
       * Get/Increment the object revision, returning new value
       */
      ref(by?: number) : number {
        if (by !== undefined)
          this._ref += by;
        return this._ref;
      };

      /**
       * Set object rev to a value, must be >= to existing rev
       */
      setRef(to: number) : number {
        if (to >= this._ref) {
          this._ref = to;
        }
        return this._ref;
      };

      /*
       * Set a user supplied data object
       */
      setData(ud: any) {
        this._userdata = ud;
      }

      /*
       * Get a user supplied data object
       */
      getData() : any {
        return this._userdata;
      }

      /*
       * Has a change been recorded against the object
       */
      hasChanges() : bool {
        return (this._lastTx != -1);
      }

      /*
       * The index of the last recorded change in the mtx
       */
      lastChange(): number {
        return this._lastTx;
      }

      /*
       * Update the index of the last recorded change in the mtx
       */
      setLastChange(tx: number): void {
        this._lastTx = tx;
      }

      /**
       * Change notification handlers called to record changes
       */
      addNew(obj: any, prop: string, value: any) {
        utils.dassert(getTracker(obj) === this);
        this._lastTx = this.tc().addNew(obj, prop, value, this._lastTx);
      };

      addWrite(obj: any, prop: string, value: any, last: any) {
        utils.dassert(getTracker(obj) === this);
        this._lastTx = this.tc().addWrite(obj, prop, value, last, this._lastTx);
      };

      addDelete(obj: any, prop: string) { 
        utils.dassert(getTracker(obj) === this);
        this._lastTx = this.tc().addDelete(obj, prop, this._lastTx);
      }

      addReverse(obj: any) {
        utils.dassert(getTracker(obj) === this);
        this._lastTx = this.tc().addReverse(obj, this._lastTx);
      }

      addSort(obj: any) {
        utils.dassert(getTracker(obj) === this);
        this._lastTx = this.tc().addSort(obj, this._lastTx);
      }

      addShift(obj: any, at: number, size: number) {
        utils.dassert(getTracker(obj) === this);
        this._lastTx = this.tc().addShift(obj, at, size, this._lastTx);
      }

      addUnshift(obj: any, at:number, size: number) {
        utils.dassert(getTracker(obj) === this);
        this._lastTx = this.tc().addUnshift(obj, at, size, this._lastTx);
      }

      /*
       * Make sure all properties are being tracked
       */
      retrack(obj: any) {
        utils.dassert(getTracker(obj) === this);
        for (var prop in obj) {
          if (!isPropTracked(obj, prop)) {
            this.track(obj, prop);
          }
        }
        this._type = types.TypeStore.instance().type(obj);
      }

      /**
       * Wrap a property for get/set tracking
       */
      track(obj: any, prop: string) : void {
        utils.dassert(getTracker(obj) === this);
        if (obj.hasOwnProperty(prop)) {
          var value = obj[prop];
          if (delete obj[prop]) {
            wrapProp(obj, prop, value);
          } else {
            throw new Error('Unwrappable property found: ' + prop);
          }
        }
      }

      /**
       * Uprev an object recording new properties
       */
      uprev(obj) {
        utils.dassert(getTracker(obj) === this);
        this._rev += 1;
        this._type = types.TypeStore.instance().type(obj);
      }

      /**
       * Down rev (undo) an object recording new properties
       */
      downrev(obj) {
        utils.dassert(getTracker(obj) === this);
        if (this._lastTx !== -1) {
          this._lastTx = -1;
          this._rev -= 1;
          this._type = types.TypeStore.instance().type(obj);
        }
      }
    }

    /*
     * Utility methods that aid the tracker.
     */
    function lexSort(a, b) {
      var astr = a.toString();
      var bstr = b.toString();
      if (astr < bstr) return -1;
      if (astr > bstr) return 1;
      return 0;
    }

    function trackArray(arr) {
      Object.defineProperty(arr, 'shift', {
        enumerable: false,
        configurable: false,
        value: function () {
          var t = getTracker(arr);
          if (t.tc().disable === 0) {
            t.tc().disable++;

            // Shift will 'untrack' our props so we have to record what
            // is currently being tracked and reapply this after the shift
            // Sad I know, but just how it works.
            var k = Object.keys(arr);
            var tracked = [];
            k.forEach(function (e, i, a) {
              tracked.push(isPropTracked(arr, a[i]));
            });

            // Record & perform the shift
            if (arr.length > 0) {
              t.addShift(arr,0,1);
            }
            var r = Array.prototype.shift.apply(arr, arguments);

            // Restore tracking
            var k = Object.keys(arr);
            for (var i = 0; i < arr.length; i++) {
              var key = k[i];
              if (tracked[i + 1] && !isPropTracked(arr, key))
                t.track(arr, key);
            }

            t.tc().disable--;
            return r;
          } else {
            return Array.prototype.shift.apply(arr, arguments);
          }
        } 
      });

      Object.defineProperty(arr, 'unshift', {
        enumerable: false,
        configurable: false,
        value: function () {
          var t = getTracker(arr);
          if (t.tc().disable === 0) {
            t.tc().disable++;

            // Cache which props are tracked
            var k = Object.keys(arr);
            var tracked = [];
            k.forEach(function (e, i, a) {
              tracked.push(isPropTracked(arr, a[i]));
            });

            // Record the unshift
            if (arguments.length > 0) {
              t.addUnshift(arr, 0, arguments.length);
            }
            var r = Array.prototype.unshift.apply(arr, arguments);

            // Record writes of new data
            for (var i = 0; i < arguments.length; i++) {
              t.track(arr, i + '');
              t.addNew(arr, i + '', arr[i]);
            }

            // Restore our tracking
            var k = Object.keys(arr);
            for (; i < arr.length; i++) {
              var key = k[i];
              if (tracked[i - arguments.length] && !isPropTracked(arr, key))
                t.track(arr, key);
            }

            t.tc().disable--;
            return r;
          } else {
            return Array.prototype.unshift.apply(arr, arguments);
          }
        }
      });

      Object.defineProperty(arr, 'reverse', {
        enumerable: false,
        configurable: false,
        value: function () {
          var t = getTracker(arr);
          if (t.tc().disable === 0) {
            t.tc().disable++;

            // Reverse keeps the tracking but does not reverse it leading
            // to lots of confusion, another hack required
            var k = Object.keys(arr);
            var tracked = [];
            k.forEach(function (e, i, a) {
              tracked.push(isPropTracked(arr, a[i]));
            });
            tracked.reverse();

            // Record & perform the reverse
            t.addReverse(arr);
            var r = Array.prototype.reverse.apply(arr, arguments);

            // Recover tracking state
            var k = Object.keys(r);
            for (var i = 0; i < k.length; i++) {
              var key = k[i];
              var trckd = isPropTracked(arr, key);
              if (tracked[i] && !trckd) {
                t.track(arr, key);
              } else if (!tracked[i] && trckd) {
                unTrack(arr, key);
              }
            }

            t.tc().disable--;
            return r;
          } else {
            return Array.prototype.reverse.apply(arr, arguments);
          }
        } 
      });

      Object.defineProperty(arr, 'sort', {
        enumerable: false,
        configurable: false,
        value: function () {
          var t = getTracker(arr);
          if (t.tc().disable === 0) {
            t.tc().disable++;

            // Now we are in trouble, sort is like reverse, it leaves tracking
            // at the pre-sort positions and we need to correct this by sorting
            // over a wrapper array and then storing the results.
            var k = Object.keys(arr);
            var pairs = [];
            k.forEach(function (e, i, a) {
              pairs.push({ elem: arr[a[i]], track: isPropTracked(arr, a[i]) });
            });

            // Run the sort
            var sortfn = arguments[0];
            if (sortfn === undefined)
              sortfn = lexSort;

            var wrapFn = function (a, b) {
              var r = sortfn(a.elem, b.elem);
              return r;
            };
            Array.prototype.sort.apply(pairs, [wrapFn]);

            // Apply results
            for (var i = 0; i < pairs.length; i++) {
              var key = k[i];
              arr[key] = pairs[i].elem;
              var trckd = isPropTracked(arr, key);
              if (pairs[i].track && !trckd) {
                t.track(arr, key);
              } else if (!pairs[i].track && trckd) {
                unTrack(arr, key);
              }
            }

            // Best record it after all that
            t.addSort(arr);
            t.tc().disable--;
            return arr;
          } else {
            Array.prototype.sort.apply(pairs, [wrapFn]);
          }
        }
      });

      Object.defineProperty(arr, 'splice', {

        enumerable: false,
        configurable: false,
        value: function () {
          var t = getTracker(arr);
          if (t.tc().disable === 0) {
            t.tc().disable++;

            // ES5 15.4.4.12 + Moz extension (What a mess!)
            var len = arr.length;
            var relStart = utils.toInteger(arguments[0]);
            var actStart;
            if (relStart < 0) 
              actStart = Math.max((len + relStart), 0);
            else
              actStart = Math.min(relStart, len);
            var actDelCount = len - actStart;
            if (arguments[1] !== undefined)
              actDelCount = Math.min(Math.max(utils.toInteger(arguments[1]), 0), len - actStart);
            var insCount = Math.max(arguments.length-2,0);

            // Splice leaves tracking where it was and does not adjust so we have to 
            // correct manually as usual but remebering about sparse arrays
            var k = Object.keys(arr);
            var tracked = [];
            k.forEach(function (e, i, a) {
              tracked.push(isPropTracked(arr, a[i]));
            });

            var r = Array.prototype.splice.apply(arr, arguments);

            // Now recover correct tracking state & record changes
            //var k = Object.keys(r);
            for (var i = 0; i < k.length; i++) {
              var key = +k[i];
              if (key < actStart || key >= actStart + actDelCount) {
                if (key >= actStart) {
                  key += (insCount - actDelCount);
                }
                var skey = key + '';

                var trckd = isPropTracked(arr, skey);
                if (tracked[i] && !trckd) {
                  t.track(arr, skey);
                } else if (!tracked[i] && trckd) {
                  unTrack(arr, skey);
                }
              } 
            }

            // Anything inserted should not be tracked
            for (var i = actStart; i < actStart + insCount; i++) {
              if (arr[i] !== undefined)
                unTrack(arr, i + '');
            }

            if (actDelCount>0)
              t.addShift(arr, actStart, actDelCount);
            if (insCount>0)
              t.addUnshift(arr, actStart, insCount);

            t.tc().disable--;
            return r;
          } else {
            return Array.prototype.splice.apply(arr, arguments);
          }
        }
      });
    }

    function wrapProp(obj: any, prop: string, value: any): void {
      var tracker = getTracker(obj);

      Object.defineProperty(obj, prop, {
        enumerable: true,
        configurable: true,
        get: function () {
          if (tracker.tc().disable === 0) {
            if (value !== null && typeof value === 'object') {
              if (value instanceof serial.Reference) {
                var ref: serial.Reference = value;
                throw new UnknownReference(tracker.id(), prop, ref.id());
              }
              var t = getTrackerUnsafe(value);
              if (t!==null) {
                if (t.isDead()) {
                  throw new UnknownReference(tracker.id(), prop, t.id());
                } else {
                  tracker.tc().markRead(value);
                }
              }
            }
          }
          return value;
        },
        set: function (setValue) {
          if (tracker.tc().disable === 0) {
            tracker.tc().disable++;
            tracker.addWrite(obj, prop, setValue, value);
            tracker.tc().disable--;
          }
          value = setValue;
        }
      });
    }

    // TODO: Is this the best/only option?
    export function isPropTracked(obj: any, prop: string) : bool {
      var desc = Object.getOwnPropertyDescriptor(obj, prop);
      return (desc.get != undefined && desc.set != undefined);
    }

    function unTrack(obj: any, prop: string) {
      var desc = Object.getOwnPropertyDescriptor(obj, prop);
      if (desc.get != undefined && desc.set != undefined) {
        var v = obj[prop];
        Object.defineProperty(obj, prop, {
          value: v
        });
      }
    }

  } // tracker
} //shared
