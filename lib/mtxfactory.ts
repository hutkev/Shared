// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />
/// <reference path='tracker.ts' />
/// <reference path='mtx.ts' />

module shared {
  export module mtx {

    export class ObjectCache {
      private _cache: utils.Map = new utils.Map(utils.hash);   // Cached objects

      public find(id: utils.uid): any {
        return this._cache.find(id.toString());
      }

      public insert(id: utils.uid, value:any): bool {
        return this._cache.insert(id.toString(),value);
      }

      public remove(id: utils.uid): bool {
        return this._cache.remove(id.toString());
      }
    }

    /*
     * A mtx consist of three parts: a readset, a new set and a set of changes
     * (cset). The readset contains obj->revision mappings which much be checked
     * prior to detect conflict. There must be at least one entry in the readset
     * and entries may not reference objects in the newset. The newset contains 
     * id->object mappings of new objects being introduced. The newset must be 
     * ordered to avoid non-existent references to other new objects.The change set 
     * contains a list of object change instructions, these may reference any
     * objects in the newset.
     *
     * The in-memory & on-the-wire format of a mtx differ in how objects are 
     * referenced (by id or directly). This can help improve local mtx commit 
     * performance but can be confusing.
     *
     * See TrackCache for more details.
     */
    export class mtxFactory implements tracker.TrackCache extends utils.UniqueObject {

      public disable: number = 0;
      
      private _mtx: MTX = new MTX();
      private _collected = false;

      constructor () {
        super();
      }

      /*
       * The current change set, only exposed to aid debugging.
       */
      cset(): any [] {
        return this._mtx.cset.array(); 
      }

      /*
       * Record object as been read
       */
      markRead(value: any) {
        var t = tracker.getTracker(value);
        utils.dassert(t.tc()===this);
        this._mtx.rset.insert(t.id(), t.rev());
      }

      /*
       * Readset access, only exposed to aid debugging
       */
      readsetSize() : number { 
        return this._mtx.rset.size();
      }

      readsetObject(id: utils.uid) : number { 
        return this._mtx.rset.find(id.toString())
      }

      /*
       * Newset access, only exposed to aid debugging
       */
      newsetSize() : number { 
        return this._mtx.nset.size();
      }

      newsetObject(id: utils.uid) : any { 
        var ent=this._mtx.nset.first(function (entry: any) {
          return entry.id.toString() === id.toString();
        });
        if (ent) return ent.obj;
        return null;
      }

      /*
       * Object change recording
       */
      addNew(obj: any, prop: string, value: any, lasttx: number): number {
        if (utils.isObjectOrArray(value))
          this.valueId(value);
        var v = value;
        if (typeof v === 'function') v = null;
        this._mtx.cset.push({obj:obj, write: prop, value: v, lasttx: lasttx});
        return this._mtx.cset.size() - 1;
      }

      addWrite(obj: any, prop: string, value: any, last: any, lasttx: number): number {
        if (utils.isObjectOrArray(value))
          this.valueId(value);
        var v = value;
        if (typeof v === 'function') v = null;
        this._mtx.cset.push({obj:obj, write: prop, value: v, last: last, lasttx: lasttx});
        return this._mtx.cset.size() - 1;
      }

      addDelete(obj: any, prop: string, lasttx: number): number {
        this._mtx.cset.push({obj:obj, del: prop, lasttx: lasttx});
        return this._mtx.cset.size() - 1;
      }

      addReverse(obj: any, lasttx: number): number {
        this._mtx.cset.push({obj:obj, reverse: true, lasttx: lasttx});
        return this._mtx.cset.size() - 1;
      }

      addSort(obj: any, lasttx: number): number {
        this._mtx.cset.push({ obj: obj, sort: true, lasttx: lasttx });
        return this._mtx.cset.size() - 1;
      }

      addShift(obj: any, at: number, size: number, lasttx: number): number {
        this._mtx.cset.push({ obj: obj, shift: at, size: size, lasttx: lasttx });
        return this._mtx.cset.size() - 1;
      }

      addUnshift(obj: any, at: number, size: number, lasttx: number): number {
        this._mtx.cset.push({ obj: obj, unshift: at, size: size, lasttx: lasttx });
        return this._mtx.cset.size() - 1;
      }

      /*
       * Utility to change a sort record with a reinit during post-processing
       */
      replaceSort(at: number, obj: any, values: string) {
        utils.dassert(this._mtx.cset.at(at).sort !== undefined);

        // Null out history
        var t = tracker.getTracker(obj);
        var dead = t.lastChange();
        while (dead !== -1) {
          var c = dead;
          dead = this._mtx.cset.at(dead).lasttx;
          this._mtx.cset.setAt(c, null);
        }

        // Insert re-init
        this._mtx.cset.push({ obj: obj, reinit: values, lasttx: -1 });
        t.setLastChange(this._mtx.cset.size() - 1);
      }

      /*
       * Return the mtx record of stored changes. 
       */
      mtx(cache: ObjectCache) : MTX {

        // We must collect over readset to build complete picture, but only once
        utils.dassert(this._collected === false);
        this._collected = true;
        this.collect(cache);

        // Return the formed mtx
        return this._mtx;
      }

      resetMtx(): void {
        // Restart with a new mtx
        this._mtx = new MTX();
        this._collected = false;
      }

      okMtx(store: ObjectCache): void {
        // Reset last change
        this._mtx.cset.apply(function (ci: ChangeItem) {
          if (ci !== null) {
            var t = tracker.getTracker(ci.obj);
            t.setLastChange(-1);
          }
        });

        this.resetMtx();
      }

      undoMtx(cache: ObjectCache): void {
        this.disable++;

        // We must collect over readset to build complete picture
        if (!this._collected)
          this.collect(cache);

        // Unwind the cset actions
        var i = this._mtx.cset.size() - 1;
        while (i >= 0) {
          var e = this._mtx.cset.at(i);
          if (e !== null) {
            var t = tracker.getTracker(e.obj);
            if (!t.isDead()) {

              // Try reverse if can
              if (e.write !== undefined) {
                if (e.last !== undefined) {
                  e.obj[e.write] = e.last;
                } else {
                  if (utils.isArray(e.obj))
                    e.obj.splice(parseInt(e.write), 1);
                  else
                    delete e.obj[e.write];
                }
              } else {
                // Conservatively kill everything else
                t.kill();
                cache.remove(t.id());
              }
            }
          }
          i--;
        }

        // Reset internal state
        var i = this._mtx.cset.size() - 1;
        while (i >= 0) {
          var e = this._mtx.cset.at(i);
          if (e !== null) {
            var t = tracker.getTracker(e.obj);
            t.downrev(e.obj);
          }
          i--;
        }

        this.resetMtx();
        this.disable--;
      }

      /*
       * Obtain an id for any object. If passed an untracked object an id 
       * will be assigned to it although the object will not be tracked. 
       * Objects that are already been tracked by a different cache cause
       * an exception.
       */
      valueId(value: any): utils.uid {
        utils.dassert(utils.isObjectOrArray(value));

        var t = tracker.getTrackerUnsafe(value);
        if (t === null) {
          if (value._pid === undefined) {
            // Recurse into props of new object
            var keys = Object.keys(value);
            for (var k = 0; k < keys.length; k++) {
              var key = keys[k];
              if (utils.isObjectOrArray(value[key])) {
                this.valueId(value[key]);
              }
            }

            // Record this as new object
            Object.defineProperty(value, '_pid', {
              value: utils.UID()
            });
            this._mtx.nset.push({ id: value._pid, obj: value });
          }
          return value._pid;
        } else {
          if (t.tc() !== this)
            utils.defaultLogger().fatal('Objects can not be used in multiple stores');
          return value._tracker.id();
        }
      }

      /*
       * Obtain version number for any objects. Untracked objects are assumed
       * to be version zero.
       */
      valueRev(value: any) : number {
        if (value._tracker === undefined) {
          return 0;
        } else {
          return value._tracker.rev();
        }
      }

      /*
       * Run post-processing over all object that have been read.
       */
      private collect(cache: ObjectCache) : void {
        // Collect over the readset
        var that = this;
        this._mtx.rset.apply(function (key, value) {
          var obj = cache.find(key);
          utils.dassert(obj != null);
          that.collectObject(obj);
          return true;
        });
      };

      /*
       * Run post-processing over a specific object, for debug proposes only
       */
      collectObject(obj: any) {
        utils.dassert(tracker.isTracked(obj));
        if (obj instanceof Array) {
          this.arrayChanges(obj);
        } else {
          this.objectChanges(obj);
        }
      }

      /*
       * Post-processing changes on an object
       */
      private objectChanges(obj) : void {
        var t = tracker.getTracker(obj);
        t.tc().disable++;

        // Loop old props to find any to delete
        var oldProps = utils.cloneArray(t.type().props());
        var newProps = Object.keys(obj);
        for (var i = 0; i < oldProps.length; i++) {
          if (!obj.hasOwnProperty(oldProps[i]) || !tracker.isPropTracked(obj, oldProps[i])) {
            t.addDelete(obj, oldProps[i]);
          } else {
            // Remove any old ones for next step
            var idx = newProps.indexOf(oldProps[i]);
            newProps[idx] = null;
          }
        }

        // Add any new props 
        for (var i = 0; i < newProps.length; i++) {
          if (newProps[i] !== null) {
            t.addNew(obj, newProps[i], obj[newProps[i]]);
            t.track(obj, newProps[i]);
          }
        }

        if (t.hasChanges())
          t.uprev(obj);
        t.tc().disable--;
      }

      /*
       * Post-processing changes on an array
       */
      private arrayChanges(obj) : void {
        var t = tracker.getTracker(obj);
        t.tc().disable++;

        // Sorted arrays are treated as being fully re-initialized as we 
        // can't track the impact of the sort. 

        // First we construct an array of the writes upto the last sort
        // if there was one
        var at = t.lastChange();
        var writeset = [];
        while (at !== -1) {
          if (this._mtx.cset.at(at).sort !== undefined) {
            // Replace sort by a re-init
            var v = serial.writeObject(t.tc(), obj, '');
            this.replaceSort(at, obj, v);
            t.uprev(obj);
            t.tc().disable--;
            return;  
          } else {
            writeset.unshift(this._mtx.cset.at(at));
          }
          at = this._mtx.cset.at(at).lasttx;
        }

        // Next we adjust the original props to account for how the array
        // has been shifted so we can detect new props and delete old ones
        // correctly.
        // REMEMBER the props maybe sparse but shift/unshift is abs
        var oldProps = utils.cloneArray(t.type().props());
        for (var i = 0; i < writeset.length; i++) {
          if (writeset[i].shift != undefined) {
            var at = writeset[i].shift;
            var size = writeset[i].size;

            var j = 0;
            while (true) {
              if (j === oldProps.length) break;
              var idx = +oldProps[j];
              if (idx >= at && idx < at + size) {
                oldProps.splice(j, 1);
              } else if (idx >= at + size) {
                oldProps[j] = (idx - size)+'';
                j++;
              } else {
                j++;
              }
            }

          } else if (writeset[i].unshift != undefined) {
            var at = writeset[i].unshift;
            var size = writeset[i].size;

            var j = 0;
            var inserted = false;
            while (true) {
              if (j === oldProps.length) break;
              var idx = +oldProps[j];
              if (!inserted) {
                if (idx >= at) {
                  for (var k = size - 1 ; k >= 0; k--)
                    oldProps.splice(j, 0, (at + k) + '')
                  inserted = true;
                  j += size;
                } else {
                  j ++;
                }
              } else {
                oldProps[j] = (idx + size) + '';
                j++;
              }
              
            }

            if (!inserted) {
              for (var k = 0 ; k < size; k++)
                oldProps.push((at+k)+'');
            } 
          }
        }

        // Pop oldProps that are bigger than current length
        var pop = 0;
        for (var i = oldProps.length-1; i >= 0; i--) {
          if (+oldProps[i] >= obj.length) {
            pop++;
          } else {
            break;
          }
        }
        if (pop > 0) {
          t.addShift(obj, -1, (+oldProps[oldProps.length - 1]) - obj.length +1);
          while (pop > 0) {
            oldProps.pop();
            pop--;
          }
        }

        // Write any old props that have been changed
        for (var i = 0; i < oldProps.length; i++) {
          if (!obj.hasOwnProperty(oldProps[i])) {
            t.addDelete(obj, oldProps[i]);
          } else if (!tracker.isPropTracked(obj, oldProps[i])) {
            t.addNew(obj, oldProps[i], obj[oldProps[i]]);
            t.track(obj, oldProps[i]);
          }
        }

        // Add new props
        var newProps = Object.keys(obj);
        for (var i = 0; i < newProps.length; i++) {
          var idx = oldProps.indexOf(newProps[i]);
          if (idx === -1) {
            t.addNew(obj, newProps[i], obj[newProps[i]]);
            t.track(obj, newProps[i]);
          }
        }

        if (t.hasChanges())
          t.uprev(obj);
        t.tc().disable--;
      }
    }

  } // mtx
} // shared
