// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />
/// <reference path='debug.ts' />

module shared {
  export module utils {

    var _ = require('underscore');

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
     * Non-null object or array value
     */
    export function isObjectorArray(value: any): bool  {
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

    export function flatClone(obj: any): any {
      return JSON.parse(JSON.stringify(obj));
    }

  } // module utils
} // module shared