//     types.js
//     (c) 2012 Kevin Jones
//     This file may be freely distributed under the MIT license.

/// <reference path='../defs/node-0.8.d.ts' />

var uuid = require('node-uuid');
var Tree = require('bintrees').RBTree;
var _ = require('underscore');

function hashStr(str:string, prime:number) {
  var hash = prime;
  var len = str.length;
  for (var i = 0; i < len; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return hash;
}

function typeOf(value) {
  var s = typeof value;
  if (s === 'object') {
    if (value) {
      if (value instanceof Array) {
        s = 'array';
      }
    } else {
      s = 'null';
    }
  }
  return s;
}

export function hashObj(obj) {
  var hash = 0;
  if (obj !== null && typeof obj === 'object') {
    if (obj instanceof Array) {
      hash = 1;
    }
    for (var prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        hash = hashStr(prop, hash);
        hash = hashStr('#', hash);
      }
    }
  }
  return hash;
}

function propsList(obj) :string[] {
  var lst = [];
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      lst.push(prop);
    }
  }
  return lst;
}

function Types() {
  var _tree = new Tree(function(a, b)  {
    return a.hash - b.hash;
  });

  this.type = function(obj) {
    if (obj === null || typeof obj !== 'object')
      return null;

    var h = hashObj(obj);
    var entries = _tree.find({hash: h});
    if (entries === null) {
      var id = uuid.v1();
      var entry = {id: id, hash: h, props: propsList(obj)};
      _tree.insert({hash: h, types: [entry]});
      return entry;
    }

    var props = propsList(obj);
    var t = entries.types;
    for (var i = 0; i < t.length; i++) {
      if (_.isEqual(t[i].props, props)) {
        return t[i];
      }
    }

    var entry = {id: uuid.v1(), hash: h, props: props};
    t.push(entry);
    return entry;
  };
}

/* TODO: This needs fixing to be correct */
Types.prototype.readValue = function(str) {
    switch (str) {
      case 'null':
        return null;
      case 'undefined':
        return undefined;
      case 'true':
        return true;
      case 'false':
        return false;
      default:
        if (/^[0-9]*$/.test(str)) 
          return parseInt(str);
        if (str.charAt(0) === '\'' && str.charAt(str.length-1) === '\'')
          return str.substring(1,str.length-1);
        if (str.charAt(0) === '<' && str.charAt(str.length-1) === '>')
          return new Reference(str.substring(1,str.length-1));
        throw new Error('Unrecognised type');
   }
}

Types.prototype.readQuotedValue = function(str) {
  console.log('STRING');
  console.log(str);
  if (str.length<2) 
    throw new Error('String too short');

  var len = str.length;
  if (str.charAt(0) === '\'' || str.charAt(0) === '"') {
    if (str.charAt(len-1) === '\'' || str.charAt(len-1) === '"') {
      if (str.charAt(0) === str.charAt(len-1)) {
        return this.readValue(str.substring(1,str.length-1));
      }
    }
  }
  throw new Error('String not quoted');
}

export function Reference(id) {
  this._id = id;
}

Reference.prototype.id = function() {
  return this._id;
}

export function UnknownReference(id, prop, missing) {
  this._id = id;
  this._prop = prop;
  this._missing = missing;
}

UnknownReference.prototype.id = function() {
  return this._id;
}

UnknownReference.prototype.prop = function() {
  return this._prop;
}

UnknownReference.prototype.missing = function() {
  return this._missing;
}

/**
 * Types store
 */
export var typeStore = new Types();