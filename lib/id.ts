// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />

module shared {
  export module utils {

    var ObjectID = require('mongodb').ObjectID;

    /*
     * A network wide unique id wrapper. 
     * Pragmatically it must be a UUID and exposable as a string.
     */

    export var uidStringLength = 24;

    export interface uid { 
      toString(): string;
    }

    export function UID(): uid {
      return new ObjectID();
    }

    export function isUID(a: uid) {
      return (a instanceof ObjectID);
    }

    export function makeUID(id: string) {
      var uid = new ObjectID(id);
      dassert(isUID(uid) && uid.toString()==id.toLowerCase());
      return uid;
    }

    export function toObjectID(id: uid) {
      return id;
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

    /*
     * Map specialized for using id keys. A bodge until generics are supported.
     */
    export class IdMap {
      private _map: utils.Map = new utils.Map(utils.hash);

      size(): number {
        return this._map.size();
      }

      find(key: uid) : any {
        return this._map.find(key.toString());
      }

      insert(key: uid, value: any) : bool {
        return this._map.insert(key.toString(), value);
      }

      findOrInsert(key: uid, proto? = {}): any {
        return this._map.findOrInsert(key.toString(), proto);
      }

      remove(key: uid) : bool {
        return this._map.remove(key.toString());
      }

      apply(handler : (key: uid, value: any) => bool) : bool {
        return this._map.apply(function (k, v) {
          return handler(makeUID(k), v);
        });
      }

      removeAll() : void {
        this._map.removeAll();
      }
    }

  } // module utils
} // module shared