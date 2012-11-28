// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />
/// <reference path='utils.ts' />
/// <reference path='collect.ts' />

module shared {
  export module serial {

    export class Reference {
      private _id: string;

      constructor (id: string) {
        this._id = id;
      }

      id(): string {
        return this._id;
      }
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

    export function readValue (str : string) : any {
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
          if (str.charAt(0) === '\'' && str.charAt(str.length - 1) === '\'')
            return str.substring(1, str.length - 1);
          if (str.charAt(0) === '<' && str.charAt(str.length - 1) === '>')
            return new Reference(str.substring(1, str.length - 1));
          throw new Error('Unrecognised type');
      }
    }

  } // serial
} // shared