// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />
/// <reference path='utils.ts' />
/// <reference path='id.ts' />

module shared {
  export module serial {

    /*
     * Object/Array reference holder. Used to represent a reference when
     * de-serialising data.
     */
    export class Reference {
      private _id: utils.uid;

      constructor (id: utils.uid) {
        utils.dassert(utils.isUID(id));
        this._id = id;
      }

      id(): utils.uid {
        return this._id;
      }
    }

    /*
     * Reference Handler interface used to obtain a unique ID to be used
     * when serializing values of composite types. A valid UID must always
     * be returned and must be consistent for the value.
     */
    export interface ReferenceHandler {
      valueId(value: any): utils.uid;
      valueRev(value: any): number;
    }

    /*
     * Append serialized form of an object/array onto the supplied string. 
     * Returns the passed string.
     */
    export function writeObject(rh: ReferenceHandler, obj: any, to: string = '', identify: bool = false) {
      utils.dassert(utils.isObjectOrArray(rh));
      utils.dassert(utils.isObjectOrArray(obj));

      if (obj instanceof Array) {
        to += '[';
      } else {
        to += '{';
      }

      if (identify) {
        to += rh.valueId(obj) + ' ';
        to += rh.valueRev(obj) + ' ';
      }

      var k = Object.keys(obj);
      for (var i = 0; i < k.length; i++) {
        to = writeValue(rh, k[i], to);
        to += ":";
        to = writeValue(rh, obj[k[i]], to);
        if (i < k.length - 1)
          to += ',';
      }

      if (obj instanceof Array) {
        to += ']';
      } else {
        to += '}';
      }
      return to;
    }

    /*
     * Append serialized form of a value onto the supplied string. 
     * Object/Array values are serialised by reference, see writeObject() for
     * full serialisation of object/array properties. Returns the passed string.
     */
    export function writeValue(rh: ReferenceHandler, value: any, to: string = ''): string {
      utils.dassert(utils.isObject(rh));

      var type = utils.treatAs(value);
      switch (type) {
        case 'null':
          to += 'null';   
          break;
        case 'undefined':
          to += 'undefined';
          break;
        case 'number':
        case 'Number':
        case 'boolean':
        case 'Boolean':
          to += value.toString();
          break;
        case 'string':
        case 'String':
          to += JSON.stringify(value);
          break;
        case 'Date':
          to += JSON.stringify(value.toString());
          break;
        case 'Object':
        case 'Array':
          to += '<' + rh.valueId(value) + '>';
          break;
        case 'function':
        case 'RegExp':
        case 'Error':
          to += 'null';
          break;
        default:
          utils.defaultLogger().fatal('Unexpected type: %s', type);
          break;
      }
      return to;
    }

    export function readObject(str: string, proto?: any) : any {
      utils.dassert(str.length >1 && 
        (str.charAt(0) === '[' || str.charAt(0) === '{') &&
        (str.charAt(str.length-1) === ']' || str.charAt(str.length-1) === '}'))

      // Check is we have a proto & its the right type
      if (str.charAt(0) === '{') {
        if (!utils.isValue(proto)) {
          proto = {};
        } else {
          utils.dassert(utils.isObject(proto));
        }
      } else {
        if (!utils.isValue(proto)) {
          proto = [];
        } else {
          utils.dassert(utils.isArray(proto));
          // Prop delete does not work well on arrays so zero proto
          proto.length = 0;
        }
      }

      // Read props
      var rs = new ReadStream(str.substr(1,str.length-2));
      var keys = Object.keys(proto);
      var k = 0;
      while (true) {
        rs.skipWS();
        if (rs.eof())
          break;

        // Read prop name
        var prop = rs.readNextValue();
        utils.dassert(typeof prop === 'string');

        // Delete rest of proto props if does not match what is being read
        if (k !== -1 && prop != keys[k]) {
          for (var i = k; i < keys.length; i++)
            delete proto[keys[i]];
          k = -1;
        }

        // Skip ':'
        rs.skipWS();
        utils.dassert(!rs.eof());
        utils.dassert(rs.peek()===':');
        rs.skip();
        rs.skipWS();

        // Read value & assign
        var value = rs.readNextValue();
        proto[prop] = value;

        // Skip ',' if present
        rs.skipWS();
        if (!rs.eof()) {
          utils.dassert(rs.peek() === ',');
          rs.skip();
          rs.skipWS();
        } else {
          break;
        }
      }

      return proto;
    }

    /*
     * Read a value as encoded by writeValue. The passed string must contain
     * one complete value with no leading or trailing characters. May return 
     * null if passed 'null'.
     */
    export function readValue(str: string): any {
      utils.dassert(utils.isValue(str));

      var rs = new ReadStream(str);
      return rs.readNextValue();
    }

    class ReadStream {
      private _from: string;
      private _at: number;

      private static _numberPat = /^-?(0|([1-9][0-9]*))(\.[0-9]+)?([eE][-+][0-9]+)?/;

      constructor (from: string) {
        utils.dassert(utils.isValue(from));
        this._from = from;
        this._at = 0;
      }

      eof(): bool {
        return this._at >= this._from.length;
      }

      skip(n: number=1) {
        this._at += n;
      }

      skipWS() {
        while (this._at < this._from.length && (
          this._from[this._at] === ' ' || this._from[this._at] === '\t')) {
          this._at++;
        }
      }

      peek(n: number=0) {
        utils.dassert(this._at + n < this._from.length);
        return this._from[this._at + n];
      }


      /*
       * Read a value as encoded by writeValue. The passed string must contain
       * one complete value with no leading or trailing characters. May return 
       * null if passed 'null'.
       */
      readNextValue(): any {

        // Simple things first
        if (this._from.substr(this._at, 4) === 'null') {
          this._at += 4;
          return null;
        } else if (this._from.substr(this._at, 9) === 'undefined') {
          this._at += 9;
          return undefined;
        } else if(this._from.substr(this._at, 4) === 'true') {
          this._at += 4;
          return true;
        } else if(this._from.substr(this._at, 5) === 'false') {
          this._at += 5;
          return false;
        } else if(this._from.substr(this._at, 3) === 'NaN') {
          this._at += 3;
          return NaN;
        } else if(this._from.substr(this._at, 8) === 'Infinity') {
          this._at += 8;
          return Infinity;
        } else if(this._from.substr(this._at, 9) === '-Infinity') {
          this._at += 9;
          return -Infinity;
        }

        // JSON escaped string?
        if (this._from.charAt(this._at) === '"') {
          var end = this._at + 1;
          while (end < this._from.length) {
            if (this._from.charAt(end) === '\\') 
              end += 1;
            else if (this._from.charAt(end) === '"') 
              break;
            end += 1;
          }
          if (end < this._from.length) {
            var s = this._from.substr(this._at, end - this._at +1);
            this._at = end + 1;
            return JSON.parse(s);
          }
        }

        // Reference?
        if (this._from.charAt(this._at) === '<' && 
          this._from.charAt(this._at+1+utils.uidStringLength) === '>') {
          var id = this._from.substr(this._at+1, utils.uidStringLength);
          this._at += (2+utils.uidStringLength);
          return new Reference(utils.makeUID(id));
        } 
        
        // Maybe a number
        var l = this.numberLength();
        if (l) {
          var n = parseFloat(this._from.substr(this._at));
          utils.dassert(!isNaN(n));
          this._at += l;
          return n;
        }

        utils.defaultLogger().fatal('Unexpected value encoding: %s', this._from.substr(this._at));
      }

      numberLength() {
        var ex = ReadStream._numberPat.exec(this._from.substr(this._at));
        if (ex) 
          return ex[0].length;
        else
          return 0;
      }
    }

  } // tracker
} // shared