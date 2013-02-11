/* *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved. 
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0  
 
THIS CODE IS PROVIDED *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE, 
MERCHANTABLITY OR NON-INFRINGEMENT. 
 
See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */

/// <reference no-default-lib="true"/>

////////////////
/// ECMAScript APIs
////////////////

declare var NaN: number;
declare var Infinity: number;
declare function eval(x: string): any;
declare function parseInt(s: string, radix?: number): number;
declare function parseFloat(string: string): number;
declare function isNaN(number: number): bool;
declare function isFinite(number: number): bool;
declare function decodeURI(encodedURI: string): string;
declare function decodeURIComponent(encodedURIComponent: string): string;
declare function encodeURI(uri: string): string;
declare function encodeURIComponent(uriComponent: string): string;

interface PropertyDescriptor {
    configurable?: bool;
    enumerable?: bool;
    value?: any;
    writable?: bool;
    get?(): any;
    set?(v: any): void;
}

interface PropertyDescriptorMap {
    [s: string]: PropertyDescriptor;
}

interface Object {
    toString(): string;
    toLocaleString(): string;
    valueOf(): Object;
    hasOwnProperty(v: string): bool;
    isPrototypeOf(v: Object): bool;
    propertyIsEnumerable(v: string): bool;
    [s: string]: any;
}
declare var Object: {
    new (value?: any): Object;
    (): any;
    (value: any): any;
    prototype: Object;
    getPrototypeOf(o: any): any;
    getOwnPropertyDescriptor(o: any, p: string): PropertyDescriptor;
    getOwnPropertyNames(o: any): string[];
    create(o: any, properties?: PropertyDescriptorMap): any;
    defineProperty(o: any, p: string, attributes: PropertyDescriptor): any;
    defineProperties(o: any, properties: PropertyDescriptorMap): any;
    seal(o: any): any;
    freeze(o: any): any;
    preventExtensions(o: any): any;
    isSealed(o: any): bool;
    isFrozen(o: any): bool;
    isExtensible(o: any): bool;
    keys(o: any): string[];
}

interface Function {
    apply(thisArg: any, ...argArray: any[]): any;
    call(thisArg: any, ...argArray: any[]): any;
    bind(thisArg: any, ...argArray: any[]): Function; 
    prototype: any;
    length: number;
}
declare var Function: {
    new (...args: string[]): Function;
    (...args: string[]): Function;
    prototype: Function;
}

interface IArguments {
    [index: number]: any;
    length: number;
    callee: Function;
}

interface String {
    toString(): string;
    charAt(pos: number): string;
    charCodeAt(index: number): number;
    concat(...strings: string[]): string;
    indexOf(searchString: string, position?: number): number;
    lastIndexOf(searchString: string, position?: number): number;
    localeCompare(that: string): number;
    match(regexp: string): string[];
    match(regexp: RegExp): string[];
    replace(searchValue: string, replaceValue: string): string;
    replace(searchValue: string, replaceValue: (substring: string, ...args: any[]) => string): string;
    replace(searchValue: RegExp, replaceValue: string): string;
    replace(searchValue: RegExp, replaceValue: (substring: string, ...args: any[]) => string): string;
    search(regexp: string): number;
    search(regexp: RegExp): number;
    slice(start: number, end?: number): string;
    split(seperator: string, limit?: number): string[];
    split(seperator: RegExp, limit?: number): string[];
    substring(start: number, end?: number): string;
    toLowerCase(): string;
    toLocaleLowerCase(): string;
    toUpperCase(): string;
    toLocaleUpperCase(): string;
    trim(): string;

    length: number;

    // IE extensions
    substr(from: number, length?: number): string;
}
declare var String: {
    new (value?: any): String;
    (value?: any): string;
    prototype: String;
    fromCharCode(...codes: number[]): string;
}

interface Boolean {
}
declare var Boolean: {
    new (value?: any): Boolean;
    (value?: any): bool;
    prototype: Boolean;
}

interface Number {
    toString(radix?: number): string;
    toFixed(fractionDigits?: number): string;
    toExponential(fractionDigits?: number): string;
    toPrecision(precision: number): string;
}
declare var Number: {
    new (value?: any): Number;
    (value?: any): number;
    prototype: Number;
    MAX_VALUE: number;
    MIN_VALUE: number;
    NaN: number;
    NEGATIVE_INFINITY: number;
    POSITIVE_INFINITY: number;
}

interface Math {
    E: number;
    LN10: number;
    LN2: number;
    LOG2E: number;
    LOG10E: number;
    PI: number;
    SQRT1_2: number;
    SQRT2: number;
    abs(x: number): number;
    acos(x: number): number;
    asin(x: number): number;
    atan(x: number): number;
    atan2(y: number, x: number): number;
    ceil(x: number): number;
    cos(x: number): number;
    exp(x: number): number;
    floor(x: number): number;
    log(x: number): number;
    max(...values: number[]): number;
    min(...values: number[]): number;
    pow(x: number, y: number): number;
    random(): number;
    round(x: number): number;
    sin(x: number): number;
    sqrt(x: number): number;
    tan(x: number): number;
}
declare var Math: Math;

interface Date {
    toString(): string;
    toDateString(): string;
    toTimeString(): string;
    toLocaleString(): string;
    toLocaleDateString(): string;
    toLocaleTimeString(): string;
    valueOf(): number;
    getTime(): number;
    getFullYear(): number;
    getUTCFullYear(): number;
    getMonth(): number;
    getUTCMonth(): number;
    getDate(): number;
    getUTCDate(): number;
    getDay(): number;
    getUTCDay(): number;
    getHours(): number;
    getUTCHours(): number;
    getMinutes(): number;
    getUTCMinutes(): number;
    getSeconds(): number;
    getUTCSeconds(): number;
    getMilliseconds(): number;
    getUTCMilliseconds(): number;
    getTimezoneOffset(): number;
    setTime(time: number): void;
    setMilliseconds(ms: number): void;
    setUTCMilliseconds(ms: number): void;
    setSeconds(sec: number, ms?: number): void;
    setUTCSeconds(sec: number, ms?: number): void;
    setMinutes(min: number, sec?: number, ms?: number): void;
    setUTCMinutes(min: number, sec?: number, ms?: number): void;
    setHours(hours: number, min?: number, sec?: number, ms?: number): void;
    setUTCHours(hours: number, min?: number, sec?: number, ms?: number): void;
    setDate(date: number): void;
    setUTCDate(date: number): void;
    setMonth(month: number, date?: number): void;
    setUTCMonth(month: number, date?: number): void;
    setFullYear(year: number, month?: number, date?: number): void;
    setUTCFullYear(year: number, month?: number, date?: number): void;
    toUTCString(): string;
    toISOString(): string;
    toJSON(key?: any): string;
}
declare var Date: {
    new (): Date;
    new (value: number): Date;
    new (value: string): Date;
    new (year: number, month: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number): Date;
    (): string;
    prototype: Date;
    parse(s: string): number;
    UTC(year: number, month: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number): number;
    now(): number;
}

interface RegExpExecArray {
    [index: number]: string;
    length: number;

    index: number;
    input: string;

    toString(): string;
    toLocaleString(): string;
    concat(...items: string[][]): string[];
    join(seperator?: string): string;
    pop(): string;
    push(...items: string[]): void;
    reverse(): string[];
    shift(): string;
    slice(start: number, end?: number): string[];
    sort(compareFn?: (a: string, b: string) => number): string[];
    splice(start: number): string[];
    splice(start: number, deleteCount: number, ...items: string[]): string[];
    unshift(...items: string[]): number;

    indexOf(searchElement: string, fromIndex?: number): number;
    lastIndexOf(searchElement: string, fromIndex?: number): number;
    every(callbackfn: (value: string, index: number, array: string[]) => bool, thisArg?: any): bool;
    some(callbackfn: (value: string, index: number, array: string[]) => bool, thisArg?: any): bool;
    forEach(callbackfn: (value: string, index: number, array: string[]) => void , thisArg?: any): void;
    map(callbackfn: (value: string, index: number, array: string[]) => any, thisArg?: any): any[];
    filter(callbackfn: (value: string, index: number, array: string[]) => bool, thisArg?: any): string[];
    reduce(callbackfn: (previousValue: any, currentValue: any, currentIndex: number, array: string[]) => any, initialValue?: any): any;
    reduceRight(callbackfn: (previousValue: any, currentValue: any, currentIndex: number, array: string[]) => any, initialValue?: any): any;
}


interface RegExp {
    exec(string: string): RegExpExecArray;
    test(string: string): bool;
    source: string;
    global: bool;
    ignoreCase: bool;
    multiline: bool;
    lastIndex: bool;
}
declare var RegExp: {
    new (pattern: string, flags?: string): RegExp;
    (pattern: string, flags?: string): RegExp;
}

interface Error {
    name: string;
    message: string;
    stack: string;
}
declare var Error: {
    new (message?: string): Error;
    (message?: string): Error;
    prototype: Error;
    captureStackTrace(error: Error, fn: Function);
}

interface EvalError extends Error {
}
declare var EvalError: {
    new (message?: string): EvalError;
    (message?: string): EvalError;
    prototype: EvalError;
}

interface RangeError extends Error {
}
declare var RangeError: {
    new (message?: string): RangeError;
    (message?: string): RangeError;
    protoype: RangeError;
}

interface ReferenceError extends Error {
}
declare var ReferenceError: {
    new (message?: string): ReferenceError;
    (message?: string): ReferenceError;
    protoype: ReferenceError;
}

interface SyntaxError extends Error {
}
declare var SyntaxError: {
    new (message?: string): SyntaxError;
    (message?: string): SyntaxError;
    protoype: SyntaxError;
}

interface TypeError extends Error {
}
declare var TypeError: {
    new (message?: string): TypeError;
    (message?: string): TypeError;
    protoype: TypeError;
}

interface URIError extends Error {
}
declare var URIError: {
    new (message?: string): URIError;
    (message?: string): URIError;
    protoype: URIError;
}

interface JSON {
    parse(text: string, reviver?: (key: any, value: any) => any): any;
    stringify(value: any): string;
    stringify(value: any, replacer: (key: string, value: any) => any): string;
    stringify(value: any, replacer: any[]): string;
    stringify(value: any, replacer: (key: string, value: any) => any, space: any): string;
    stringify(value: any, replacer: any[], space: any): string;
}
declare var JSON: JSON;

////////////////
/// ECMAScript Array API (specially handled by compiler)
////////////////

interface Array {
    toString(): string;
    toLocaleString(): string;
    concat(...items: _element[][]): _element[];
    join(seperator?: string): string;
    pop(): _element;
    push(...items: _element[]): void;
    reverse(): _element[];
    shift(): _element;
    slice(start: number, end?: number): _element[];
    sort(compareFn?: (a: _element, b: _element) => number): _element[];
    splice(start: number): _element[];
    splice(start: number, deleteCount: number, ...items: _element[]): _element[];
    unshift(...items: _element[]): number;

    indexOf(searchElement: _element, fromIndex?: number): number;
    lastIndexOf(searchElement: _element, fromIndex?: number): number;
    every(callbackfn: (value: _element, index: number, array: _element[]) => bool, thisArg?: any): bool;
    some(callbackfn: (value: _element, index: number, array: _element[]) => bool, thisArg?: any): bool;
    forEach(callbackfn: (value: _element, index: number, array: _element[]) => void , thisArg?: any): void;
    map(callbackfn: (value: _element, index: number, array: _element[]) => any, thisArg?: any): any[];
    filter(callbackfn: (value: _element, index: number, array: _element[]) => bool, thisArg?: any): _element[];
    reduce(callbackfn: (previousValue: any, currentValue: any, currentIndex: number, array: _element[]) => any, initialValue?: any): any;
    reduceRight(callbackfn: (previousValue: any, currentValue: any, currentIndex: number, array: _element[]) => any, initialValue?: any): any;

    length: number;
}
declare var Array: {
    new (...items: any[]): any[];
    (...items: any[]): any[];
    isArray(arg: any): bool;
    prototype: Array;
}

