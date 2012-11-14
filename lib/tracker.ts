//     tracker.js
//     (c) 2012 Kevin Jones
//     This file may be freely distributed under the MIT license.

/// <reference path='../defs/node-0.8.d.ts' />

import modtype = module('types');
var types = modtype.typeStore;
var Reference = modtype.Reference;
var UnknownReference = modtype.UnknownReference;

var uuid = require('node-uuid');

var uuidStr = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-' +
  '[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
var uuidPat = new RegExp(uuidStr);

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
export function Tracker(obj:any, id?:string, rev?:number) {

  if (!(this instanceof Tracker)) {
    return new Tracker(obj, id, rev);
  }
 
  if (Tracker.prototype.disable === undefined) {
    Tracker.prototype.disable = 0;
    Tracker.prototype.cset = [];
    Tracker.prototype.rset = {};
    Tracker.prototype.nset = {};
  }

  this._rev = rev || 0;
  this._id = id;
  this._lastTx = -1;

  if (obj === null || typeof(obj) !== 'object')
    throw new Error('Trying to track non-object/array type');

  if (obj.hasOwnProperty('_tracker'))
    throw new Error('Trying to track already tracked object or array');

  if (this._id === undefined) {
    this._id = uuid.v1();
  } else if (!uuidPat.test(this._id)) {
    throw new Error('Invalid UUID passed as an id');
  }

  this._type = types.type(obj);

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
 * Get the unique object id
 * @return {string} A uuid for the object.
 */
Tracker.prototype.id = function() {
  return this._id;
};

/**
 * Get/Increment the object revision
 * @param {number} by Optional increment to the revision.
 * @return {number} The current revision.
 */
Tracker.prototype.rev = function(by) {
  if (by !== undefined)
    this._rev += by;
  return this._rev;
};

/**
 * Collect chnages into underlying structures
 * @param {number} obj The object to collect changes for.
 */
Tracker.prototype.collect = function(obj) {
  var t = this;
  if (obj._tracker != this) {
    throw new Error('Object/tracker mismatch');
  }

  if (obj instanceof Array) {
     arrayChanges(obj);
  } else {
     objectChanges(obj);
  }
};

/**
 * Object tracker
 */
exports.Tracker = Tracker;

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
    value: function() {
      var t = arr._tracker;
      Tracker.prototype.disable++;

      // Shift will 'untrack' our props so we have to record what
      // is currently being tracked and reapply this after the shift
      // Sad I know, but just how it works.
      var k = Object.keys(arr);
      var tracked = [];
        k.forEach(function(e, i, a) {
          tracked.push(isTracked(arr, a[i]));
      });

      // Record & perform the shift
      if (arr.length > 0) {
        Tracker.prototype.cset.push({obj: arr, shift: true, lasttx: t._lastTx});
        t._lastTx = Tracker.prototype.cset.length - 1;
      }
      var r = Array.prototype.shift.apply(arr, arguments);

      // Restore tracking
      var k = Object.keys(arr);
      for (var i = 0; i < arr.length; i++) {
        var key = k[i];
        if (tracked[i + 1] && !isTracked(arr, key))
          track(arr, key);
      }

      Tracker.prototype.disable--;
      return r;
    }
  });

  Object.defineProperty(arr, 'unshift', {
    enumerable: false,
    configurable: false,
    value: function() {
      var t = arr._tracker;
      Tracker.prototype.disable++;

      // Cache which props are tracked
      var k = Object.keys(arr);
      var tracked = [];
      k.forEach(function(e, i, a) {
        tracked.push(isTracked(arr, a[i]));
      });

      // Record the unshift
      if (arguments.length > 0) {
        Tracker.prototype.cset.push({obj: arr, unshift: true, size: arguments.length,
          lasttx: t._lastTx});
        t._lastTx = Tracker.prototype.cset.length - 1;
      }
      var r = Array.prototype.unshift.apply(arr, arguments);

      // Record writes of new data
      for (var i = 0; i < arguments.length; i++) {
        track(arr, i + '');
        var v = newValue(arr[i], '');
        Tracker.prototype.cset.push({obj: arr, write: i + '', value: v,
          lasttx: t._lastTx});
        t._lastTx = Tracker.prototype.cset.length - 1;
      }

      // Restore our tracking
      var k = Object.keys(arr);
      for (; i < arr.length; i++) {
        var key = k[i];
        if (tracked[i - arguments.length] && !isTracked(arr, key))
          track(arr, key);
      }

      Tracker.prototype.disable--;
      return r;
    }
  });

  Object.defineProperty(arr, 'reverse', {
    enumerable: false,
    configurable: false,
    value: function() {
      var t = arr._tracker;
      Tracker.prototype.disable++;

      // Reverse keeps the tracking but does not reverse it leading
      // to lots of confusion, another hack required
      var k = Object.keys(arr);
      var tracked = [];
      k.forEach(function(e, i, a) {
        tracked.push(isTracked(arr, a[i]));
      });
      tracked.reverse();

      // Record & perform the reverse
      Tracker.prototype.cset.push({obj: arr, reverse: true, lasttx: t._lastTx});
      t._lastTx = Tracker.prototype.cset.length - 1;
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

      Tracker.prototype.disable--;
      return r;
    }
  });

  Object.defineProperty(arr, 'sort', {
    enumerable: false,
    configurable: false,
    value: function() {
      var t = arr._tracker;
      Tracker.prototype.disable++;

      // Now we are in trouble, sort is like reverse, it leaves tracking
      // at the pre-sort positions and we need to correct this by sorting
      // over a wrapper array and then storing the results.
      var k = Object.keys(arr);
      var pairs = [];
      k.forEach(function(e, i, a) {
        pairs.push({elem: arr[a[i]], track: isTracked(arr, a[i])});
      });

      // Run the sort
      var sortfn = arguments[0];
      if (sortfn === undefined)
          sortfn = lexSort;

      var wrapFn = function(a, b) {
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
      Tracker.prototype.cset.push({obj: arr, sort: true, lasttx: t._lastTx});
      t._lastTx = Tracker.prototype.cset.length - 1;

      Tracker.prototype.disable--;
      return arr;
    }
  });

  Object.defineProperty(arr, 'splice', {
    enumerable: false,
    configurable: false,
    value: function() {
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

function wrapProp(obj: any, prop: string, value: any, tracker: any): void {
  Object.defineProperty(obj, prop, {
    enumerable: true,
    configurable: true,
    get: function () {
      if (Tracker.prototype.disable === 0) {
        if (value !== null && typeof value === 'object') {
          if (value instanceof Reference) {
            throw new UnknownReference(tracker._id, prop, tracker.id());
          }
          Tracker.prototype.rset[value._tracker._id] = value._tracker._rev;
        }
      }
      return value;
    },
    set: function (setValue) {
      if (Tracker.prototype.disable === 0) {
        Tracker.prototype.disable++;
        var newVal = newValue(setValue, '');
        Tracker.prototype.cset.push({ obj: obj, write: prop, value: newVal, lasttx: tracker._lastTx });
        tracker._lastTx = Tracker.prototype.cset.length - 1;
        Tracker.prototype.disable--;
      }
      value = setValue;
    }
  });
}

function isTracked(obj:any, prop:string) {
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

function newValuePrim(val, str) {
  if (val === null) {
    str += 'null';
    return str;
  }

  if (val === undefined) {
    str += 'undefined';
    return str;
  }

  switch (typeof val) {
    case 'number':
    case 'boolean':
      str += val.toString();
      break;
    case 'string':
      str += "'" + val.toString() + "'";
      break;
  }
  return str;
}

function newValueProps(obj, str) {
  if (obj instanceof Array) {
    str += '[';
  } else {
    str += '{';
  }

  var k = Object.keys(obj);
  for (var i = 0; i < k.length; i++) {
    str += "'" + k[i] + "':";
    if (obj[k[i]] !== null && typeof obj[k[i]] == 'object') {
      str = newValue(obj[k[i]], str);
    } else {
      str = newValuePrim(obj[k[i]], str);
    }
    if (i < k.length - 1)
      str += ',';
  }

  if (obj instanceof Array) {
    str += ']';
  } else {
    str += '}';
  }
  return str;
}

function newValue(val:any, str:string) :string {
  if (val !== null && typeof val === 'object') {
    if (val._tracker !== undefined) {
      str += '<' + val._tracker._id + '>';
      return str;
    }

    var t = new Tracker(val);
    str += '<' + val._tracker._id + '>';
    Tracker.prototype.nset[val._tracker._id] = newValueProps(val, '');
  } else {
    str = newValuePrim(val, str);
  }
  return str;
}

function objectChanges(obj) {
  Tracker.prototype.disable++;

  var t = obj._tracker;
  var at = t._lastTx;
  var readset = [];
  var writeset = [];
  while (at !== -1) {
    if (Tracker.prototype.cset[at].read !== undefined) {
      var val = obj[Tracker.prototype.cset[at].read];
      if (val !== null && typeof(val) === 'object') {
        readset.unshift(val);
      }
    } else {
      writeset.unshift(Tracker.prototype.cset[at]);
    }
    at = Tracker.prototype.cset[at].lasttx;
  }

  var oldProps = t._type.props;
  var newProps = Object.keys(obj);
  for (var i = 0; i < oldProps.length; i++) {
    if (!obj.hasOwnProperty(oldProps[i]) || !isTracked(obj, oldProps[i])) {
      var r:any = {obj: obj, del: oldProps[i], lasttx: t._lastTx};
      Tracker.prototype.cset.push(r);
      writeset.push(r);
      t._lastTx = Tracker.prototype.cset.length - 1;
    } else {
      var idx = newProps.indexOf(oldProps[i]);
      newProps[idx] = null;
    }
  }

  for (var i = 0; i < newProps.length; i++) {
    if (newProps[i] !== null) {
      var v = newValue(obj[newProps[i]], '');
      var r:any = {obj: obj, write: newProps[i], value: v, lasttx: t._lastTx};
      Tracker.prototype.cset.push(r);
      writeset.push(r);
      t._lastTx = Tracker.prototype.cset.length - 1;
    }
  }

  Tracker.prototype.disable--;
}

function arrayChanges(obj) {
  Tracker.prototype.disable++;

  var t = obj._tracker;
  var at = t._lastTx;
  var sorted = false;
  var readset = [];
  var writeset = [];

  // Build read & write sets
  while (at !== -1) {
    if (Tracker.prototype.cset[at].read !== undefined) {
      var val = obj[Tracker.prototype.cset[at].read];
      if (val !== null && typeof(val) === 'object') {
        readset.unshift(val);
      }
    } else if (sorted == false) {
      if (Tracker.prototype.cset[at].sort !== undefined) {
        var dead = Tracker.prototype.cset[at].lasttx;
        var v = newValueProps(obj, '');
        var r:any = {obj: obj, reinit: v, lasttx: -1};
        Tracker.prototype.cset[at] = r;
        writeset.unshift(r);

        // Tidy up anything pre-sort
        while (dead !== -1) {
          var c = dead;
          dead = Tracker.prototype.cset[dead].lasttx;
          Tracker.prototype.cset[c] = null;
        }
        sorted = true;
      } else {
        writeset.unshift(Tracker.prototype.cset[at]);
      }
    }
    at = Tracker.prototype.cset[at].lasttx;
  }

  // Adjust old props for shifty shifting
  var oldProps = t._type.props;
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
      var r:any = {obj: obj, del: oldProps[i], lasttx: t._lastTx};
      Tracker.prototype.cset.push(r);
      writeset.push(r);
      t._lastTx = Tracker.prototype.cset.length - 1;
    } else if (!isTracked(obj, oldProps[i])) {
      var v = newValue(obj[oldProps[i]], '');
      var r:any = {obj: obj, write: oldProps[i], value: v, lasttx: t._lastTx};
      Tracker.prototype.cset.push(r);
      writeset.push(r);
      t._lastTx = Tracker.prototype.cset.length - 1;
      track(obj, oldProps[i]);
    }
  }

  // Add new props
  var newProps = Object.keys(obj);
  for (var i = 0; i < newProps.length; i++) {
    var idx = oldProps.indexOf(newProps[i]);
    if (idx == -1) {
      var v = newValue(obj[newProps[i]], '');
      var r = {obj: obj, write: newProps[i], value: v, lasttx: t._lastTx};
      Tracker.prototype.cset.push(r);
      writeset.push(r);
      t._lastTx = Tracker.prototype.cset.length - 1;
      track(obj, newProps[i]);
    }
  }

  Tracker.prototype.disable--;
}


