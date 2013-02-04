// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />
/// <reference path='utils.ts' />
/// <reference path='debug.ts' />

module shared {
  export module utils {

    var Tree = require('bintrees').RBTree;

    interface MapEntry {
      key: any;
      value: any;
    }

    interface MapRow {
      hash: number;
      values: MapEntry[];
    }

    export class Map {
      private _hashfn : (a:any) => number;
      private _size: number;
      private _tree;

      constructor(hashfn: (a:any) => number) {
        dassert(isValue(hashfn));
        this._size = 0;
        this._hashfn = hashfn;
        this._tree = new Tree(function (a:MapRow, b:MapRow) {
          return a.hash - b.hash;
        });
      }

      size(): number {
        return this._size;
      }

      find(key: any) : any {
        dassert(isValue(key));
        var h = this._hashfn(key);
        var entries: MapRow = this._tree.find({ hash: h });
        if (entries !== null) {
          for (var i = 0; i < entries.values.length; i++) {
            if (isEqual(key, entries.values[i].key)) {
              return entries.values[i].value;
            }
          }
        }
        return null;
      }

      insert(key: any, value: any) : bool {
        dassert(isValue(key));
        dassert(isValue(value));

        var h = this._hashfn(key);
        var entries: MapRow = this._tree.find({ hash: h });
        if (entries !== null) {
          var free = null;
          for (var i = 0; i < entries.values.length; i++) {
            if (entries.values[i].key === null) {
              if (free === null) free = i;
            } else if (isEqual(key, entries.values[i].key)) {
              return false;
            }
          }
          if (free !== null)
            entries.values[free] = { key: key, value: value };
          else
            entries.values.push({ key: key, value: value });
        } else {
          this._tree.insert({ hash: h, values: [{ key: key, value: value }] } );
        }
        this._size++;
        return true;
      }

      findOrInsert(key: any, proto? = {}): any {
        var val = this.find(key);
        if (val !== null) {
          return val;
        } else {
          this.insert(key, proto);
          return proto;
        }
      }

      remove(key: any) : bool {
        dassert(isValue(key));

        var h = this._hashfn(key);
        var entries: MapRow = this._tree.find({ hash: h });
        if (entries !== null) {
          var found = true;
          for (var i = 0; i < entries.values.length; i++) {
            if (isEqual(key, entries.values[i].key)) {
              entries.values[i].key = null;
              entries.values[i].value = null;
              this._size--;
              return true;
            }
          }
        }
        return false;
      }

      apply(handler : (key: any, value: any) => bool) : bool {
        var it = this._tree.iterator();
        while (it.next()) {
          var row: MapRow = it.data();
          for (var i = 0; i < row.values.length; i++) {
            if (row.values[i].key !== null)
              if (handler(row.values[i].key,row.values[i].value) === false)
                return false;
          }
        }
        return true;
      }

      removeAll() : void {
        this._tree.clear();
        this._size = 0;
      }
    }

    /**
     * A simple string set
     */
    export class StringSet {
      private _map : Map;
      private _id: number;

      constructor (names: string[]=[]) {
        this._map = new Map(function (k: any) {
          return utils.hash(k.toString());
        });
        this._id = 0;

        for (var i = 0; i < names.length; i++) {
          this.put(names[i]);
        }
      }

      put(key: string): bool {
        var ok = this._map.insert(key, this._id);
        if (ok)
          this._id++;
        return ok;
      }

      has(key: string): bool {
        return this._map.find(key) !== null;
      }

      id(key: string): number {
        return this._map.find(key);
      }

      remove(key: string): bool {
        return this._map.remove(key);
      }

      size(): number {
        return this._map.size();
      }

      removeAll(): void {
        return this._map.removeAll();
      }

      apply(handler: (value: any) => bool): bool {
        return this._map.apply(function (key: any, value: any) {
          return handler(key);
        });
      }
    }

    /**
     * A simple queue, items can be added/removed from the
     * head/tail with random access and assertions thrown in.
     */
    export class Queue {
      private _elems = [];

      size(): number {
        return this._elems.length;
      }

      empty(): bool {
        return this.size() === 0;
      }

      front(): any {
        return this.at(0);
      }

      back(): any {
        return this.at(this.size()-1);
      }

      at(i: number) {
        dassert(i >= 0 && i < this.size());
        return this._elems[i];
      }

      setAt(i: number, value: any) {
        dassert(i >= 0 && i < this.size());
        this._elems[i] = value;
      }

      push(value: any) : void {
        this._elems.push(value);
      }

      pop() : any {
        dassert(!this.empty());
        return this._elems.pop();
      }

      unshift(value: any) : void {
        this._elems.unshift(value);
      }

      shift() : any {
        dassert(!this.empty());
        return this._elems.shift();
      }

      array(): any[] {
        return this._elems;
      }

      first( match: (value:any) => bool): any {
        for (var i = 0; i < this._elems.length; i++) {
          if (match(this._elems[i]))
            return this._elems[i];
        }
        return null;
      }

      filter( match: (value:any) => bool): Queue {
        var matched = new Queue();
        for (var i = 0; i < this._elems.length; i++) {
          if (match(this._elems[i]))
            matched.push(this._elems[i]);
        }
        return matched;
      }

      apply( func: (value:any) => void): void {
        for (var i = 0; i < this._elems.length; i++) {
          func(this._elems[i]);
        }
      }
    }


  } // module utils
} // module shared