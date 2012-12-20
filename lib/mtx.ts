// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />
/// <reference path='tracker.ts' />

module shared {
  export module mtx {

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

      private _rset : utils.Map;   // read set, id->rev map
      private _nset : utils.Queue; // new (id,obj) ordered, discovered during serial
      private _cset : utils.Queue; // change set, ordered list of changes

      constructor () {
        super();
        this._rset = new utils.Map(utils.hash);
        this._nset = new utils.Queue();
        this._cset = new utils.Queue();
      }

      /*
       * The current change set, only exposed to aid debugging.
       */
      cset(): any [] {
        return this._cset.array(); 
      }

      /*
       * Record object as been read
       */
      markRead(value: any) {
        var t = tracker.getTracker(value);
        utils.dassert(t.tc()===this);
        this._rset.insert(t.id(), t.rev());
      }

      /*
       * Readset access, only exposed to aid debugging
       */
      readsetSize() : number { 
        return this._rset.size();
      }

      readsetObject(id: utils.uid) : number { 
        return this._rset.find(id.toString())
      }

      /*
       * Newset access, only exposed to aid debugging
       */
      newsetSize() : number { 
        return this._nset.size();
      }

      newsetObject(id: utils.uid) : any { 
        var ent=this._nset.first(function (entry: any) {
          return entry.id.toString() === id.toString();
        });
        if (ent) return ent.obj;
        return null;
      }

      /*
       * Object change recording
       */
      addNew(obj: any, prop: string, value: any, lasttx: number): number {
        this._cset.push({obj:obj, write: prop, value: value, lasttx: lasttx});
        return this._cset.size() - 1;
      }

      addWrite(obj: any, prop: string, value: any, last: any, lasttx: number): number {
        this._cset.push({obj:obj, write: prop, value: value, last: last, lasttx: lasttx});
        return this._cset.size() - 1;
      }

      addDelete(obj: any, prop: string, lasttx: number): number {
        this._cset.push({obj:obj, del: prop, lasttx: lasttx});
        return this._cset.size() - 1;
      }

      addReverse(obj: any, lasttx: number): number {
        this._cset.push({obj:obj, reverse: true, lasttx: lasttx});
        return this._cset.size() - 1;
      }

      addSort(obj: any, lasttx: number): number {
        this._cset.push({ obj: obj, sort: true, lasttx: lasttx });
        return this._cset.size() - 1;
      }

      addShift(obj: any, lasttx: number): number {
        this._cset.push({ obj: obj, shift: true, lasttx: lasttx });
        return this._cset.size() - 1;
      }

      addUnshift(obj: any, size: number, lasttx: number): number {
        this._cset.push({ obj: obj, unshift: true, size: size, lasttx: lasttx });
        return this._cset.size() - 1;
      }

      /*
       * Utility to change a sort record with a reinit during post-processing
       */
      replaceSort(at: number, obj: any, values: string) {
        utils.dassert(this._cset.at(at).sort !== undefined);

        // Null out previous history
        var dead = this._cset.at(at).lasttx;
        while (dead !== -1) {
          var c = dead;
          dead = this._cset.at(dead).lasttx;
          this._cset.setAt(c, null);
        }

        // Replace the sort
        this._cset.setAt(at, { obj: obj, reinit: values, lasttx: -1 });
      }

      /*
       * Return a full mtx record for stored changes. You can call this
       * multiple times to get new change sets. Each time it is called 
       * the oject/array states are reset so that only changes since it
       * was last called are returned. 
       *
       * TODO: this whole thing is kludgy, needs better serial
       */
      mtx(store: utils.Map) : any[] {

        // We must collect over readset to build complete picture
        this.collect(store);

        // Serialise the rset
        var rset = [];
        this._rset.apply(function (key, value) {
          rset.push({ id:key, rev:value });
          return true;
        });

        // Serialise the nset, this happens late as new objects are not tracked
        var nset = [];
        var that = this;
        this._nset.apply(function (value) {
          nset.push({ id: value.id, value: serial.writeObject(that, value.obj) });
        });

        // Serialize cset
        var cset = [];
        for (var i = 0; i < this.cset().length; i++) {
          var e = this.cset()[i]
          if (e !== null) {
            var x = utils.flatClone(e);
            x.id = tracker.getTracker(e.obj).id();
            delete x.obj;
            delete x.last;
            delete x.lasttx;
            cset.push(x);
          }
        }

        // Form Mtx 
        var rec = [rset, nset, cset];
        if (rec[2].length === 0) {
          utils.defaultLogger().fatal('Empty cset!');
        }
        return rec;
      }

      /*
       * Return a local mtx record containing new objects. You can call this
       * multiple times to get new change sets. Each time it is called 
       * the oject/array states are reset so that only changes since it
       * was called are returned. 
       */
      localMtx(store: utils.Map) : any[] {

        // We must collect over readset to build complete picture
        this.collect(store);

        // We are just going to return the new object
        return this._nset.array();
      }

      resetMtx(): void {
        this._cset = new utils.Queue();;
        this._rset = new utils.Map(utils.hash);
        this._nset = new utils.Queue();
      }

      undoMtx(store: utils.Map, needCollect?: bool = true): void {
        //console.log('************ UNDO **************');
        this.disable++;

        // We must collect over readset to build complete picture
        if (needCollect)
          this.collect(store);

        // Unwind the cset actions
        var i = this._cset.size() - 1;
        while (i >= 0) {
          var e = this._cset.at(i);
          var t = tracker.getTracker(e.obj);

          if (e.write && e.last!==undefined) {
            //console.log('UNDOING');
            e.obj[e.write] = e.last;
          }

          i--;
        }

        // Reset internal state
        var i = this._cset.size() - 1;
        while (i >= 0) {
          var e = this._cset.at(i);
          var t = tracker.getTracker(e.obj);
          t.downrev(e.obj);
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
            this._nset.push({ id: value._pid, obj: value });
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
      private collect(store: utils.Map) : void {
        // Collect over the readset
        var that = this;
        this._rset.apply(function (key, value) {
          var rec = store.find(key);
          utils.dassert(rec != null);
          that.collectObject(rec.obj);
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
        var oldProps = utils.flatClone(t.type().props());
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
            var v = serial.writeValue(t.tc(),obj[newProps[i]], '');
            t.addNew(obj, newProps[i], v);
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
        var at = t._lastTx;
        var writeset = [];
        while (at !== -1) {
          if (this._cset.at(at).sort !== undefined) {
            // Replace sort be a re-init
            var v = serial.writeObject(t.tc(), obj, '');
            this.replaceSort(at, obj, v);
            break;  
          } else {
            writeset.unshift(this._cset.at(at));
          }
          at = this._cset.at(at).lasttx;
        }

        // Next we adjust the original props to account for how the array
        // has been shifted so we can detect new props and delete old ones
        // correctly.
        var oldProps = utils.flatClone(t.type().props());
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
            t.addDelete(obj, oldProps[i]);
          } else if (!tracker.isPropTracked(obj, oldProps[i])) {
            var v = serial.writeValue(t.tc(), obj[oldProps[i]], '');
            t.addNew(obj, oldProps[i], v);
            t.track(obj, oldProps[i]);
          }
        }

        // Add new props
        var newProps = Object.keys(obj);
        for (var i = 0; i < newProps.length; i++) {
          var idx = oldProps.indexOf(newProps[i]);
          if (idx == -1) {
            var v = serial.writeValue(t.tc(), obj[newProps[i]], '');
            t.addNew(obj, newProps[i], v);
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
