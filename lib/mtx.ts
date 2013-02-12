// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />
/// <reference path='tracker.ts' />

module shared {
  export module mtx {

    export class ReadMap {
      private _map: utils.IdMap = new utils.IdMap();

      size(): number {
        return this._map.size();
      }

      find(id: utils.uid) : any {
        return this._map.find(id);
      }

      insert(id: utils.uid, revision: number) : bool {
        return this._map.insert(id, revision);
      }

      remove(id: utils.uid) : bool {
        return this._map.remove(id);
      }

      apply(handler: (key: utils.uid, value: number) => bool): bool {
        return this._map.apply(function (k, v) {
          return handler(k, v);
        });
      }

      removeAll() : void {
        this._map.removeAll();
      }

      toString(): string {
        var str = '';
        this._map.apply(function (key, value) {
          str += key;
          str += ' '
          str += value;
          str += '\n';
          return true;
        });
        return str;
      }
    }

    export interface NewItem {
      id: utils.uid;
      obj: any;
    }

    export class NewQueue {
      private _queue: utils.Queue;

      constructor (queue?: utils.Queue = new utils.Queue()) {
        this._queue = queue;
      }

      size(): number {
        return this._queue.size();
      }

      empty(): bool {
        return this._queue.empty();
      }

      front(): NewItem {
        return this._queue.front();
      }

      back(): NewItem {
        return this._queue.back();
      }

      at(i: number) : NewItem {
        return this._queue.at(i);
      }

      setAt(i: number, value: NewItem) : void {
        this._queue.setAt(i, value);
      }

      push(value: NewItem) : void {
        this._queue.push(value);
      }

      pop() : NewItem {
        return this._queue.pop();
      }

      unshift(value: NewItem) : void {
        this._queue.unshift(value);
      }

      shift() : NewItem {
        return this._queue.shift();
      }

      array(): NewItem[] {
        return this._queue.array();
      }

      first( match: (value:NewItem) => bool): NewItem {
        return this._queue.first(function (v) {
          return match(v);
        });
      }

      filter( match: (value:NewItem) => bool): NewQueue {
        var q = this._queue.filter(function (v) {
          return match(v);
        });
        return new NewQueue(q);
      }

      apply( func: (value:NewItem) => void): void {
        this._queue.apply(function (v) {
          return func(v);
        });
      }

      toString(): string {
        var str = '';
        this._queue.apply(function (item:NewItem) {
          str += item.id;
          str += ' '
          str += JSON.stringify(item.obj);
          str += '\n';
        });
        return str;
      }
    }

    export interface ChangeItem {
      obj: any;
      lasttx: number;

      write?: string;
      value?: any;
      last?: any;

      del?: string;

      sort?: bool;
      reinit?: any;
      reverse?: bool;

      shift?: number;
      unshift?: number;
      size?: number;
    }

    export class ChangeQueue {
      private _queue: utils.Queue;

      constructor (queue?: utils.Queue = new utils.Queue()) {
        this._queue = queue;
      }

      size(): number {
        return this._queue.size();
      }

      empty(): bool {
        return this._queue.empty();
      }

      front(): ChangeItem {
        return this._queue.front();
      }

      back(): ChangeItem {
        return this._queue.back();
      }

      at(i: number) : ChangeItem {
        return this._queue.at(i);
      }

      setAt(i: number, value: ChangeItem) : void {
        this._queue.setAt(i, value);
      }

      push(value: ChangeItem) : void {
        this._queue.push(value);
      }

      pop() : ChangeItem {
        return this._queue.pop();
      }

      unshift(value: ChangeItem) : void {
        this._queue.unshift(value);
      }

      shift() : ChangeItem {
        return this._queue.shift();
      }

      array(): ChangeItem[] {
        return this._queue.array();
      }

      first( match: (value:ChangeItem) => bool): ChangeItem {
        return this._queue.first(function (v) {
          return match(v);
        });
      }

      filter( match: (value:ChangeItem) => bool): ChangeQueue {
        var q = this._queue.filter(function (v) {
          return match(v);
        });
        return new ChangeQueue(q);
      }

      apply( func: (value:ChangeItem) => void): void {
        this._queue.apply(function (v) {
          return func(v);
        });
      }

      toString(): string {
        var str = '';
        this._queue.apply(function (item: ChangeItem) {
          if (item === null) {
            str += "<null>";
          } else {
            str += tracker.getTracker(item.obj).id();
            str += ' '
            if (item.write !== undefined) {
              str += 'write ' + item.write + ' = ' + JSON.stringify(item.value);
              if (item.last !== undefined)
                str += ' last ' + JSON.stringify(item.last);
            } else if (item.del !== undefined) {
              str += 'delete ' + item.del;
            } else if (item.reinit !== undefined) {
              str += 'reinit ' + item.reinit;
            } else if (item.reverse !== undefined) {
              str += 'reverse';
            } else if (item.shift !== undefined) {
              str += 'shift ' + item.shift + ' by ' + item.size;
            } else if (item.unshift !== undefined) {
              str += 'unshift ' + item.unshift + ' by ' + item.size;
            } else {
              str += '**UNKNOWN** ' + JSON.stringify(item);
            }
          }
          str += '\n';
        });
        return str;
      }

    }

    export class MTX {

      public rset: ReadMap;     // read set, id->rev map
      public nset: NewQueue;    // new (id,obj) ordered, discovered during serial
      public cset: ChangeQueue; // change set, ordered list of changes

      constructor () {
        this.reset();
      }

      reset() {
        this.rset = new ReadMap();
        this.nset = new NewQueue();
        this.cset = new ChangeQueue();
      }

      toString() {
        var str = '';
        str += 'Read:\n'+this.rset.toString();
        str += 'New:\n' + this.nset.toString();
        str += 'Changed:\n' +this.cset.toString();
        return str;
      }
    }

  } // mtx
} // shared
