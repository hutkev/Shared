//     shared.js 
//     (c) 2012 Kevin Jones
//     This file may be freely distributed under the MIT license.

/// <reference path='../defs/node-0.8.d.ts' />

import modrouter = module('router');
var router = modrouter.router;

import modtracker = module('tracker');
var Tracker = modtracker.Tracker;

import modtypes = module('types');
var types = modtypes.typeStore;
var Reference = modtypes.Reference;
var UnknownReference = modtypes.UnknownReference;

var cluster = require('cluster');
var Tree = require('bintrees').RBTree;
var uuid = require('node-uuid');

export function Store() {

  this._id = uuid.v1();

  this._tree = new Tree(function(a, b)  {
    return a.id.localeCompare(b.id);
  });
  
  this._pending = [];
    
  if (cluster.isMaster && Store.prototype._master === undefined) { 
    Store.prototype._master = this;
    this._isMaster = true;
  } else {
    this._isMaster = false;
  }
    
  if (this._isMaster) {
    this._root = new Object();
    new Tracker (this._root);
    this._tree.insert({id: this._root._tracker.id(), obj: this._root});
    router.register(this, 'master');    
  } else {
    router.register(this);
    this._pending.push({action: 'get', id: null});
    this.nextStep();
  }
};

Store.prototype.master = function () {
  return Store.prototype._master;
}

Store.prototype.id = function() {
  return this._id;
}

Store.prototype.root = function() {
  Tracker.prototype.rset[this._root._tracker._id] = this._root._tracker._rev;  
  return this._root;
}

Store.prototype.nextStep = function() {
  if (this._pending.length === 0)
    return;

  var r = this._pending[0];
  switch (r.action) {
    case 'get':
      r.action='waitget';
      router.dispatch({route_to : {name : 'master'}, detail: 'get', 
        id: r.id, from: router.from(this)});
      break;
    case 'waitget':
      break;
    case 'save':
      if (r.fn !== null) {
        try {
          r.fn(this._root);
          this.saveChanges();
        } catch (e) {
          if (e instanceof UnknownReference) {
            var entry=this._tree.find({id: e.missing()});
            if (entry === null) {
              this._pending.unshift({action: 'get', id: e.missing(), 
                assignid: e.id(), assignprop: e.prop()});
                this.nextStep();
            } else {
              var to=this._tree.find({id: e.id()});
              to.obj[e.assignprop] = entry.obj;
              return;
            }
          } else {
            throw e;
          }
        }
      }
      break;
    case 'change':
      r.action='waitchange';
      router.dispatch({route_to : {name : 'master'}, detail: 'change', 
        mtx: r.mtx, from: router.from(this)});
     break; 
    default:
      throw new Error('Unexpected command');
  }
}

Store.prototype.save = function(fn, cb, idx) {
  this._pending.push({action: 'save', fn: fn, cb:cb, idx: idx});
  this.nextStep();
}

exports.Store = Store;

Store.prototype.handle = function(msg) {
  if (this._isMaster) {
    return this.dispatchMasterMsg(msg);
  } else {
    return this.dispatchWorkerMsg(msg);
  }
}

// To master  
Store.prototype.dispatchMasterMsg = function (msg) {
  console.log('TO MASTER: from ' + msg.from);
  console.log(msg);
  
  switch (msg.detail) {
    case 'get':
      var obj;
      if (msg.id === null) { 
        obj = this._root;
      } else {
        var e = this._tree.find({id: msg.id})
        if (e !== null)
          obj = e.obj;
        else
          throw new Error('No such object');
      }
      router.dispatch({route_to: msg.from, detail: 'update', id: msg.id, 
        obj: this.writeObj(obj,''), from: router.from(this)});
      break;

    case 'change':
      if (this.commitChanges(msg.mtx)) {
        console.log('done');
      }
      break;

    default:
      throw new Error('Unrecognized message');
  }
};

// To worker  
Store.prototype.dispatchWorkerMsg = function (msg, wrk) {
  console.log('TO WORKER: from ' + msg.from);
  console.log(msg);
  
  switch (msg.detail) {
    case 'update':
      if (this._pending.length === 0 || 
        this._pending[0].action !== 'waitget' ||
        this._pending[0].id !== msg.id) {
        throw new Error('Update out of sequence');
      }
       
      var obj = this.updateObj(msg.obj, true);
      this._tree.insert({id: obj._tracker.id(), obj: obj});
      if (msg.id === null) {
        this._root = obj;
      }
      
      var e = this._pending[0];
      if (e.assignid !== undefined) {
        var assign = this._tree.find({id: e.assignid});
        if (assign !== null) 
          assign.obj[e.assignprop] = obj;
      } 
      this._pending.shift();
      this.nextStep();
      break;
    default:
      throw new Error('Unexpected command');
  }
};

Store.prototype.commitChanges = function(mtx) {
  // Cmp rset
  var rset = mtx[0];
  var rkeys = Object.keys(rset);
  for (var i = 0; i<rkeys.length; i++) {
    var e = this._tree.find({id: rkeys[i]});
    if (e !== null) {
      if (e.obj._tracker._rev != rset[rkeys[i]])
        return false;
    } else {
      throw new Error('Missing object');
    }
  }
  
  // Write changes & inc revs
  var cset = mtx[2];
  var wset = {};
  for (var i =0; i<cset.length; i++) {
    var e = cset[i];
    if (e.write !== undefined) {
      var o=this._tree.find({id: e.id});
      if (o === null)
        throw new Error('Missing object');
      if (!wset.hasOwnProperty(e.id)) {
        wset[e.id] = 0;
        o.obj._tracker._rev++;
      }
      o[e.write] = types.readValue(e.value);
    }
  }
  
  return true;
}

Store.prototype.saveChanges = function() {

  // Collect over accessed objects
  var rkeys = Object.keys(Tracker.prototype.rset);
  for (var i = 0; i<rkeys.length; i++) {
    var e = this._tree.find({id: rkeys[i]});
    if (e !== null) {
      e.obj._tracker.collect(e.obj);
    } else {
      throw new Error('Unexpected object in read list');
    }
  }

  // Collect written objects and up rev them
  var wkeys = {};
  for (var i = 0; i<Tracker.prototype.cset.length; i++) {
    var e = Tracker.prototype.cset[i];
    if (e !== null) {
      var t = e.obj._tracker;
      if (wkeys.hasOwnProperty(t._id)) {
        wkeys[t._id] = 0;
        t._ver++;
      }
      e.id = t._id;
      delete e.obj;
      delete e.lasttx;
    }
  }

  // Push to master
  this._pending.unshift({action: 'change', mtx: 
    [Tracker.prototype.rset, Tracker.prototype.nset, Tracker.prototype.cset]});
  this.nextStep();
}

Store.prototype.writeObj = function(obj, str) {
  if (obj instanceof Array) {
    str += '[';
  } else {
    str += '{';
  }
  
  str += obj._tracker._id+' ';
  str += obj._tracker._rev+' ';

  var k = Object.keys(obj);
  for (var i = 0; i < k.length; i++) {
    str += "'" + k[i] + "':";
    var val = obj[k[i]];
    if (val !== null && typeof val == 'object') {
      str += '<' + val._tracker._id + '>';
    } else {
      if (val === null) {
        str += 'null';
      } else if (val === undefined) {
        str += 'undefined';
      } else {
        switch (typeof val) {
          case 'number':
          case 'boolean':
            str += val.toString();
            break;
          case 'string':
            str += "'" + val.toString() + "'";
            break;
        }
      }
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

Store.prototype.updateObj = function(str, lookup) {

  var obj = null;
  var uuid = str.substring(1,37);
  if (lookup === true) {
    var e = this._tree.find({id: uuid});
    if (e !== null) 
      obj = e.obj;
  }

  var term='}';
  if (obj === null) {
    if (str.charAt(0) === '[') {
      obj = [];
      term = ']';
    } else if (str.charAt(0) === '{') {
      obj = {};
      term = '}';
    } else {
      throw new Error('Parse error');
    }
  } else if (obj instanceof Array) {
    term = ']';
  }

  var at = 38;
  var etok=at+1;
  while (str.charAt(etok) !== ' ')
    etok++;
  var rev = parseInt(str.substring(at,etok));
  at = etok + 1;

  var keys=Object.keys(obj);
  var k = 0;
  while (true) {
    while (str.charAt(at) === ' ') at++;
    if (str.charAt(at) === term) break;
    var etok=at;
    while (str.charAt(etok) !== ':')
      etok++;
    var name = str.substring(at+1,etok-1);
    at=etok+1;
    var etok=at;
    while (str.charAt(etok) !== ',' && str.charAt(etok) !== term)
      etok++;
    var value = str.substring(at,etok);
    if (k !== -1  && name != keys[k]) {
      for(var i=k; i<keys.length; i++)
        delete obj[keys[i]];
      k = -1;
    } 
    var v = types.readValue(value);
    obj[name] = v;
    if (str.charAt(etok) === term) break;
    at = etok + 1;
  }

  if (obj._tracker !== undefined) {
    obj._tracker._rev = rev;
  } else { 
    new Tracker(obj, uuid, rev);
  }
  return obj;
}
