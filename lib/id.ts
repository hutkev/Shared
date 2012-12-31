// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />

module shared {
  export module utils {

    var uuid = require('node-uuid');

    /*
     * A network wide unique id wrapper. 
     * Pragmatically it must be a UUID and exposable as a string.
     */
    export interface uid extends String { }

    var uuidStr = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-' +
      '[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
    var uuidPat = new RegExp(uuidStr);

    export function UID(): uid {
      return new String(uuid.v1());
    }

    export function isUID(a: uid) {
      return isValue(a) && uuidPat.test(a.toString());
    }

    export function makeUID(id: string) {
      var uid = new String(id);
      dassert(isUID(uid));
      return uid;
    }

    /*
     * Interface for objects that can provide a unique id
     */
    export interface Unique {
      id(): uid;
    }

    /*
     * Identifiable object helper
     */
    export class UniqueObject implements Unique {
      private _id: uid = null;

      id() : uid { 
        if (this._id === null)
          this._id = UID();
        return this._id;
      }
    }

  } // module utils
} // module shared