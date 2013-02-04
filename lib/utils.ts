// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />
/// <reference path='debug.ts' />

module shared {
  export module utils {

    var _ = require('underscore');
    var os = require('os');

    /* 
     * String hash, see http://www.cse.yorku.ca/~oz/hash.html
     */
    export function hash(str:string, prime?:number) {
      dassert(isValue(str));
      var hash = 5381;
      if (isValue(prime)) hash = prime;
      var len = str.length;
      for (var i = 0; i < len; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
      }
      return hash;
    }

    /**
     * Deep Equals
     */
    export function isEqual(x: any, y: any): bool {
      return _.isEqual(x, y);
    }

    /**
     * Non-null or undefined value
     */
    export function isValue(arg: any): bool  {
      return arg !== undefined && arg !== null;
    }

    /**
     * Non-null object value
     */
    export function isObject(value: any): bool  {
      return (value && typeof value === 'object' && !(value instanceof Array));
    }

    /**
     * Non-null array value
     */
    export function isArray(value: any): bool  {
      return (value && typeof value === 'object' && (value instanceof Array));
    }

    /**
     * Non-null object or array value
     */
    export function isObjectOrArray(value: any): bool  {
      return (value && typeof value === 'object');
    }

    /**
     * Corrected type of value.
     * Arrays & null are not 'objects'
     */
    export function typeOf(value: any) :string {
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

    /**
     * Corrected type of value.
     * Arrays & null are not 'objects'
     * Objects return their prototype type.
     */
    export function treatAs(value: any) :string {
      var s = typeof value;
      if (s === 'object') {
        if (value) {
          return Object.prototype.toString.call(value).
            match(/^\[object\s(.*)\]$/)[1];
        } else {
          s = 'null';
        }
      }
      return s;
    }

    export function cloneArray(obj: any[]): any[] {
      dassert(isArray(obj));
      return obj.slice(0);
    }

    export function cloneObject(obj: any): any {
      dassert(isObject(obj));
      var temp = {};
      for(var key in obj)
        temp[key] = obj[key];
      return temp;
    }

    export function clone(obj: any): any {
      if (isObject(obj))
        return cloneObject(obj);
      else
        return cloneArray(obj);
    }

    // ES5 9.2 
    export function toInteger(val: any) {
      var v = +val;   // toNumber conversion
      if (isNaN(v))
        return 0;
      if (v === 0 || v === Infinity || v == -Infinity)
        return v;
      if (v < 0)
        return -1 * Math.floor(-v);
      else
        return Math.floor(v);
    }

    export function dateFormat(type: string, fmt: string, args: any[]): string {
      return new Date().toISOString() + ' ' + format(type, fmt, args);
    }

    export function format(type: string, fmt: string, args: any[]) : string {
      var m = '';
      if (type!==null && type.length>0)
        m += (type + ' ');
      var i = 0;
      var len = args.length;
      var str = m + String(fmt).replace(/%[sdj%]/g, function (x) {
        if (x === '%%') return '%';
        if (i >= len) return x;
        switch (x) {
          case '%s': return String(args[i++]);
          case '%d': return Number(args[i++]).toString();
          case '%j': return JSON.stringify(args[i++]);
          default:
            return x;
        }
      });
      str += '\n';

      for (var x = args[i]; i < len; x = args[++i]) {
        if (x === null || typeof x !== 'object') {
          str += x + '\n';
        } else {
          str += JSON.stringify(x,null,' ') + '\n';
        }
      }
      return str;
    }

    var _hostInfo = null;

    export function hostInfo(): string {
      if (_hostInfo === null) {
        _hostInfo = os.hostname();
        var ifaces = os.networkInterfaces();
        for (var dev in ifaces) {
          var alias = 0;
          ifaces[dev].forEach(function (details) {
            if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
              _hostInfo += ' [' + details.address + ']';
              ++alias;
            }
          });
        }
      }
      return _hostInfo;
    }

    export function exceptionInfo(e: any) {
      if (e instanceof Error) {
        return e.stack;
      } else {
        return JSON.stringify(e);
      }
    }

  } // module utils
} // module shared
