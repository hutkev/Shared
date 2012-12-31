// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />
/// <reference path='utils.ts' />
/// <reference path='collect.ts' />
/// <reference path='id.ts' />

module shared {
  export module types {

    export class TypeDesc extends utils.UniqueObject {
      private _isobj: bool;
      private _props: string[];


      constructor (isobj: bool, props: string[]) {
        super();
        this._isobj = isobj;
        this._props = props;
      }

      isobj() : bool {
        return this._isobj
      }

      isarray(): bool {
        return !this._isobj
      }

      props() : string [] {
        return this._props;
      }

      typeDesc(): string {
        var props = 'o#';
        if (this.isarray()) {
          props = 'a#';
        }
        for (var i = 0; i < this._props.length; i++) {
          props += this._props[i];
          props += '#';
        }
        return props;
      }
    }

    export class TypeStore {
      private static _instance;       // Singleton instance
      private _tree: utils.Map;

      static instance(): TypeStore {
        if (!TypeStore._instance)
          TypeStore._instance = new TypeStore();
        return TypeStore._instance;
      }

      constructor () {
        utils.dassert(TypeStore._instance == null);
        this._tree = new utils.Map(utils.hash);
      }

      type(obj: any): TypeDesc {
        utils.dassert(utils.isObjectOrArray(obj));
        
        var p = TypeStore.props(obj);
        var td : TypeDesc = this._tree.find(p);
        if (td === null) {
          var ps = p.split('#'); ps.shift(); ps.pop();
          td = new TypeDesc(utils.isObject(obj), ps);
          this._tree.insert(p, td);
        } 
        return td;
      }

      static props(obj: any): string {
        utils.dassert(utils.isObjectOrArray(obj));
        var props = 'o#';
        if (obj instanceof Array) {
          props = 'a#';
        }
        for (var prop in obj) {
          if (obj.hasOwnProperty(prop)) {
            props += prop;
            props += '#';
          }
        }
        return props;
      }
    }

  } // types
} // shared