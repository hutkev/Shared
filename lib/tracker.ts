// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />
/// <reference path='utils.ts' />
/// <reference path='id.ts' />
/// <reference path='types.ts' />
/// <reference path='serial.ts' />

module shared {
  export module tracker {

    export interface TrackCache extends serial.ReferenceHandler {
      disable: number;

      cset(): any;
      nset(): any;
      rset(): any;
    }

    export class UnknownReference {
      private _id: string;
      private _prop: string;
      private _missing: any;    // TODO: What is this?

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
     * Object/Array tracker. Construct this over an object/array and it will
     * attach itself to that object/array as a non-enumerable '_tracker' property.
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
      private _type: types.TypeDesc;
      public _lastTx: number;

      constructor(tc: TrackCache, obj: any, id: utils.uid = utils.UID(), rev?: number) {
        utils.dassert(utils.isUID(id));

        this._tc = tc;
        this._rev = rev || 0;
        this._id = id;
        this._lastTx = -1;
        this._id = id;

        if (obj === null || typeof (obj) !== 'object')
          utils.defaultLogger().fatal('Trying to track non-object/array type');

        if (obj.hasOwnProperty('_tracker'))
          utils.defaultLogger().fatal('Trying to track already tracked object or array');

        this._type = types.TypeStore.instance().type(obj);

        if (obj instanceof Array) {
          trackArray(obj);
        }

        Object.defineProperty(obj, '_tracker', {
          value: this
        });

        for (var prop in obj) {
          track(obj, prop);
        }
      }

      /**
       * Get the tracker cache this belong to
       */
      tc () : TrackCache {
        return this._tc;
      };

      /**
       * Get the unique object id
       */
      id () : utils.uid {
        return this._id;
      };

      /**
       * Get the objects (pre-change) type
       */
      type () : types.TypeDesc {
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
       * Collect chnages into underlying structures
       */
      collect (obj:any) : void {
        utils.dassert(obj._tracker === this);
        var t = this;

        if (obj instanceof Array) {
          arrayChanges(obj);
        } else {
          objectChanges(obj);
        }
      };
    }

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
          var t : Tracker = arr._tracker;
          t.tc().disable++;

          // Shift will 'untrack' our props so we have to record what
          // is currently being tracked and reapply this after the shift
          // Sad I know, but just how it works.
          var k = Object.keys(arr);
          var tracked = [];
          k.forEach(function (e, i, a) {
            tracked.push(isTracked(arr, a[i]));
          });

          // Record & perform the shift
          if (arr.length > 0) {
            t.tc().cset().push({ obj: arr, shift: true, lasttx: t._lastTx });
            t._lastTx = t.tc().cset().length - 1;
          }
          var r = Array.prototype.shift.apply(arr, arguments);

          // Restore tracking
          var k = Object.keys(arr);
          for (var i = 0; i < arr.length; i++) {
            var key = k[i];
            if (tracked[i + 1] && !isTracked(arr, key))
              track(arr, key);
          }

          t.tc().disable--;
          return r;
        }
      });

      Object.defineProperty(arr, 'unshift', {
        enumerable: false,
        configurable: false,
        value: function () {
          var t = arr._tracker;
          t.tc().disable++;

          // Cache which props are tracked
          var k = Object.keys(arr);
          var tracked = [];
          k.forEach(function (e, i, a) {
            tracked.push(isTracked(arr, a[i]));
          });

          // Record the unshift
          if (arguments.length > 0) {
            t.tc().cset().push({
              obj: arr, unshift: true, size: arguments.length,
              lasttx: t._lastTx
            });
            t._lastTx = t.tc().cset().length - 1;
          }
          var r = Array.prototype.unshift.apply(arr, arguments);

          // Record writes of new data
          for (var i = 0; i < arguments.length; i++) {
            track(arr, i + '');
            var v = serial.writeValue(t.tc(), arr[i], '');
            t.tc().cset().push({
              obj: arr, write: i + '', value: v,
              lasttx: t._lastTx
            });
            t._lastTx = t.tc().cset().length - 1;
          }

          // Restore our tracking
          var k = Object.keys(arr);
          for (; i < arr.length; i++) {
            var key = k[i];
            if (tracked[i - arguments.length] && !isTracked(arr, key))
              track(arr, key);
          }

          t.tc().disable--;
          return r;
        }
      });

      Object.defineProperty(arr, 'reverse', {
        enumerable: false,
        configurable: false,
        value: function () {
          var t = arr._tracker;
          t.tc().disable++;

          // Reverse keeps the tracking but does not reverse it leading
          // to lots of confusion, another hack required
          var k = Object.keys(arr);
          var tracked = [];
          k.forEach(function (e, i, a) {
            tracked.push(isTracked(arr, a[i]));
          });
          tracked.reverse();

          // Record & perform the reverse
          t.tc().cset().push({ obj: arr, reverse: true, lasttx: t._lastTx });
          t._lastTx = t.tc().cset().length - 1;
          var r = Array.prototype.reverse.apply(arr, arguments);

          // Recover tracking state
          var k = Object.keys(arr);
          for (var i = 0; i < arr.length; i++) {
            var key = k[i];
            var trckd = isTracked(arr, key);
            if (tracked[i] && !trckd) {
              track(arr, key);
            } else if (!tracked[i] && trckd) {
              unTrack(arr, key);
            }
          }

          t.tc().disable--;
          return r;
        }
      });

      Object.defineProperty(arr, 'sort', {
        enumerable: false,
        configurable: false,
        value: function () {
          var t = arr._tracker;
          t.tc().disable++;

          // Now we are in trouble, sort is like reverse, it leaves tracking
          // at the pre-sort positions and we need to correct this by sorting
          // over a wrapper array and then storing the results.
          var k = Object.keys(arr);
          var pairs = [];
          k.forEach(function (e, i, a) {
            pairs.push({ elem: arr[a[i]], track: isTracked(arr, a[i]) });
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
            var trckd = isTracked(arr, key);
            if (pairs[i].track && !trckd) {
              track(arr, key);
            } else if (!pairs[i].track && trckd) {
              unTrack(arr, key);
            }
          }

          // Best record it after all that
          t.tc().cset().push({ obj: arr, sort: true, lasttx: t._lastTx });
          t._lastTx = t.tc().cset().length - 1;

          t.tc().disable--;
          return arr;
        }
      });

      Object.defineProperty(arr, 'splice', {
        enumerable: false,
        configurable: false,
        value: function () {
          throw new Error('splice: TODO');
        }
      });
    }

    function track(obj, prop) {
      if (obj.hasOwnProperty(prop)) {
        var value = obj[prop];
        if (delete obj[prop]) {
          wrapProp(obj, prop, value, obj._tracker);
        } else {
          throw new Error('Unwrappable property found: ' + prop);
        }
      }
    }

    // TODO: Should these use _tracker ?
    function wrapProp(obj: any, prop: string, value: any, tracker: Tracker): void {
      Object.defineProperty(obj, prop, {
        enumerable: true,
        configurable: true,
        get: function () {
          if (tracker.tc().disable === 0) {
            if (value !== null && typeof value === 'object') {
              if (value instanceof serial.Reference) {
                throw new UnknownReference(tracker.id(), prop, tracker.id());
              }
              tracker.tc().rset()[value._tracker._id] = value._tracker._rev;
            }
          }
          return value;
        },
        set: function (setValue) {
          if (tracker.tc().disable === 0) {
            tracker.tc().disable++;
            var newVal = serial.writeValue(tracker.tc(), setValue, '');
            tracker.tc().cset().push({ obj: obj, write: prop, value: newVal, lasttx: tracker._lastTx });
            tracker._lastTx = tracker.tc().cset().length - 1;
            tracker.tc().disable--;
          }
          value = setValue;
        }
      });
    }

    function isTracked(obj: any, prop: string) {
      var desc = Object.getOwnPropertyDescriptor(obj, prop);
      return (desc.get != undefined && desc.set != undefined);
    }

    function unTrack(obj, prop) {
      var desc = Object.getOwnPropertyDescriptor(obj, prop);
      if (desc.get != undefined && desc.set != undefined) {
        var v = obj[prop];
        Object.defineProperty(obj, prop, {
          value: v
        });
      }
    }

    function objectChanges(obj) {
      var t = obj._tracker;
      t.tc().disable++;

      var at = t._lastTx;
      var readset = [];
      var writeset = [];
      while (at !== -1) {
        if (t.tc().cset()[at].read !== undefined) {
          var val = obj[t.tc().cset()[at].read];
          if (val !== null && typeof (val) === 'object') {
            readset.unshift(val);
          }
        } else {
          writeset.unshift(t.tc().cset()[at]);
        }
        at = t.tc().cset()[at].lasttx;
      }

      var oldProps = utils.flatClone(t._type.props());
      var newProps = Object.keys(obj);
      for (var i = 0; i < oldProps.length; i++) {
        if (!obj.hasOwnProperty(oldProps[i]) || !isTracked(obj, oldProps[i])) {
          var r: any = { obj: obj, del: oldProps[i], lasttx: t._lastTx };
          t.tc().cset().push(r);
          writeset.push(r);
          t._lastTx = t.tc().cset().length - 1;
        } else {
          var idx = newProps.indexOf(oldProps[i]);
          newProps[idx] = null;
        }
      }

      for (var i = 0; i < newProps.length; i++) {
        if (newProps[i] !== null) {
          var v = serial.writeValue(t.tc(),obj[newProps[i]], '');
          var r: any = { obj: obj, write: newProps[i], value: v, lasttx: t._lastTx };
          t.tc().cset().push(r);
          writeset.push(r);
          t._lastTx = t.tc().cset().length - 1;
        }
      }

      t.tc().disable--;
    }

    function arrayChanges(obj) {
      var t = obj._tracker;
      t.tc().disable++;

      var at = t._lastTx;
      var sorted = false;
      var readset = [];
      var writeset = [];

      // Build read & write sets
      while (at !== -1) {
        if (t.tc().cset()[at].read !== undefined) {
          var val = obj[t.tc().cset()[at].read];
          if (val !== null && typeof (val) === 'object') {
            readset.unshift(val);
          }
        } else if (sorted == false) {
          if (t.tc().cset()[at].sort !== undefined) {
            var dead = t.tc().cset()[at].lasttx;
            var v = serial.writeObject(t.tc(), obj, '');
            var r: any = { obj: obj, reinit: v, lasttx: -1 };
            t.tc().cset()[at] = r;
            writeset.unshift(r);

            // Tidy up anything pre-sort
            while (dead !== -1) {
              var c = dead;
              dead = t.tc().cset()[dead].lasttx;
              t.tc().cset()[c] = null;
            }
            sorted = true;
          } else {
            writeset.unshift(t.tc().cset()[at]);
          }
        }
        at = t.tc().cset()[at].lasttx;
      }

      // Adjust old props for shifty shifting
      var oldProps = utils.flatClone(t._type.props());
      for (var i = 0; i < writeset.length; i++) {
        if (writeset[i].shift != undefined) {
          if (oldProps[0] == '0')
            oldProps.shift();
          for (var j = 0; j < oldProps.length; j++) {
            var idx = parseInt(oldProps[j]);
            if (idx > 0)
              oldProps[j] = idx - 1 + '';
          }
        } else if (writeset[i].unshift != undefined) {
          for (var j = 0; j < writeset[i].size; j++) {
            oldProps.unshift((writeset[i].size - 1 - j) + '');
          }
          for (var j = writeset[i].size; j < oldProps.length; j++) {
            var idx = parseInt(oldProps[j]);
            if (idx >= 0)
              oldProps[j] = idx + writeset[i].size + '';
          }
        }
      }

      // Delete any old props that don't exist anymore or write any that
      // have been changed
      for (var i = 0; i < oldProps.length; i++) {
        if (!obj.hasOwnProperty(oldProps[i])) {
          var r: any = { obj: obj, del: oldProps[i], lasttx: t._lastTx };
          t.tc().cset().push(r);
          writeset.push(r);
          t._lastTx = t.tc().cset().length - 1;
        } else if (!isTracked(obj, oldProps[i])) {
          var v = serial.writeValue(t.tc(), obj[oldProps[i]], '');
          var r: any = { obj: obj, write: oldProps[i], value: v, lasttx: t._lastTx };
          t.tc().cset().push(r);
          writeset.push(r);
          t._lastTx = t.tc().cset().length - 1;
          track(obj, oldProps[i]);
        }
      }

      // Add new props
      var newProps = Object.keys(obj);
      for (var i = 0; i < newProps.length; i++) {
        var idx = oldProps.indexOf(newProps[i]);
        if (idx == -1) {
          var v = serial.writeValue(t.tc(), obj[newProps[i]], '');
          var r = { obj: obj, write: newProps[i], value: v, lasttx: t._lastTx };
          t.tc().cset().push(r);
          writeset.push(r);
          t._lastTx = t.tc().cset().length - 1;
          track(obj, newProps[i]);
        }
      }

      t.tc().disable--;
    }

  } // tracker
} //shared
