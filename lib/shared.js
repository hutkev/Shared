// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.
/// <reference path='../defs/lib.d.ts' />
/// <reference path='../defs/node-0.8.d.ts' />
/// <reference path='../defs/mongodb.d.ts' />
/// <reference path='../defs/rsvp.d.ts' />
// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.
/// <reference path='import.ts' />
/// <reference path='utils.ts' />
/// <reference path='debug.ts' />
var shared;
(function (shared) {
    (function (utils) {
        var Tree = require('bintrees').RBTree;
        var Map = (function () {
            function Map(hashfn) {
                utils.dassert(utils.isValue(hashfn));
                this._size = 0;
                this._hashfn = hashfn;
                this._tree = new Tree(function (a, b) {
                    return a.hash - b.hash;
                });
            }
            Map.prototype.size = function () {
                return this._size;
            };
            Map.prototype.find = function (key) {
                utils.dassert(utils.isValue(key));
                var h = this._hashfn(key);
                var entries = this._tree.find({
                    hash: h
                });
                if(entries !== null) {
                    for(var i = 0; i < entries.values.length; i++) {
                        if(utils.isEqual(key, entries.values[i].key)) {
                            return entries.values[i].value;
                        }
                    }
                }
                return null;
            };
            Map.prototype.insert = function (key, value) {
                utils.dassert(utils.isValue(key));
                utils.dassert(utils.isValue(value));
                var h = this._hashfn(key);
                var entries = this._tree.find({
                    hash: h
                });
                if(entries !== null) {
                    var free = null;
                    for(var i = 0; i < entries.values.length; i++) {
                        if(entries.values[i].key === null) {
                            if(free === null) {
                                free = i;
                            }
                        } else if(utils.isEqual(key, entries.values[i].key)) {
                            return false;
                        }
                    }
                    if(free !== null) {
                        entries.values[free] = {
                            key: key,
                            value: value
                        };
                    } else {
                        entries.values.push({
                            key: key,
                            value: value
                        });
                    }
                } else {
                    this._tree.insert({
                        hash: h,
                        values: [
                            {
                                key: key,
                                value: value
                            }
                        ]
                    });
                }
                this._size++;
                return true;
            };
            Map.prototype.findOrInsert = function (key, proto) {
                if (typeof proto === "undefined") { proto = {
                }; }
                var val = this.find(key);
                if(val !== null) {
                    return val;
                } else {
                    this.insert(key, proto);
                    return proto;
                }
            };
            Map.prototype.remove = function (key) {
                utils.dassert(utils.isValue(key));
                var h = this._hashfn(key);
                var entries = this._tree.find({
                    hash: h
                });
                if(entries !== null) {
                    var found = true;
                    for(var i = 0; i < entries.values.length; i++) {
                        if(utils.isEqual(key, entries.values[i].key)) {
                            entries.values[i].key = null;
                            entries.values[i].value = null;
                            this._size--;
                            return true;
                        }
                    }
                }
                return false;
            };
            Map.prototype.apply = function (handler) {
                var it = this._tree.iterator();
                while(it.next()) {
                    var row = it.data();
                    for(var i = 0; i < row.values.length; i++) {
                        if(row.values[i].key !== null) {
                            if(handler(row.values[i].key, row.values[i].value) === false) {
                                return false;
                            }
                        }
                    }
                }
                return true;
            };
            Map.prototype.removeAll = function () {
                this._tree.clear();
                this._size = 0;
            };
            return Map;
        })();
        utils.Map = Map;        
        /**
        * A simple string set
        */
        var StringSet = (function () {
            function StringSet(names) {
                if (typeof names === "undefined") { names = []; }
                this._map = new Map(function (k) {
                    return utils.hash(k.toString());
                });
                this._id = 0;
                for(var i = 0; i < names.length; i++) {
                    this.put(names[i]);
                }
            }
            StringSet.prototype.put = function (key) {
                var ok = this._map.insert(key, this._id);
                if(ok) {
                    this._id++;
                }
                return ok;
            };
            StringSet.prototype.has = function (key) {
                return this._map.find(key) !== null;
            };
            StringSet.prototype.id = function (key) {
                return this._map.find(key);
            };
            StringSet.prototype.remove = function (key) {
                return this._map.remove(key);
            };
            StringSet.prototype.size = function () {
                return this._map.size();
            };
            StringSet.prototype.removeAll = function () {
                return this._map.removeAll();
            };
            StringSet.prototype.apply = function (handler) {
                return this._map.apply(function (key, value) {
                    return handler(key);
                });
            };
            return StringSet;
        })();
        utils.StringSet = StringSet;        
        /**
        * A simple queue, items can be added/removed from the
        * head/tail with random access and assertions thrown in.
        */
        var Queue = (function () {
            function Queue() {
                this._elems = [];
            }
            Queue.prototype.size = function () {
                return this._elems.length;
            };
            Queue.prototype.empty = function () {
                return this.size() === 0;
            };
            Queue.prototype.front = function () {
                return this.at(0);
            };
            Queue.prototype.back = function () {
                return this.at(this.size() - 1);
            };
            Queue.prototype.at = function (i) {
                utils.dassert(i >= 0 && i < this.size());
                return this._elems[i];
            };
            Queue.prototype.setAt = function (i, value) {
                utils.dassert(i >= 0 && i < this.size());
                this._elems[i] = value;
            };
            Queue.prototype.push = function (value) {
                this._elems.push(value);
            };
            Queue.prototype.pop = function () {
                utils.dassert(!this.empty());
                return this._elems.pop();
            };
            Queue.prototype.unshift = function (value) {
                this._elems.unshift(value);
            };
            Queue.prototype.shift = function () {
                utils.dassert(!this.empty());
                return this._elems.shift();
            };
            Queue.prototype.array = function () {
                return this._elems;
            };
            Queue.prototype.first = function (match) {
                for(var i = 0; i < this._elems.length; i++) {
                    if(match(this._elems[i])) {
                        return this._elems[i];
                    }
                }
                return null;
            };
            Queue.prototype.filter = function (match) {
                var matched = new Queue();
                for(var i = 0; i < this._elems.length; i++) {
                    if(match(this._elems[i])) {
                        matched.push(this._elems[i]);
                    }
                }
                return matched;
            };
            Queue.prototype.apply = function (func) {
                for(var i = 0; i < this._elems.length; i++) {
                    func(this._elems[i]);
                }
            };
            return Queue;
        })();
        utils.Queue = Queue;        
    })(shared.utils || (shared.utils = {}));
    var utils = shared.utils;
    // module utils
    })(shared || (shared = {}));
// module shared
var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.
/// <reference path='import.ts' />
/// <reference path='collect.ts' />
var shared;
(function (shared) {
    (function (utils) {
        var fs = require('fs');
        var assert = require('assert');
        var util = require('util');
        var cluster = require('cluster');
        /**
        * Log message levels, should really be an enum.
        * Logs include messages for current level and higher. NONE turns off
        * logging.
        */
        utils.LogLevel = {
            INFO: 1,
            WARN: 2,
            FATAL: 3,
            NONE: 4
        };
        /**
        * Writable FD
        */
        var WriteableFD = (function () {
            function WriteableFD(fd) {
                this._fd = fd;
            }
            WriteableFD.prototype.write = function (str) {
                var b = new Buffer(str);
                fs.writeSync(this._fd, b, 0, b.length, null);
            };
            return WriteableFD;
        })();
        utils.WriteableFD = WriteableFD;        
        /**
        * Logger helper
        */
        var Logger = (function () {
            function Logger(to, prefix, level, debug, next) {
                this._to = to;
                this._prefix = prefix;
                this._level = level;
                this._debug = new utils.StringSet(debug);
                this._next = next;
            }
            Logger.prototype.logLevel = function () {
                return this._level;
            };
            Logger.prototype.isDebugLogging = function (component) {
                return this._debug.has(component);
            };
            Logger.prototype.enableDebugLogging = function (component, on) {
                if(utils.isValue(on) && !on) {
                    this._debug.remove(component);
                } else {
                    this._debug.put(component);
                }
            };
            Logger.prototype.disableDebugLogging = function () {
                this._debug.removeAll();
            };
            Logger.prototype.debug = function (component, fmt) {
                var msgs = [];
                for (var _i = 0; _i < (arguments.length - 2); _i++) {
                    msgs[_i] = arguments[_i + 2];
                }
                if(this.isDebugLogging(component)) {
                    var f = component + ': ' + fmt;
                    this.log(utils.LogLevel.INFO, f, msgs);
                    if(this._next) {
                        this._next.log(utils.LogLevel.INFO, f, msgs);
                    }
                }
            };
            Logger.prototype.info = function (fmt) {
                var msgs = [];
                for (var _i = 0; _i < (arguments.length - 1); _i++) {
                    msgs[_i] = arguments[_i + 1];
                }
                this.log(utils.LogLevel.INFO, fmt, msgs);
                if(this._next) {
                    this._next.log(utils.LogLevel.INFO, fmt, msgs);
                }
            };
            Logger.prototype.warn = function (fmt) {
                var msgs = [];
                for (var _i = 0; _i < (arguments.length - 1); _i++) {
                    msgs[_i] = arguments[_i + 1];
                }
                this.log(utils.LogLevel.WARN, fmt, msgs);
                if(this._next) {
                    this._next.log(utils.LogLevel.INFO, fmt, msgs);
                }
            };
            Logger.prototype.fatal = function (fmt) {
                var msgs = [];
                for (var _i = 0; _i < (arguments.length - 1); _i++) {
                    msgs[_i] = arguments[_i + 1];
                }
                this.log(utils.LogLevel.FATAL, fmt, msgs);
                if(this._next) {
                    this._next.log(utils.LogLevel.FATAL, fmt, msgs);
                }
            };
            Logger.prototype.write = function (msg) {
                this._to.write(msg);
                if(this._next) {
                    this._next.write(msg);
                }
            };
            Logger.prototype.trace = function (fmt) {
                var msgs = [];
                for (var _i = 0; _i < (arguments.length - 1); _i++) {
                    msgs[_i] = arguments[_i + 1];
                }
                var e = new Error();
                e.name = 'Trace';
                e.message = utils.dateFormat(this._prefix, fmt, msgs);
                Error.captureStackTrace(e, arguments.callee);
                this.write(e.stack + '\n');
            };
            Logger.prototype.log = function (type, fmt, msgs) {
                switch(type) {
                    case utils.LogLevel.INFO:
                        if(this.logLevel() <= utils.LogLevel.INFO) {
                            this._to.write(utils.dateFormat(this._prefix + ' INFO', fmt, msgs));
                        }
                        break;
                    case utils.LogLevel.WARN:
                        if(this.logLevel() <= utils.LogLevel.WARN) {
                            this._to.write(utils.dateFormat(this._prefix + ' WARNING', fmt, msgs));
                        }
                        break;
                    case utils.LogLevel.FATAL:
                        if(this.logLevel() <= utils.LogLevel.FATAL) {
                            var err = utils.dateFormat(this._prefix + ' FATAL', fmt, msgs);
                            this._to.write(err);
                            if(!utils.isValue(this._next)) {
                                throw new Error('Fatal error: ' + err);
                            }
                        }
                        break;
                    case utils.LogLevel.NONE:
                        break;
                    default:
                        dassert(false);
                        break;
                }
                if(this._next) {
                    this._next.log(utils.LogLevel.INFO, fmt, msgs);
                }
            };
            return Logger;
        })();
        utils.Logger = Logger;        
        /**
        * File logger
        */
        var FileLogger = (function (_super) {
            __extends(FileLogger, _super);
            function FileLogger(fileprefix, prefix, level, subjects, next) {
                var w = this.openLog(fileprefix);
                        _super.call(this, w, prefix, level, subjects, next);
            }
            FileLogger.prototype.openLog = function (fileprefix) {
                var i = 0;
                while(true) {
                    var name = fileprefix + '-' + process.pid + '-' + i;
                    try  {
                        var fd = fs.openSync(name, 'ax', '0666');
                        return new WriteableFD(fd);
                    } catch (e) {
                        // Try again with another suffix
                        i++;
                        if(i === 10) {
                            throw e;
                        }
                    }
                }
            };
            return FileLogger;
        })(Logger);
        utils.FileLogger = FileLogger;        
        var _defaultLogger = null;
        /**
        * Set a logger to be used as the default for modules.
        */
        function setdefaultLogger(logger) {
            dassert(utils.isValue(logger));
            _defaultLogger = logger;
        }
        utils.setdefaultLogger = setdefaultLogger;
        /**
        * Obtains the default logger. If one has not been set then logging is
        * to process.stdout at the INFO level.
        */
        function defaultLogger() {
            if(!_defaultLogger) {
                var prefix = 'master';
                if(cluster.worker) {
                    prefix = 'work ' + cluster.worker.id;
                }
                _defaultLogger = new Logger(process.stdout, prefix, utils.LogLevel.INFO, []);
            }
            return _defaultLogger;
        }
        utils.defaultLogger = defaultLogger;
        var _assertsEnabled = true;
        /**
        * Enable/Disable internal asserts.
        */
        function enableAsserts(on) {
            _assertsEnabled = on;
        }
        utils.enableAsserts = enableAsserts;
        /**
        * Are assert enabled?
        */
        function assertsEnabled() {
            return _assertsEnabled;
        }
        utils.assertsEnabled = assertsEnabled;
        /**
        * Switchable assert handler.
        */
        function dassert(test) {
            if(_assertsEnabled) {
                assert.ok(test);
            }
        }
        utils.dassert = dassert;
    })(shared.utils || (shared.utils = {}));
    var utils = shared.utils;
    // module utils
    })(shared || (shared = {}));
// module shared
// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.
/// <reference path='import.ts' />
/// <reference path='debug.ts' />
var shared;
(function (shared) {
    (function (utils) {
        var _ = require('underscore');
        var os = require('os');
        /*
        * String hash, see http://www.cse.yorku.ca/~oz/hash.html
        */
        function hash(str, prime) {
            utils.dassert(isValue(str));
            var hash = 5381;
            if(isValue(prime)) {
                hash = prime;
            }
            var len = str.length;
            for(var i = 0; i < len; i++) {
                hash = ((hash << 5) - hash) + str.charCodeAt(i);
                hash = hash & hash;
            }
            return hash;
        }
        utils.hash = hash;
        /**
        * Deep Equals
        */
        function isEqual(x, y) {
            return _.isEqual(x, y);
        }
        utils.isEqual = isEqual;
        /**
        * Non-null or undefined value
        */
        function isValue(arg) {
            return arg !== undefined && arg !== null;
        }
        utils.isValue = isValue;
        /**
        * Non-null object value
        */
        function isObject(value) {
            return (value && typeof value === 'object' && !(value instanceof Array));
        }
        utils.isObject = isObject;
        /**
        * Non-null array value
        */
        function isArray(value) {
            return (value && typeof value === 'object' && (value instanceof Array));
        }
        utils.isArray = isArray;
        /**
        * Non-null object or array value
        */
        function isObjectOrArray(value) {
            return (value && typeof value === 'object');
        }
        utils.isObjectOrArray = isObjectOrArray;
        /**
        * Corrected type of value.
        * Arrays & null are not 'objects'
        */
        function typeOf(value) {
            var s = typeof value;
            if(s === 'object') {
                if(value) {
                    if(value instanceof Array) {
                        s = 'array';
                    }
                } else {
                    s = 'null';
                }
            }
            return s;
        }
        utils.typeOf = typeOf;
        /**
        * Corrected type of value.
        * Arrays & null are not 'objects'
        * Objects return their prototype type.
        */
        function treatAs(value) {
            var s = typeof value;
            if(s === 'object') {
                if(value) {
                    return Object.prototype.toString.call(value).match(/^\[object\s(.*)\]$/)[1];
                } else {
                    s = 'null';
                }
            }
            return s;
        }
        utils.treatAs = treatAs;
        function cloneArray(obj) {
            utils.dassert(isArray(obj));
            return obj.slice(0);
        }
        utils.cloneArray = cloneArray;
        function cloneObject(obj) {
            utils.dassert(isObject(obj));
            var temp = {
            };
            for(var key in obj) {
                temp[key] = obj[key];
            }
            return temp;
        }
        utils.cloneObject = cloneObject;
        function clone(obj) {
            if(isObject(obj)) {
                return cloneObject(obj);
            } else {
                return cloneArray(obj);
            }
        }
        utils.clone = clone;
        // ES5 9.2
        function toInteger(val) {
            var v = +val;// toNumber conversion
            
            if(isNaN(v)) {
                return 0;
            }
            if(v === 0 || v === Infinity || v == -Infinity) {
                return v;
            }
            if(v < 0) {
                return -1 * Math.floor(-v);
            } else {
                return Math.floor(v);
            }
        }
        utils.toInteger = toInteger;
        function dateFormat(type, fmt, args) {
            return new Date().toISOString() + ' ' + format(type, fmt, args);
        }
        utils.dateFormat = dateFormat;
        function format(type, fmt, args) {
            var m = '';
            if(type !== null && type.length > 0) {
                m += (type + ' ');
            }
            var i = 0;
            var len = args.length;
            var str = m + String(fmt).replace(/%[sdj%]/g, function (x) {
                if(x === '%%') {
                    return '%';
                }
                if(i >= len) {
                    return x;
                }
                switch(x) {
                    case '%s':
                        return String(args[i++]);
                    case '%d':
                        return Number(args[i++]).toString();
                    case '%j':
                        return JSON.stringify(args[i++]);
                    default:
                        return x;
                }
            });
            str += '\n';
            for(var x = args[i]; i < len; x = args[++i]) {
                if(x === null || typeof x !== 'object') {
                    str += x + '\n';
                } else {
                    str += JSON.stringify(x, null, ' ') + '\n';
                }
            }
            return str;
        }
        utils.format = format;
        var _hostInfo = null;
        function hostInfo() {
            if(_hostInfo === null) {
                _hostInfo = os.hostname();
                var ifaces = os.networkInterfaces();
                for(var dev in ifaces) {
                    var alias = 0;
                    ifaces[dev].forEach(function (details) {
                        if(details.family === 'IPv4' && details.address !== '127.0.0.1') {
                            _hostInfo += ' [' + details.address + ']';
                            ++alias;
                        }
                    });
                }
            }
            return _hostInfo;
        }
        utils.hostInfo = hostInfo;
        function exceptionInfo(e) {
            if(e instanceof Error) {
                return e.stack;
            } else {
                return JSON.stringify(e);
            }
        }
        utils.exceptionInfo = exceptionInfo;
    })(shared.utils || (shared.utils = {}));
    var utils = shared.utils;
    // module utils
    })(shared || (shared = {}));
// module shared
// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.
/// <reference path='import.ts' />
var shared;
(function (shared) {
    (function (utils) {
        var ObjectID = require('mongodb').ObjectID;
        /*
        * A network wide unique id wrapper.
        * Pragmatically it must be a UUID and exposable as a string.
        */
        utils.uidStringLength = 24;
        function UID() {
            return new ObjectID();
        }
        utils.UID = UID;
        function isUID(a) {
            return (a instanceof ObjectID);
        }
        utils.isUID = isUID;
        function makeUID(id) {
            var uid = new ObjectID(id);
            utils.dassert(isUID(uid) && uid.toString() == id.toLowerCase());
            return uid;
        }
        utils.makeUID = makeUID;
        function toObjectID(id) {
            return id;
        }
        utils.toObjectID = toObjectID;
        /*
        * Identifiable object helper
        */
        var UniqueObject = (function () {
            function UniqueObject() {
                this._id = null;
            }
            UniqueObject.prototype.id = function () {
                if(this._id === null) {
                    this._id = UID();
                }
                return this._id;
            };
            return UniqueObject;
        })();
        utils.UniqueObject = UniqueObject;        
        /*
        * Map specialized for using id keys. A bodge until generics are supported.
        */
        var IdMap = (function () {
            function IdMap() {
                this._map = new shared.utils.Map(shared.utils.hash);
            }
            IdMap.prototype.size = function () {
                return this._map.size();
            };
            IdMap.prototype.find = function (key) {
                return this._map.find(key.toString());
            };
            IdMap.prototype.insert = function (key, value) {
                return this._map.insert(key.toString(), value);
            };
            IdMap.prototype.findOrInsert = function (key, proto) {
                if (typeof proto === "undefined") { proto = {
                }; }
                return this._map.findOrInsert(key.toString(), proto);
            };
            IdMap.prototype.remove = function (key) {
                return this._map.remove(key.toString());
            };
            IdMap.prototype.apply = function (handler) {
                return this._map.apply(function (k, v) {
                    return handler(makeUID(k), v);
                });
            };
            IdMap.prototype.removeAll = function () {
                this._map.removeAll();
            };
            return IdMap;
        })();
        utils.IdMap = IdMap;        
    })(shared.utils || (shared.utils = {}));
    var utils = shared.utils;
    // module utils
    })(shared || (shared = {}));
// module shared
// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.
/// <reference path='import.ts' />
/// <reference path='utils.ts' />
/// <reference path='collect.ts' />
/// <reference path='id.ts' />
var shared;
(function (shared) {
    (function (types) {
        var TypeDesc = (function (_super) {
            __extends(TypeDesc, _super);
            function TypeDesc(isobj, props) {
                        _super.call(this);
                this._isobj = isobj;
                this._props = props;
            }
            TypeDesc.prototype.isobj = function () {
                return this._isobj;
            };
            TypeDesc.prototype.isarray = function () {
                return !this._isobj;
            };
            TypeDesc.prototype.props = function () {
                return this._props;
            };
            TypeDesc.prototype.typeDesc = function () {
                var props = 'o#';
                if(this.isarray()) {
                    props = 'a#';
                }
                for(var i = 0; i < this._props.length; i++) {
                    props += this._props[i];
                    props += '#';
                }
                return props;
            };
            return TypeDesc;
        })(shared.utils.UniqueObject);
        types.TypeDesc = TypeDesc;        
        var TypeStore = (function () {
            function TypeStore() {
                shared.utils.dassert(TypeStore._instance == null);
                this._tree = new shared.utils.Map(shared.utils.hash);
            }
            TypeStore.instance = function instance() {
                if(!TypeStore._instance) {
                    TypeStore._instance = new TypeStore();
                }
                return TypeStore._instance;
            };
            TypeStore.prototype.type = function (obj) {
                shared.utils.dassert(shared.utils.isObjectOrArray(obj));
                var p = TypeStore.props(obj);
                var td = this._tree.find(p);
                if(td === null) {
                    var ps = p.split('#');
                    ps.shift();
                    ps.pop();
                    td = new TypeDesc(shared.utils.isObject(obj), ps);
                    this._tree.insert(p, td);
                }
                return td;
            };
            TypeStore.props = function props(obj) {
                shared.utils.dassert(shared.utils.isObjectOrArray(obj));
                var props = 'o#';
                if(obj instanceof Array) {
                    props = 'a#';
                }
                for(var prop in obj) {
                    if(obj.hasOwnProperty(prop)) {
                        props += prop;
                        props += '#';
                    }
                }
                return props;
            };
            return TypeStore;
        })();
        types.TypeStore = TypeStore;        
    })(shared.types || (shared.types = {}));
    var types = shared.types;
    // types
    })(shared || (shared = {}));
// shared
// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.
/// <reference path='import.ts' />
/// <reference path='utils.ts' />
/// <reference path='id.ts' />
var shared;
(function (shared) {
    (function (serial) {
        /*
        * Object/Array reference holder. Used to represent a reference when
        * de-serialising data.
        */
        var Reference = (function () {
            function Reference(id) {
                shared.utils.dassert(shared.utils.isUID(id));
                this._id = id;
            }
            Reference.prototype.id = function () {
                return this._id;
            };
            return Reference;
        })();
        serial.Reference = Reference;        
        /*
        * Append serialized form of an object/array onto the supplied string.
        * Returns the passed string.
        */
        function writeObject(rh, obj, to, identify) {
            if (typeof to === "undefined") { to = ''; }
            if (typeof identify === "undefined") { identify = false; }
            shared.utils.dassert(shared.utils.isObjectOrArray(rh));
            shared.utils.dassert(shared.utils.isObjectOrArray(obj));
            if(obj instanceof Array) {
                to += '[';
            } else {
                to += '{';
            }
            if(identify) {
                to += rh.valueId(obj) + ' ';
                to += rh.valueRev(obj) + ' ';
            }
            var k = Object.keys(obj);
            for(var i = 0; i < k.length; i++) {
                to = writeValue(rh, k[i], to);
                to += ":";
                to = writeValue(rh, obj[k[i]], to);
                if(i < k.length - 1) {
                    to += ',';
                }
            }
            if(obj instanceof Array) {
                to += ']';
            } else {
                to += '}';
            }
            return to;
        }
        serial.writeObject = writeObject;
        /*
        * Append serialized form of a value onto the supplied string.
        * Object/Array values are serialised by reference, see writeObject() for
        * full serialisation of object/array properties. Returns the passed string.
        */
        function writeValue(rh, value, to) {
            if (typeof to === "undefined") { to = ''; }
            shared.utils.dassert(shared.utils.isObject(rh));
            var type = shared.utils.treatAs(value);
            switch(type) {
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
                    shared.utils.defaultLogger().fatal('Unexpected type: %s', type);
                    break;
            }
            return to;
        }
        serial.writeValue = writeValue;
        function readObject(str, proto) {
            shared.utils.dassert(str.length > 1 && (str.charAt(0) === '[' || str.charAt(0) === '{') && (str.charAt(str.length - 1) === ']' || str.charAt(str.length - 1) === '}'));
            // Check is we have a proto & its the right type
            if(str.charAt(0) === '{') {
                if(!shared.utils.isValue(proto)) {
                    proto = {
                    };
                } else {
                    shared.utils.dassert(shared.utils.isObject(proto));
                }
            } else {
                if(!shared.utils.isValue(proto)) {
                    proto = [];
                } else {
                    shared.utils.dassert(shared.utils.isArray(proto));
                    // Prop delete does not work well on arrays so zero proto
                    proto.length = 0;
                }
            }
            // Read props
            var rs = new ReadStream(str.substr(1, str.length - 2));
            var keys = Object.keys(proto);
            var k = 0;
            while(true) {
                rs.skipWS();
                if(rs.eof()) {
                    break;
                }
                // Read prop name
                var prop = rs.readNextValue();
                shared.utils.dassert(typeof prop === 'string');
                // Delete rest of proto props if does not match what is being read
                if(k !== -1 && prop != keys[k]) {
                    for(var i = k; i < keys.length; i++) {
                        delete proto[keys[i]];
                    }
                    k = -1;
                }
                // Skip ':'
                rs.skipWS();
                shared.utils.dassert(!rs.eof());
                shared.utils.dassert(rs.peek() === ':');
                rs.skip();
                rs.skipWS();
                // Read value & assign
                var value = rs.readNextValue();
                proto[prop] = value;
                // Skip ',' if present
                rs.skipWS();
                if(!rs.eof()) {
                    shared.utils.dassert(rs.peek() === ',');
                    rs.skip();
                    rs.skipWS();
                } else {
                    break;
                }
            }
            return proto;
        }
        serial.readObject = readObject;
        /*
        * Read a value as encoded by writeValue. The passed string must contain
        * one complete value with no leading or trailing characters. May return
        * null if passed 'null'.
        */
        function readValue(str) {
            shared.utils.dassert(shared.utils.isValue(str));
            var rs = new ReadStream(str);
            return rs.readNextValue();
        }
        serial.readValue = readValue;
        var ReadStream = (function () {
            function ReadStream(from) {
                shared.utils.dassert(shared.utils.isValue(from));
                this._from = from;
                this._at = 0;
            }
            ReadStream._numberPat = /^-?(0|([1-9][0-9]*))(\.[0-9]+)?([eE][-+][0-9]+)?/;
            ReadStream.prototype.eof = function () {
                return this._at >= this._from.length;
            };
            ReadStream.prototype.skip = function (n) {
                if (typeof n === "undefined") { n = 1; }
                this._at += n;
            };
            ReadStream.prototype.skipWS = function () {
                while(this._at < this._from.length && (this._from[this._at] === ' ' || this._from[this._at] === '\t')) {
                    this._at++;
                }
            };
            ReadStream.prototype.peek = function (n) {
                if (typeof n === "undefined") { n = 0; }
                shared.utils.dassert(this._at + n < this._from.length);
                return this._from[this._at + n];
            };
            ReadStream.prototype.readNextValue = /*
            * Read a value as encoded by writeValue. The passed string must contain
            * one complete value with no leading or trailing characters. May return
            * null if passed 'null'.
            */
            function () {
                // Simple things first
                if(this._from.substr(this._at, 4) === 'null') {
                    this._at += 4;
                    return null;
                } else if(this._from.substr(this._at, 9) === 'undefined') {
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
                if(this._from.charAt(this._at) === '"') {
                    var end = this._at + 1;
                    while(end < this._from.length) {
                        if(this._from.charAt(end) === '\\') {
                            end += 1;
                        } else if(this._from.charAt(end) === '"') {
                            break;
                        }
                        end += 1;
                    }
                    if(end < this._from.length) {
                        var s = this._from.substr(this._at, end - this._at + 1);
                        this._at = end + 1;
                        return JSON.parse(s);
                    }
                }
                // Reference?
                if(this._from.charAt(this._at) === '<' && this._from.charAt(this._at + 1 + shared.utils.uidStringLength) === '>') {
                    var id = this._from.substr(this._at + 1, shared.utils.uidStringLength);
                    this._at += (2 + shared.utils.uidStringLength);
                    return new Reference(shared.utils.makeUID(id));
                }
                // Maybe a number
                var l = this.numberLength();
                if(l) {
                    var n = parseFloat(this._from.substr(this._at));
                    shared.utils.dassert(!isNaN(n));
                    this._at += l;
                    return n;
                }
                shared.utils.defaultLogger().fatal('Unexpected value encoding: %s', this._from.substr(this._at));
            };
            ReadStream.prototype.numberLength = function () {
                var ex = ReadStream._numberPat.exec(this._from.substr(this._at));
                if(ex) {
                    return ex[0].length;
                } else {
                    return 0;
                }
            };
            return ReadStream;
        })();        
    })(shared.serial || (shared.serial = {}));
    var serial = shared.serial;
    // tracker
    })(shared || (shared = {}));
// shared
// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.
/// <reference path='import.ts' />
/// <reference path='utils.ts' />
/// <reference path='id.ts' />
/// <reference path='types.ts' />
/// <reference path='serial.ts' />
/*
* Tracking provides a core service to enabling monitoring of how objects
* an arrays are changed over some period. It has similar motives to the
* proposed Object.observe model but is specifically designed to be
* node portable & suitable for distributed transactions.
*
* This code generates raw tracking logs. They need post-processing for
* most use cases, see mtx.ts for code that does this in this case.
*/
var shared;
(function (shared) {
    (function (tracker) {
        var Buffer = require('buffer');
        /*
        * Exception for indicating the cache is missing an object
        * needed for navigation.
        */
        var UnknownReference = (function () {
            // Id of missing object
            function UnknownReference(id, prop, missing) {
                this._id = id;
                this._prop = prop;
                this._missing = missing;
            }
            UnknownReference.prototype.id = function () {
                return this._id;
            };
            UnknownReference.prototype.prop = function () {
                return this._prop;
            };
            UnknownReference.prototype.missing = function () {
                return this._missing;
            };
            return UnknownReference;
        })();
        tracker.UnknownReference = UnknownReference;        
        /*
        * Recover the tracker for an object/array, may return null
        */
        function getTrackerUnsafe(value) {
            if(value._tracker === undefined) {
                return null;
            }
            return value._tracker;
        }
        tracker.getTrackerUnsafe = getTrackerUnsafe;
        /*
        * Recover the tracker for an object/array
        */
        function getTracker(value) {
            shared.utils.dassert(shared.utils.isObject(value._tracker));
            return value._tracker;
        }
        tracker.getTracker = getTracker;
        /*
        * Test if object is tracked
        */
        function isTracked(value) {
            return shared.utils.isObject(value._tracker);
        }
        tracker.isTracked = isTracked;
        /*
        * Object/Array tracker. Construct this over an object/array and it will
        * attach itself to that object/array as a non-enumerable '_tracker' property.
        * This is kind of odd, but saves doing object->tracker lookups. The downside
        * is to avoid a circular ref many tracker methods must be passed the objects
        * they are tracking as this is not recorded in the tracker itself.
        *
        * The tracker wraps the enumerable properties of the object/array so that
        * it can log reads to other objects/arrays and any mutations. The log can
        * be accessed via changes().
        *
        * The mechanics here are messy so I have simply tried to write this as correct
        * rather than as quick & correct. A bit of extra thought can probably
        * improve the performance a lot.
        */
        var Tracker = (function () {
            function Tracker(tc, obj, id, rev) {
                if (typeof id === "undefined") { id = shared.utils.UID(); }
                shared.utils.dassert(shared.utils.isObject(tc));
                shared.utils.dassert(shared.utils.isUID(id));
                // Error check
                if(obj === null || typeof (obj) !== 'object') {
                    shared.utils.defaultLogger().fatal('Trying to track non-object/array type');
                }
                if(obj.hasOwnProperty('_tracker')) {
                    shared.utils.defaultLogger().fatal('Trying to track already tracked object or array');
                }
                // Init
                this._tc = tc;
                this._rev = rev || 0;
                this._id = id;
                this._lastTx = -1;
                this._id = id;
                this._type = shared.types.TypeStore.instance().type(obj);
                this._userdata = null;
                this._ref = 0;
                // Add tracker to object
                Object.defineProperty(obj, '_tracker', {
                    value: this
                });
                // Start tracking
                if(obj instanceof Array) {
                    trackArray(obj);
                }
                for(var prop in obj) {
                    this.track(obj, prop);
                }
            }
            Tracker.prototype.kill = /*
            * When trackers die they lose connection to the cache. Normally
            * they die when changes to the object can not be undone and so
            * the object needs to be refreshed from the master cache.
            */
            function () {
                this._tc = null;
            };
            Tracker.prototype.isDead = /*
            * Has this tracker/object combo died
            */
            function () {
                return this._tc === null;
            };
            Tracker.prototype.tc = /**
            * Get the tracker cache this tracker is using
            */
            function () {
                return this._tc;
            };
            Tracker.prototype.id = /**
            * Get the unique object id
            */
            function () {
                return this._id;
            };
            Tracker.prototype.type = /**
            * Get the objects (pre-changes) type
            */
            function () {
                return this._type;
            };
            Tracker.prototype.rev = /**
            * Get/Increment the object revision, returning new value
            */
            function (by) {
                if(by !== undefined) {
                    this._rev += by;
                }
                return this._rev;
            };
            Tracker.prototype.setRev = /**
            * Set object rev to a value, must be >= to existing rev
            */
            function (to) {
                if(to >= this._rev) {
                    this._rev = to;
                }
                return this._rev;
            };
            Tracker.prototype.ref = /**
            * Get/Increment the object revision, returning new value
            */
            function (by) {
                if(by !== undefined) {
                    this._ref += by;
                }
                return this._ref;
            };
            Tracker.prototype.setRef = /**
            * Set object rev to a value, must be >= to existing rev
            */
            function (to) {
                if(to >= this._ref) {
                    this._ref = to;
                }
                return this._ref;
            };
            Tracker.prototype.setData = /*
            * Set a user supplied data object
            */
            function (ud) {
                this._userdata = ud;
            };
            Tracker.prototype.getData = /*
            * Get a user supplied data object
            */
            function () {
                return this._userdata;
            };
            Tracker.prototype.hasChanges = /*
            * Has a change been recorded against the object
            */
            function () {
                return (this._lastTx != -1);
            };
            Tracker.prototype.lastChange = /*
            * The index of the last recorded change in the mtx
            */
            function () {
                return this._lastTx;
            };
            Tracker.prototype.setLastChange = /*
            * Update the index of the last recorded change in the mtx
            */
            function (tx) {
                this._lastTx = tx;
            };
            Tracker.prototype.addNew = /**
            * Change notification handlers called to record changes
            */
            function (obj, prop, value) {
                shared.utils.dassert(getTracker(obj) === this);
                this._lastTx = this.tc().addNew(obj, prop, value, this._lastTx);
            };
            Tracker.prototype.addWrite = function (obj, prop, value, last) {
                shared.utils.dassert(getTracker(obj) === this);
                this._lastTx = this.tc().addWrite(obj, prop, value, last, this._lastTx);
            };
            Tracker.prototype.addDelete = function (obj, prop) {
                shared.utils.dassert(getTracker(obj) === this);
                this._lastTx = this.tc().addDelete(obj, prop, this._lastTx);
            };
            Tracker.prototype.addReverse = function (obj) {
                shared.utils.dassert(getTracker(obj) === this);
                this._lastTx = this.tc().addReverse(obj, this._lastTx);
            };
            Tracker.prototype.addSort = function (obj) {
                shared.utils.dassert(getTracker(obj) === this);
                this._lastTx = this.tc().addSort(obj, this._lastTx);
            };
            Tracker.prototype.addShift = function (obj, at, size) {
                shared.utils.dassert(getTracker(obj) === this);
                this._lastTx = this.tc().addShift(obj, at, size, this._lastTx);
            };
            Tracker.prototype.addUnshift = function (obj, at, size) {
                shared.utils.dassert(getTracker(obj) === this);
                this._lastTx = this.tc().addUnshift(obj, at, size, this._lastTx);
            };
            Tracker.prototype.retrack = /*
            * Make sure all properties are being tracked
            */
            function (obj) {
                shared.utils.dassert(getTracker(obj) === this);
                for(var prop in obj) {
                    if(!isPropTracked(obj, prop)) {
                        this.track(obj, prop);
                    }
                }
                this._type = shared.types.TypeStore.instance().type(obj);
            };
            Tracker.prototype.track = /**
            * Wrap a property for get/set tracking
            */
            function (obj, prop) {
                shared.utils.dassert(getTracker(obj) === this);
                if(obj.hasOwnProperty(prop)) {
                    var value = obj[prop];
                    if(delete obj[prop]) {
                        wrapProp(obj, prop, value);
                    } else {
                        throw new Error('Unwrappable property found: ' + prop);
                    }
                }
            };
            Tracker.prototype.uprev = /**
            * Uprev an object recording new properties
            */
            function (obj) {
                shared.utils.dassert(getTracker(obj) === this);
                this._rev += 1;
                this._type = shared.types.TypeStore.instance().type(obj);
            };
            Tracker.prototype.downrev = /**
            * Down rev (undo) an object recording new properties
            */
            function (obj) {
                shared.utils.dassert(getTracker(obj) === this);
                if(this._lastTx !== -1) {
                    this._lastTx = -1;
                    this._rev -= 1;
                    this._type = shared.types.TypeStore.instance().type(obj);
                }
            };
            return Tracker;
        })();
        tracker.Tracker = Tracker;        
        /*
        * Utility methods that aid the tracker.
        */
        function lexSort(a, b) {
            var astr = a.toString();
            var bstr = b.toString();
            if(astr < bstr) {
                return -1;
            }
            if(astr > bstr) {
                return 1;
            }
            return 0;
        }
        function trackArray(arr) {
            Object.defineProperty(arr, 'shift', {
                enumerable: false,
                configurable: false,
                value: function () {
                    var t = getTracker(arr);
                    if(t.tc().disable === 0) {
                        t.tc().disable++;
                        // Shift will 'untrack' our props so we have to record what
                        // is currently being tracked and reapply this after the shift
                        // Sad I know, but just how it works.
                        var k = Object.keys(arr);
                        var tracked = [];
                        k.forEach(function (e, i, a) {
                            tracked.push(isPropTracked(arr, a[i]));
                        });
                        // Record & perform the shift
                        if(arr.length > 0) {
                            t.addShift(arr, 0, 1);
                        }
                        var r = Array.prototype.shift.apply(arr, arguments);
                        // Restore tracking
                        var k = Object.keys(arr);
                        for(var i = 0; i < arr.length; i++) {
                            var key = k[i];
                            if(tracked[i + 1] && !isPropTracked(arr, key)) {
                                t.track(arr, key);
                            }
                        }
                        t.tc().disable--;
                        return r;
                    } else {
                        return Array.prototype.shift.apply(arr, arguments);
                    }
                }
            });
            Object.defineProperty(arr, 'unshift', {
                enumerable: false,
                configurable: false,
                value: function () {
                    var t = getTracker(arr);
                    if(t.tc().disable === 0) {
                        t.tc().disable++;
                        // Cache which props are tracked
                        var k = Object.keys(arr);
                        var tracked = [];
                        k.forEach(function (e, i, a) {
                            tracked.push(isPropTracked(arr, a[i]));
                        });
                        // Record the unshift
                        if(arguments.length > 0) {
                            t.addUnshift(arr, 0, arguments.length);
                        }
                        var r = Array.prototype.unshift.apply(arr, arguments);
                        // Record writes of new data
                        for(var i = 0; i < arguments.length; i++) {
                            t.track(arr, i + '');
                            t.addNew(arr, i + '', arr[i]);
                        }
                        // Restore our tracking
                        var k = Object.keys(arr);
                        for(; i < arr.length; i++) {
                            var key = k[i];
                            if(tracked[i - arguments.length] && !isPropTracked(arr, key)) {
                                t.track(arr, key);
                            }
                        }
                        t.tc().disable--;
                        return r;
                    } else {
                        return Array.prototype.unshift.apply(arr, arguments);
                    }
                }
            });
            Object.defineProperty(arr, 'reverse', {
                enumerable: false,
                configurable: false,
                value: function () {
                    var t = getTracker(arr);
                    if(t.tc().disable === 0) {
                        t.tc().disable++;
                        // Reverse keeps the tracking but does not reverse it leading
                        // to lots of confusion, another hack required
                        var k = Object.keys(arr);
                        var tracked = [];
                        k.forEach(function (e, i, a) {
                            tracked.push(isPropTracked(arr, a[i]));
                        });
                        tracked.reverse();
                        // Record & perform the reverse
                        t.addReverse(arr);
                        var r = Array.prototype.reverse.apply(arr, arguments);
                        // Recover tracking state
                        var k = Object.keys(r);
                        for(var i = 0; i < k.length; i++) {
                            var key = k[i];
                            var trckd = isPropTracked(arr, key);
                            if(tracked[i] && !trckd) {
                                t.track(arr, key);
                            } else if(!tracked[i] && trckd) {
                                unTrack(arr, key);
                            }
                        }
                        t.tc().disable--;
                        return r;
                    } else {
                        return Array.prototype.reverse.apply(arr, arguments);
                    }
                }
            });
            Object.defineProperty(arr, 'sort', {
                enumerable: false,
                configurable: false,
                value: function () {
                    var t = getTracker(arr);
                    if(t.tc().disable === 0) {
                        t.tc().disable++;
                        // Now we are in trouble, sort is like reverse, it leaves tracking
                        // at the pre-sort positions and we need to correct this by sorting
                        // over a wrapper array and then storing the results.
                        var k = Object.keys(arr);
                        var pairs = [];
                        k.forEach(function (e, i, a) {
                            pairs.push({
                                elem: arr[a[i]],
                                track: isPropTracked(arr, a[i])
                            });
                        });
                        // Run the sort
                        var sortfn = arguments[0];
                        if(sortfn === undefined) {
                            sortfn = lexSort;
                        }
                        var wrapFn = function (a, b) {
                            var r = sortfn(a.elem, b.elem);
                            return r;
                        };
                        Array.prototype.sort.apply(pairs, [
                            wrapFn
                        ]);
                        // Apply results
                        for(var i = 0; i < pairs.length; i++) {
                            var key = k[i];
                            arr[key] = pairs[i].elem;
                            var trckd = isPropTracked(arr, key);
                            if(pairs[i].track && !trckd) {
                                t.track(arr, key);
                            } else if(!pairs[i].track && trckd) {
                                unTrack(arr, key);
                            }
                        }
                        // Best record it after all that
                        t.addSort(arr);
                        t.tc().disable--;
                        return arr;
                    } else {
                        Array.prototype.sort.apply(pairs, [
                            wrapFn
                        ]);
                    }
                }
            });
            Object.defineProperty(arr, 'splice', {
                enumerable: false,
                configurable: false,
                value: function () {
                    var t = getTracker(arr);
                    if(t.tc().disable === 0) {
                        t.tc().disable++;
                        // ES5 15.4.4.12 + Moz extension (What a mess!)
                        var len = arr.length;
                        var relStart = shared.utils.toInteger(arguments[0]);
                        var actStart;
                        if(relStart < 0) {
                            actStart = Math.max((len + relStart), 0);
                        } else {
                            actStart = Math.min(relStart, len);
                        }
                        var actDelCount = len - actStart;
                        if(arguments[1] !== undefined) {
                            actDelCount = Math.min(Math.max(shared.utils.toInteger(arguments[1]), 0), len - actStart);
                        }
                        var insCount = Math.max(arguments.length - 2, 0);
                        // Splice leaves tracking where it was and does not adjust so we have to
                        // correct manually as usual but remebering about sparse arrays
                        var k = Object.keys(arr);
                        var tracked = [];
                        k.forEach(function (e, i, a) {
                            tracked.push(isPropTracked(arr, a[i]));
                        });
                        var r = Array.prototype.splice.apply(arr, arguments);
                        // Now recover correct tracking state & record changes
                        //var k = Object.keys(r);
                        for(var i = 0; i < k.length; i++) {
                            var key = +k[i];
                            if(key < actStart || key >= actStart + actDelCount) {
                                if(key >= actStart) {
                                    key += (insCount - actDelCount);
                                }
                                var skey = key + '';
                                var trckd = isPropTracked(arr, skey);
                                if(tracked[i] && !trckd) {
                                    t.track(arr, skey);
                                } else if(!tracked[i] && trckd) {
                                    unTrack(arr, skey);
                                }
                            }
                        }
                        // Anything inserted should not be tracked
                        for(var i = actStart; i < actStart + insCount; i++) {
                            if(arr[i] !== undefined) {
                                unTrack(arr, i + '');
                            }
                        }
                        if(actDelCount > 0) {
                            t.addShift(arr, actStart, actDelCount);
                        }
                        if(insCount > 0) {
                            t.addUnshift(arr, actStart, insCount);
                        }
                        t.tc().disable--;
                        return r;
                    } else {
                        return Array.prototype.splice.apply(arr, arguments);
                    }
                }
            });
        }
        function wrapProp(obj, prop, value) {
            var tracker = getTracker(obj);
            Object.defineProperty(obj, prop, {
                enumerable: true,
                configurable: true,
                get: function () {
                    if(tracker.tc().disable === 0) {
                        if(value !== null && typeof value === 'object') {
                            if(value instanceof shared.serial.Reference) {
                                var ref = value;
                                throw new UnknownReference(tracker.id(), prop, ref.id());
                            }
                            var t = getTrackerUnsafe(value);
                            if(t !== null) {
                                if(t.isDead()) {
                                    throw new UnknownReference(tracker.id(), prop, t.id());
                                } else {
                                    tracker.tc().markRead(value);
                                }
                            }
                        }
                    }
                    return value;
                },
                set: function (setValue) {
                    if(tracker.tc().disable === 0) {
                        tracker.tc().disable++;
                        tracker.addWrite(obj, prop, setValue, value);
                        tracker.tc().disable--;
                    }
                    value = setValue;
                }
            });
        }
        // TODO: Is this the best/only option?
        function isPropTracked(obj, prop) {
            var desc = Object.getOwnPropertyDescriptor(obj, prop);
            return (desc.get != undefined && desc.set != undefined);
        }
        tracker.isPropTracked = isPropTracked;
        function unTrack(obj, prop) {
            var desc = Object.getOwnPropertyDescriptor(obj, prop);
            if(desc.get != undefined && desc.set != undefined) {
                var v = obj[prop];
                Object.defineProperty(obj, prop, {
                    value: v
                });
            }
        }
    })(shared.tracker || (shared.tracker = {}));
    var tracker = shared.tracker;
    // tracker
    })(shared || (shared = {}));
//shared
// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.
/// <reference path='import.ts' />
/// <reference path='tracker.ts' />
var shared;
(function (shared) {
    (function (mtx) {
        var ReadMap = (function () {
            function ReadMap() {
                this._map = new shared.utils.IdMap();
            }
            ReadMap.prototype.size = function () {
                return this._map.size();
            };
            ReadMap.prototype.find = function (id) {
                return this._map.find(id);
            };
            ReadMap.prototype.insert = function (id, revision) {
                return this._map.insert(id, revision);
            };
            ReadMap.prototype.remove = function (id) {
                return this._map.remove(id);
            };
            ReadMap.prototype.apply = function (handler) {
                return this._map.apply(function (k, v) {
                    return handler(k, v);
                });
            };
            ReadMap.prototype.removeAll = function () {
                this._map.removeAll();
            };
            ReadMap.prototype.toString = function () {
                var str = '';
                this._map.apply(function (key, value) {
                    str += key;
                    str += ' ';
                    str += value;
                    str += '\n';
                    return true;
                });
                return str;
            };
            return ReadMap;
        })();
        mtx.ReadMap = ReadMap;        
        var NewQueue = (function () {
            function NewQueue(queue) {
                if (typeof queue === "undefined") { queue = new shared.utils.Queue(); }
                this._queue = queue;
            }
            NewQueue.prototype.size = function () {
                return this._queue.size();
            };
            NewQueue.prototype.empty = function () {
                return this._queue.empty();
            };
            NewQueue.prototype.front = function () {
                return this._queue.front();
            };
            NewQueue.prototype.back = function () {
                return this._queue.back();
            };
            NewQueue.prototype.at = function (i) {
                return this._queue.at(i);
            };
            NewQueue.prototype.setAt = function (i, value) {
                this._queue.setAt(i, value);
            };
            NewQueue.prototype.push = function (value) {
                this._queue.push(value);
            };
            NewQueue.prototype.pop = function () {
                return this._queue.pop();
            };
            NewQueue.prototype.unshift = function (value) {
                this._queue.unshift(value);
            };
            NewQueue.prototype.shift = function () {
                return this._queue.shift();
            };
            NewQueue.prototype.array = function () {
                return this._queue.array();
            };
            NewQueue.prototype.first = function (match) {
                return this._queue.first(function (v) {
                    return match(v);
                });
            };
            NewQueue.prototype.filter = function (match) {
                var q = this._queue.filter(function (v) {
                    return match(v);
                });
                return new NewQueue(q);
            };
            NewQueue.prototype.apply = function (func) {
                this._queue.apply(function (v) {
                    return func(v);
                });
            };
            NewQueue.prototype.toString = function () {
                var str = '';
                this._queue.apply(function (item) {
                    str += item.id;
                    str += ' ';
                    str += JSON.stringify(item.obj);
                    str += '\n';
                });
                return str;
            };
            return NewQueue;
        })();
        mtx.NewQueue = NewQueue;        
        var ChangeQueue = (function () {
            function ChangeQueue(queue) {
                if (typeof queue === "undefined") { queue = new shared.utils.Queue(); }
                this._queue = queue;
            }
            ChangeQueue.prototype.size = function () {
                return this._queue.size();
            };
            ChangeQueue.prototype.empty = function () {
                return this._queue.empty();
            };
            ChangeQueue.prototype.front = function () {
                return this._queue.front();
            };
            ChangeQueue.prototype.back = function () {
                return this._queue.back();
            };
            ChangeQueue.prototype.at = function (i) {
                return this._queue.at(i);
            };
            ChangeQueue.prototype.setAt = function (i, value) {
                this._queue.setAt(i, value);
            };
            ChangeQueue.prototype.push = function (value) {
                this._queue.push(value);
            };
            ChangeQueue.prototype.pop = function () {
                return this._queue.pop();
            };
            ChangeQueue.prototype.unshift = function (value) {
                this._queue.unshift(value);
            };
            ChangeQueue.prototype.shift = function () {
                return this._queue.shift();
            };
            ChangeQueue.prototype.array = function () {
                return this._queue.array();
            };
            ChangeQueue.prototype.first = function (match) {
                return this._queue.first(function (v) {
                    return match(v);
                });
            };
            ChangeQueue.prototype.filter = function (match) {
                var q = this._queue.filter(function (v) {
                    return match(v);
                });
                return new ChangeQueue(q);
            };
            ChangeQueue.prototype.apply = function (func) {
                this._queue.apply(function (v) {
                    return func(v);
                });
            };
            ChangeQueue.prototype.toString = function () {
                var str = '';
                this._queue.apply(function (item) {
                    str += shared.tracker.getTracker(item.obj).id();
                    str += ' ';
                    if(item.write !== undefined) {
                        str += 'write ' + item.write + ' = ' + JSON.stringify(item.value);
                        if(item.last !== undefined) {
                            str += ' last ' + JSON.stringify(item.last);
                        }
                    } else if(item.del !== undefined) {
                        str += 'delete ' + item.del;
                    } else if(item.reinit !== undefined) {
                        str += 'reinit ' + item.reinit;
                    } else if(item.reverse !== undefined) {
                        str += 'reverse';
                    } else if(item.shift !== undefined) {
                        str += 'shift ' + item.shift + ' by ' + item.size;
                    } else if(item.unshift !== undefined) {
                        str += 'unshift ' + item.unshift + ' by ' + item.size;
                    } else {
                        str += '**UNKNOWN** ' + JSON.stringify(item);
                    }
                    str += '\n';
                });
                return str;
            };
            return ChangeQueue;
        })();
        mtx.ChangeQueue = ChangeQueue;        
        var MTX = (function () {
            // change set, ordered list of changes
            function MTX() {
                this.reset();
            }
            MTX.prototype.reset = function () {
                this.rset = new ReadMap();
                this.nset = new NewQueue();
                this.cset = new ChangeQueue();
            };
            MTX.prototype.toString = function () {
                var str = '';
                str += 'Read:\n' + this.rset.toString();
                str += 'New:\n' + this.nset.toString();
                str += 'Changed:\n' + this.cset.toString();
                return str;
            };
            return MTX;
        })();
        mtx.MTX = MTX;        
    })(shared.mtx || (shared.mtx = {}));
    var mtx = shared.mtx;
    // mtx
    })(shared || (shared = {}));
// shared
// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.
/// <reference path='import.ts' />
/// <reference path='tracker.ts' />
/// <reference path='mtx.ts' />
var shared;
(function (shared) {
    (function (mtx) {
        var ObjectCache = (function () {
            function ObjectCache() {
                this._cache = new shared.utils.Map(shared.utils.hash);
            }
            ObjectCache.prototype.find = // Cached objects
            function (id) {
                return this._cache.find(id.toString());
            };
            ObjectCache.prototype.insert = function (id, value) {
                return this._cache.insert(id.toString(), value);
            };
            ObjectCache.prototype.remove = function (id) {
                return this._cache.remove(id.toString());
            };
            return ObjectCache;
        })();
        mtx.ObjectCache = ObjectCache;        
        /*
        * A mtx consist of three parts: a readset, a new set and a set of changes
        * (cset). The readset contains obj->revision mappings which much be checked
        * prior to detect conflict. There must be at least one entry in the readset
        * and entries may not reference objects in the newset. The newset contains
        * id->object mappings of new objects being introduced. The newset must be
        * ordered to avoid non-existent references to other new objects.The change set
        * contains a list of object change instructions, these may reference any
        * objects in the newset.
        *
        * The in-memory & on-the-wire format of a mtx differ in how objects are
        * referenced (by id or directly). This can help improve local mtx commit
        * performance but can be confusing.
        *
        * See TrackCache for more details.
        */
        var mtxFactory = (function (_super) {
            __extends(mtxFactory, _super);
            function mtxFactory() {
                        _super.call(this);
                this.disable = 0;
                this._mtx = new mtx.MTX();
                this._collected = false;
            }
            mtxFactory.prototype.cset = /*
            * The current change set, only exposed to aid debugging.
            */
            function () {
                return this._mtx.cset.array();
            };
            mtxFactory.prototype.markRead = /*
            * Record object as been read
            */
            function (value) {
                var t = shared.tracker.getTracker(value);
                shared.utils.dassert(t.tc() === this);
                this._mtx.rset.insert(t.id(), t.rev());
            };
            mtxFactory.prototype.readsetSize = /*
            * Readset access, only exposed to aid debugging
            */
            function () {
                return this._mtx.rset.size();
            };
            mtxFactory.prototype.readsetObject = function (id) {
                return this._mtx.rset.find(id.toString());
            };
            mtxFactory.prototype.newsetSize = /*
            * Newset access, only exposed to aid debugging
            */
            function () {
                return this._mtx.nset.size();
            };
            mtxFactory.prototype.newsetObject = function (id) {
                var ent = this._mtx.nset.first(function (entry) {
                    return entry.id.toString() === id.toString();
                });
                if(ent) {
                    return ent.obj;
                }
                return null;
            };
            mtxFactory.prototype.addNew = /*
            * Object change recording
            */
            function (obj, prop, value, lasttx) {
                if(shared.utils.isObjectOrArray(value)) {
                    this.valueId(value);
                }
                var v = value;
                if(typeof v === 'function') {
                    v = null;
                }
                this._mtx.cset.push({
                    obj: obj,
                    write: prop,
                    value: v,
                    lasttx: lasttx
                });
                return this._mtx.cset.size() - 1;
            };
            mtxFactory.prototype.addWrite = function (obj, prop, value, last, lasttx) {
                if(shared.utils.isObjectOrArray(value)) {
                    this.valueId(value);
                }
                var v = value;
                if(typeof v === 'function') {
                    v = null;
                }
                this._mtx.cset.push({
                    obj: obj,
                    write: prop,
                    value: v,
                    last: last,
                    lasttx: lasttx
                });
                return this._mtx.cset.size() - 1;
            };
            mtxFactory.prototype.addDelete = function (obj, prop, lasttx) {
                this._mtx.cset.push({
                    obj: obj,
                    del: prop,
                    lasttx: lasttx
                });
                return this._mtx.cset.size() - 1;
            };
            mtxFactory.prototype.addReverse = function (obj, lasttx) {
                this._mtx.cset.push({
                    obj: obj,
                    reverse: true,
                    lasttx: lasttx
                });
                return this._mtx.cset.size() - 1;
            };
            mtxFactory.prototype.addSort = function (obj, lasttx) {
                this._mtx.cset.push({
                    obj: obj,
                    sort: true,
                    lasttx: lasttx
                });
                return this._mtx.cset.size() - 1;
            };
            mtxFactory.prototype.addShift = function (obj, at, size, lasttx) {
                this._mtx.cset.push({
                    obj: obj,
                    shift: at,
                    size: size,
                    lasttx: lasttx
                });
                return this._mtx.cset.size() - 1;
            };
            mtxFactory.prototype.addUnshift = function (obj, at, size, lasttx) {
                this._mtx.cset.push({
                    obj: obj,
                    unshift: at,
                    size: size,
                    lasttx: lasttx
                });
                return this._mtx.cset.size() - 1;
            };
            mtxFactory.prototype.replaceSort = /*
            * Utility to change a sort record with a reinit during post-processing
            */
            function (at, obj, values) {
                shared.utils.dassert(this._mtx.cset.at(at).sort !== undefined);
                // Null out history
                var t = shared.tracker.getTracker(obj);
                var dead = t.lastChange();
                while(dead !== -1) {
                    var c = dead;
                    dead = this._mtx.cset.at(dead).lasttx;
                    this._mtx.cset.setAt(c, null);
                }
                // Insert re-init
                this._mtx.cset.push({
                    obj: obj,
                    reinit: values,
                    lasttx: -1
                });
                t.setLastChange(this._mtx.cset.size() - 1);
            };
            mtxFactory.prototype.mtx = /*
            * Return the mtx record of stored changes.
            */
            function (cache) {
                // We must collect over readset to build complete picture, but only once
                shared.utils.dassert(this._collected === false);
                this._collected = true;
                this.collect(cache);
                // Return the formed mtx
                return this._mtx;
            };
            mtxFactory.prototype.resetMtx = function () {
                // Restart with a new mtx
                this._mtx = new mtx.MTX();
                this._collected = false;
            };
            mtxFactory.prototype.okMtx = function (store) {
                // Reset last change
                this._mtx.cset.apply(function (ci) {
                    var t = shared.tracker.getTracker(ci.obj);
                    t.setLastChange(-1);
                });
                this.resetMtx();
            };
            mtxFactory.prototype.undoMtx = function (cache) {
                this.disable++;
                // We must collect over readset to build complete picture
                if(!this._collected) {
                    this.collect(cache);
                }
                // Unwind the cset actions
                var i = this._mtx.cset.size() - 1;
                while(i >= 0) {
                    var e = this._mtx.cset.at(i);
                    if(e !== null) {
                        var t = shared.tracker.getTracker(e.obj);
                        if(!t.isDead()) {
                            // Try reverse if can
                            if(e.write !== undefined) {
                                if(e.last !== undefined) {
                                    e.obj[e.write] = e.last;
                                } else {
                                    if(shared.utils.isArray(e.obj)) {
                                        e.obj.splice(parseInt(e.write), 1);
                                    } else {
                                        delete e.obj[e.write];
                                    }
                                }
                            } else {
                                // Conservatively kill everything else
                                t.kill();
                                cache.remove(t.id());
                            }
                        }
                    }
                    i--;
                }
                // Reset internal state
                var i = this._mtx.cset.size() - 1;
                while(i >= 0) {
                    var e = this._mtx.cset.at(i);
                    if(e !== null) {
                        var t = shared.tracker.getTracker(e.obj);
                        t.downrev(e.obj);
                    }
                    i--;
                }
                this.resetMtx();
                this.disable--;
            };
            mtxFactory.prototype.valueId = /*
            * Obtain an id for any object. If passed an untracked object an id
            * will be assigned to it although the object will not be tracked.
            * Objects that are already been tracked by a different cache cause
            * an exception.
            */
            function (value) {
                shared.utils.dassert(shared.utils.isObjectOrArray(value));
                var t = shared.tracker.getTrackerUnsafe(value);
                if(t === null) {
                    if(value._pid === undefined) {
                        // Recurse into props of new object
                        var keys = Object.keys(value);
                        for(var k = 0; k < keys.length; k++) {
                            var key = keys[k];
                            if(shared.utils.isObjectOrArray(value[key])) {
                                this.valueId(value[key]);
                            }
                        }
                        // Record this as new object
                        Object.defineProperty(value, '_pid', {
                            value: shared.utils.UID()
                        });
                        this._mtx.nset.push({
                            id: value._pid,
                            obj: value
                        });
                    }
                    return value._pid;
                } else {
                    if(t.tc() !== this) {
                        shared.utils.defaultLogger().fatal('Objects can not be used in multiple stores');
                    }
                    return value._tracker.id();
                }
            };
            mtxFactory.prototype.valueRev = /*
            * Obtain version number for any objects. Untracked objects are assumed
            * to be version zero.
            */
            function (value) {
                if(value._tracker === undefined) {
                    return 0;
                } else {
                    return value._tracker.rev();
                }
            };
            mtxFactory.prototype.collect = /*
            * Run post-processing over all object that have been read.
            */
            function (cache) {
                // Collect over the readset
                var that = this;
                this._mtx.rset.apply(function (key, value) {
                    var obj = cache.find(key);
                    shared.utils.dassert(obj != null);
                    that.collectObject(obj);
                    return true;
                });
            };
            mtxFactory.prototype.collectObject = /*
            * Run post-processing over a specific object, for debug proposes only
            */
            function (obj) {
                shared.utils.dassert(shared.tracker.isTracked(obj));
                if(obj instanceof Array) {
                    this.arrayChanges(obj);
                } else {
                    this.objectChanges(obj);
                }
            };
            mtxFactory.prototype.objectChanges = /*
            * Post-processing changes on an object
            */
            function (obj) {
                var t = shared.tracker.getTracker(obj);
                t.tc().disable++;
                // Loop old props to find any to delete
                var oldProps = shared.utils.cloneArray(t.type().props());
                var newProps = Object.keys(obj);
                for(var i = 0; i < oldProps.length; i++) {
                    if(!obj.hasOwnProperty(oldProps[i]) || !shared.tracker.isPropTracked(obj, oldProps[i])) {
                        t.addDelete(obj, oldProps[i]);
                    } else {
                        // Remove any old ones for next step
                        var idx = newProps.indexOf(oldProps[i]);
                        newProps[idx] = null;
                    }
                }
                // Add any new props
                for(var i = 0; i < newProps.length; i++) {
                    if(newProps[i] !== null) {
                        t.addNew(obj, newProps[i], obj[newProps[i]]);
                        t.track(obj, newProps[i]);
                    }
                }
                if(t.hasChanges()) {
                    t.uprev(obj);
                }
                t.tc().disable--;
            };
            mtxFactory.prototype.arrayChanges = /*
            * Post-processing changes on an array
            */
            function (obj) {
                var t = shared.tracker.getTracker(obj);
                t.tc().disable++;
                // Sorted arrays are treated as being fully re-initialized as we
                // can't track the impact of the sort.
                // First we construct an array of the writes upto the last sort
                // if there was one
                var at = t.lastChange();
                var writeset = [];
                while(at !== -1) {
                    if(this._mtx.cset.at(at).sort !== undefined) {
                        // Replace sort by a re-init
                        var v = shared.serial.writeObject(t.tc(), obj, '');
                        this.replaceSort(at, obj, v);
                        t.uprev(obj);
                        t.tc().disable--;
                        return;
                    } else {
                        writeset.unshift(this._mtx.cset.at(at));
                    }
                    at = this._mtx.cset.at(at).lasttx;
                }
                // Next we adjust the original props to account for how the array
                // has been shifted so we can detect new props and delete old ones
                // correctly.
                // REMEMBER the props maybe sparse but shift/unshift is abs
                var oldProps = shared.utils.cloneArray(t.type().props());
                for(var i = 0; i < writeset.length; i++) {
                    if(writeset[i].shift != undefined) {
                        var at = writeset[i].shift;
                        var size = writeset[i].size;
                        var j = 0;
                        while(true) {
                            if(j === oldProps.length) {
                                break;
                            }
                            var idx = +oldProps[j];
                            if(idx >= at && idx < at + size) {
                                oldProps.splice(j, 1);
                            } else if(idx >= at + size) {
                                oldProps[j] = (idx - size) + '';
                                j++;
                            } else {
                                j++;
                            }
                        }
                    } else if(writeset[i].unshift != undefined) {
                        var at = writeset[i].unshift;
                        var size = writeset[i].size;
                        var j = 0;
                        var inserted = false;
                        while(true) {
                            if(j === oldProps.length) {
                                break;
                            }
                            var idx = +oldProps[j];
                            if(!inserted) {
                                if(idx >= at) {
                                    for(var k = size - 1; k >= 0; k--) {
                                        oldProps.splice(j, 0, (at + k) + '');
                                    }
                                    inserted = true;
                                    j += size;
                                } else {
                                    j++;
                                }
                            } else {
                                oldProps[j] = (idx + size) + '';
                                j++;
                            }
                        }
                        if(!inserted) {
                            for(var k = 0; k < size; k++) {
                                oldProps.push((at + k) + '');
                            }
                        }
                    }
                }
                // Pop oldProps that are bigger than current length
                var pop = 0;
                for(var i = oldProps.length - 1; i >= 0; i--) {
                    if(+oldProps[i] >= obj.length) {
                        pop++;
                    } else {
                        break;
                    }
                }
                if(pop > 0) {
                    t.addShift(obj, -1, (+oldProps[oldProps.length - 1]) - obj.length + 1);
                    while(pop > 0) {
                        oldProps.pop();
                        pop--;
                    }
                }
                // Write any old props that have been changed
                for(var i = 0; i < oldProps.length; i++) {
                    if(!obj.hasOwnProperty(oldProps[i])) {
                        t.addDelete(obj, oldProps[i]);
                    } else if(!shared.tracker.isPropTracked(obj, oldProps[i])) {
                        t.addNew(obj, oldProps[i], obj[oldProps[i]]);
                        t.track(obj, oldProps[i]);
                    }
                }
                // Add new props
                var newProps = Object.keys(obj);
                for(var i = 0; i < newProps.length; i++) {
                    var idx = oldProps.indexOf(newProps[i]);
                    if(idx === -1) {
                        t.addNew(obj, newProps[i], obj[newProps[i]]);
                        t.track(obj, newProps[i]);
                    }
                }
                if(t.hasChanges()) {
                    t.uprev(obj);
                }
                t.tc().disable--;
            };
            return mtxFactory;
        })(shared.utils.UniqueObject);
        mtx.mtxFactory = mtxFactory;        
    })(shared.mtx || (shared.mtx = {}));
    var mtx = shared.mtx;
    // mtx
    })(shared || (shared = {}));
// shared
// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.
/// <reference path='import.ts' />
/// <reference path='utils.ts' />
/// <reference path='mongo.ts' />
var shared;
(function (shared) {
    (function (store) {
        store.rootUID = shared.utils.makeUID('000000000000000000000001');
        /*
        * Create a new store, this always has to be a secondary at the moment
        * to allow for undo actions.
        */
        function createStore(options) {
            return new store.MongoStore(options);
        }
        store.createStore = createStore;
    })(shared.store || (shared.store = {}));
    var store = shared.store;
    // store
    })(shared || (shared = {}));
// shared
// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.
/// <reference path='import.ts' />
/// <reference path='tracker.ts' />
/// <reference path='types.ts' />
/// <reference path='serial.ts' />
/// <reference path='mtxfactory.ts' />
/// <reference path='store.ts' />
var shared;
(function (shared) {
    (function (store) {
        var util = require('util');
        var rsvp = require('rsvp');
        var mongo = require('mongodb');
        var bson = require('bson');
        var MINLOCK = 1;
        var CHECKRAND = 100;
        var MAXLOCK = 10000;
        var lockUID = shared.utils.makeUID('000000000000000000000000');
        var MongoStore = (function (_super) {
            __extends(MongoStore, _super);
            // For checking for lock changes
            function MongoStore(options) {
                if (typeof options === "undefined") { options = {
                }; }
                        _super.call(this);
                this._logger = shared.utils.defaultLogger();
                // Database stuff
                this._collection = null;
                this._pending = [];
                // Outstanding work queue
                this._root = null;
                // Root object
                this._cache = new shared.mtx.ObjectCache();
                this._host = options.host || 'localhost';
                this._port = options.port || 27017;
                this._dbName = options.db || 'shared';
                this._collectionName = options.collection || 'shared';
                this._safe = options.safe || 'false';
                this._logger.debug('STORE', '%s: Store created', this.id());
            }
            MongoStore.prototype.close = function () {
                // Queue close,
                this._pending.push({
                    close: true
                });
                // Process queue
                this.processPending();
            };
            MongoStore.prototype.apply = function (handler, callback) {
                if (typeof callback === "undefined") { callback = function () {
                }; }
                // Queue
                this._pending.push({
                    handler: handler,
                    callback: callback
                });
                // Process queue
                this.processPending();
            };
            MongoStore.prototype.processPending = function (recurse) {
                if (typeof recurse === "undefined") { recurse = false; }
                var that = this;
                // Processing is chained, so only start if only 1 to do
                if((recurse && that._pending.length > 0) || (!recurse && that._pending.length === 1)) {
                    var pending = that._pending[0];
                    if(pending.close) {
                        // Close the db
                        if(that._db) {
                            that._db.close();
                            that._collection = null;
                            that._db = null;
                            that._logger.debug('STORE', '%s: Database has been closed', that.id());
                        }
                        that._pending.shift();
                    } else {
                        // An Update
                        that.getRoot().then(function (root) {
                            that.tryHandler(pending.handler).then(function (ret) {
                                // Completed
                                that._logger.debug('STORE', '%s: Invoking user callback', that.id());
                                pending.callback(null, ret);
                                that._pending.shift();
                                that.processPending(true);
                            }, function (err) {
                                if(err) {
                                    // Some error during processing
                                    that._logger.debug('STORE', '%s: Invoking user callback with error %j', that.id(), err);
                                    pending.callback(err, null);
                                    that._pending.shift();
                                    that.processPending(true);
                                } else {
                                    // Needs re-try
                                    that.processPending(true);
                                }
                            });
                        }, function (err) {
                            // No root object
                            that._logger.debug('STORE', '%s: Invoking user callback with error %j', that.id(), err);
                            pending.callback(err, null);
                            that._pending.shift();
                            that.processPending(true);
                        });
                    }
                }
            };
            MongoStore.prototype.tryHandler = function (handler, done) {
                if (typeof done === "undefined") { done = new rsvp.Promise(); }
                var that = this;
                try  {
                    that._logger.debug('STORE', '%s: Invoking user handler', that.id());
                    that.markRead(that._root);
                    var ret = handler(that._root);
                    try  {
                        that._logger.debug('STORE', '%s: Attempting commit', that.id());
                        that.commitMtx(that.mtx(that._cache)).then(function () {
                            // It's passed :-)
                            that._logger.debug('STORE', '%s: Update completed successfully', that.id());
                            that.okMtx(that._cache);
                            done.resolve(ret);
                        }, function (err) {
                            if(shared.utils.isArray(err)) {
                                if(err.length !== 0) {
                                    that._logger.debug('STORE', 'Objects need refresh after commit failure');
                                    that.undo();
                                    // Refresh out-of date objects
                                    that.locked(function () {
                                        return that.refreshSet(err);
                                    }).then(function () {
                                        that._logger.debug('STORE', 'Starting re-try');
                                        done.reject(null);
                                    }, function (err) {
                                        done.reject(err);
                                    });
                                }
                            } else {
                                done.reject(err);
                            }
                        });
                    } catch (e) {
                        that._logger.fatal('Unhandled exception', shared.utils.exceptionInfo(e));
                    }
                } catch (e) {
                    that._logger.debug('STORE', 'Exception during try: ', shared.utils.exceptionInfo(e));
                    // Reset any changes
                    that.undo();
                    // Cache miss when trying to commit
                    if(e instanceof shared.tracker.UnknownReference) {
                        var unk = e;
                        var missing = that._cache.find(unk.missing());
                        if(missing === null) {
                            // Load the object
                            var curP = that.getCollection();
                            curP = that.wait(curP, function () {
                                return that.locked(function () {
                                    // Get the object
                                    var nestedP = that.getObject(unk.missing());
                                    // Assign it if needed
                                    nestedP = that.wrap(nestedP, function (obj) {
                                        if(unk.id() !== undefined) {
                                            var assign = that._cache.find(unk.id());
                                            if(assign !== null) {
                                                that.disable++;
                                                assign[unk.prop()] = obj;
                                                that.disable--;
                                                // Request retry
                                                done.reject(null);
                                            }
                                        }
                                    });
                                    return nestedP;
                                });
                            });
                        } else {
                            // Commit available to the prop
                            var to = this._cache.find(unk.id());
                            that.disable++;
                            to[unk.prop()] = missing;
                            that.disable--;
                            done.reject(null)// A retry request
                            ;
                        }
                    } else {
                        done.reject(e);
                    }
                }
                return done;
            };
            MongoStore.prototype.commitMtx = function (mtx) {
                shared.utils.dassert(shared.utils.isValue(mtx));
                this._logger.debug('STORE', '%s: commitMtx()', this.id(), mtx.toString());
                var that = this;
                return that.locked(function () {
                    return that.applyMtx(mtx);
                });
            };
            MongoStore.prototype.applyMtx = function (mtx) {
                var that = this;
                var curP = new rsvp.Promise();
                // Check readset is OK
                that.checkReadset(mtx.rset).then(function (fails) {
                    var failed = fails.filter(function (v) {
                        return v !== null;
                    });
                    if(failed.length > 0) {
                        that._logger.debug('STORE', '%s: checkReadset failures', that.id(), failed);
                        curP.reject(failed);
                    } else {
                        curP.resolve();
                    }
                }, function (err) {
                    that._logger.debug('STORE', '%s: checkReadset failed', that.id());
                    curP.reject(err);
                });
                // Make changes
                return that.wait(curP, function () {
                    return that.makeChanges(mtx);
                });
            };
            MongoStore.prototype.makeChanges = function (mtx) {
                var that = this;
                var curP = new rsvp.Promise();
                curP.resolve();
                // Ref change & Rev set, for later action
                // Note: New objects are given a starting ref change of -1 to counter
                // the + 1 they are given when loaded into mongo. Net effect is that
                // something must reference them to stop them being deleted at the end
                // of the pass, which of course the normal case.
                var rrset = new shared.utils.IdMap();
                // Scan nset for cross references
                var nset = mtx.nset;
                for(var i = 0; i < nset.size(); i++) {
                    var nentry = nset.at(i);
                    shared.utils.dassert(this._cache.find(nentry.id) === null);
                    // Scan for non-tracked objects
                    var keys = Object.keys(nentry.obj);
                    for(var k = 0; k < keys.length; k++) {
                        var v = nentry.obj[keys[k]];
                        if(shared.utils.isObjectOrArray(v) && shared.tracker.getTrackerUnsafe(v) === null) {
                            var vid = this.valueId(v);
                            var rr = rrset.findOrInsert(vid, {
                                uprev: false,
                                ref: -1,
                                reinit: false
                            });
                            rr.ref++;
                        }
                    }
                }
                // Load up new objects
                for(var i = 0; i < nset.size(); i++) {
                    var nentry = nset.at(i);
                    shared.utils.dassert(this._cache.find(nentry.id) === null);
                    // Write with 1 ref, compensated in r&r set
                    var writeObjectFn = (function (_id, _obj) {
                        return function () {
                            return that.writeObject(_id, _obj, 0, 1);
                        };
                    });
                    curP = that.wait(curP, writeObjectFn(nentry.id, nentry.obj));
                    var rr = {
                        uprev: false,
                        ref: -1,
                        reinit: false
                    };
                    rrset.findOrInsert(nentry.id, {
                        uprev: false,
                        ref: -1,
                        reinit: false
                    });
                    // Time to start tracking changes
                    new shared.tracker.Tracker(that, nentry.obj, nentry.id, 0);
                    that._cache.insert(nentry.id, nentry.obj);
                }
                // Now for the main body of changes
                var cset = mtx.cset;
                for(var i = 0; i < cset.size(); i++) {
                    // Pull some basic details about target object
                    var e = cset.at(i);
                    var t = shared.tracker.getTracker(e.obj);
                    var id = t.id();
                    var tdata = t.getData();
                    // Record need to up revision, for later
                    var rr = rrset.findOrInsert(t.id(), {
                        uprev: true,
                        ref: 0,
                        reinit: false
                    });
                    rr.uprev = true;
                    // Write prop
                    if(e.write !== undefined) {
                        // Deref un-loaded value
                        if(shared.utils.isObjectOrArray(e.last)) {
                            var vid = this.objectID(e.last);
                            var lastrr = rrset.findOrInsert(vid, {
                                uprev: true,
                                ref: 0,
                                reinit: false
                            });
                            lastrr.ref--;
                            tdata.rout--;
                        }
                        // Upref if assigning object
                        var val = e.value;
                        if(shared.utils.isObjectOrArray(val)) {
                            var vid = this.objectID(val);
                            val = new shared.serial.Reference(vid);
                            var valrr = rrset.findOrInsert(vid, {
                                uprev: true,
                                ref: 0,
                                reinit: false
                            });
                            valrr.ref++;
                            tdata.rout++;
                        }
                        var writePropFn = (function (_id, _write, _val) {
                            return function () {
                                return that.writeProp(_id, _write, _val);
                            };
                        });
                        curP = that.wait(curP, writePropFn(id, e.write, val));
                    } else // Delete Prop
                    if(e.del !== undefined) {
                        // Check for outbound to another object
                        if(tdata.rout > 0) {
                            var readPropFn = (function (_id, _del) {
                                return function () {
                                    return that.readProp(_id, _del);
                                };
                            });
                            curP = that.wait(curP, readPropFn(t.id(), e.del));
                            curP = that.wrap(curP, function (value) {
                                if(shared.utils.isObject(value)) {
                                    var vkeys = Object.keys(value);
                                    if(vkeys.length === 1 && vkeys[0] === '_id') {
                                        var valrr = rrset.findOrInsert(value._id, {
                                            uprev: false,
                                            ref: 0,
                                            reinit: false
                                        });
                                        valrr.ref--;
                                        tdata.rout--;
                                    }
                                }
                            });
                        }
                        // Remove the prop
                        var deletePropFn = (function (_id, _del) {
                            return function () {
                                return that.deleteProp(_id, _del);
                            };
                        });
                        curP = that.wait(curP, deletePropFn(t.id(), e.del));
                    } else if(e.shift !== undefined) {
                        // Handle front pop
                        if(e.shift === 0 || e.shift === -1) {
                            var count = e.size;
                            var front = (e.shift === 0);
                            var arrayPopFn = (function (_id, _front) {
                                return function () {
                                    return that.arrayPop(_id, _front);
                                };
                            });
                            while(count--) {
                                curP = that.wait(curP, arrayPopFn(id, front));
                            }
                        } else {
                            // Need a re-init
                            rr.reinit = true;
                        }
                    } else if(e.unshift !== undefined) {
                        rr.reinit = true;
                    } else if(e.reinit !== undefined) {
                        rr.reinit = true;
                    } else if(e.reverse !== undefined) {
                        rr.reinit = true;
                    } else {
                        this._logger.fatal('%s: cset contains unexpected command', t.id());
                    }
                }
                // Do collected ref & rev changes
                var rrP = new rsvp.Promise();
                curP.then(function () {
                    var done = new rsvp.Promise();
                    done.resolve();
                    rrset.apply(function (lid, rr) {
                        if(rr.reinit) {
                            // Worst case, have to write whole object again
                            var reobj = that._cache.find(lid);
                            var ret = shared.tracker.getTracker(reobj);
                            var ltdata = ret.getData();
                            var writeObjectFn = (function (_id, _obj, _rev, _ref) {
                                return function () {
                                    return that.writeObject(_id, _obj, _rev, _ref);
                                };
                            });
                            done = that.wait(done, writeObjectFn(lid, reobj, ret.rev(), ltdata.rin + rr.ref));
                        } else if(rr.uprev || rr.ref !== 0) {
                            // Just ref & rev changes to do
                            var changeRevAndRefFn = (function (_id, _uprev, _ref) {
                                return function () {
                                    return that.changeRevAndRef(_id, _uprev, _ref);
                                };
                            });
                            done = that.wait(done, changeRevAndRefFn(lid, rr.uprev, rr.ref));
                        }
                    });
                    done.then(function () {
                        rrP.resolve();
                    }, function (err) {
                        rrP.reject(err);
                    });
                }, function (err) {
                    rrP.reject(err);
                });
                return rrP;
            };
            MongoStore.prototype.undo = function () {
                // Undo current transaction
                this.undoMtx(this._cache);
                // Did the root die?
                var t = shared.tracker.getTracker(this._root);
                if(t.isDead()) {
                    this._root = null;
                }
            };
            MongoStore.prototype.objectID = function (obj) {
                shared.utils.dassert(shared.utils.isObjectOrArray(obj));
                if(obj instanceof shared.serial.Reference) {
                    return obj.id();
                }
                var t = shared.tracker.getTrackerUnsafe(obj);
                if(t) {
                    return t.id();
                }
                return this.valueId(obj);
            };
            MongoStore.prototype.fail = function (promise, fmt) {
                var msgs = [];
                for (var _i = 0; _i < (arguments.length - 2); _i++) {
                    msgs[_i] = arguments[_i + 2];
                }
                var msg = shared.utils.format('', fmt, msgs);
                this._logger.debug('STORE', msg);
                promise.reject(new Error(msg));
            };
            MongoStore.prototype.updateObject = function (doc, proto) {
                // Sort out proto
                if(doc._type === 'Object') {
                    if(!shared.utils.isValue(proto)) {
                        proto = {
                        };
                    } else {
                        shared.utils.dassert(shared.utils.isObject(proto));
                    }
                } else if(doc._type === 'Array') {
                    if(!shared.utils.isValue(proto)) {
                        proto = [];
                    } else {
                        shared.utils.dassert(shared.utils.isArray(proto));
                        // Prop delete does not work well on arrays so zero proto
                        proto.length = 0;
                    }
                } else {
                    this._logger.fatal('%s: Unexpected document type: %j', this.id(), doc._type);
                }
                this.disable++;
                // Read props
                var dkeys = Object.keys(doc._data);
                var dk = 0;
                var pkeys = Object.keys(proto);
                var pk = 0;
                var out = 0;
                while(true) {
                    // Run out?
                    if(dk === dkeys.length) {
                        break;
                    }
                    // Read prop name
                    var prop = dkeys[dk];
                    // Delete rest of proto props if does not match what is being read
                    if(pk !== -1 && prop != pkeys[pk]) {
                        for(var i = pk; i < pkeys.length; i++) {
                            delete proto[pkeys[i]];
                        }
                        pk = -1;
                    }
                    // Check for a Reference
                    var val = doc._data[dkeys[dk]];
                    if(shared.utils.isObject(val)) {
                        var vkeys = Object.keys(val);
                        if(vkeys.length === 1 && vkeys[0] === '_id') {
                            val = new shared.serial.Reference(val._id);
                            out++;
                        }
                    }
                    // Update proto value
                    proto[prop] = val;
                    dk++;
                }
                this.disable--;
                return {
                    obj: proto,
                    id: doc._id,
                    rev: doc._rev,
                    ref: doc._ref,
                    out: out
                };
            };
            MongoStore.prototype.wait = /* ----------------------------- ASYNC HELPERS ------------------------------- */
            function (chainP, fn) {
                var that = this;
                var p = new rsvp.Promise();
                chainP.then(function () {
                    fn.apply(that, arguments).then(function () {
                        p.resolve.apply(p, arguments);
                    }, function (err) {
                        p.reject(err);
                    });
                }, function (err) {
                    p.reject(err);
                });
                return p;
            };
            MongoStore.prototype.wrap = function (chainP, fn) {
                var that = this;
                var p = new rsvp.Promise();
                chainP.then(function () {
                    p.resolve(fn.apply(that, arguments));
                });
                return p;
            };
            MongoStore.prototype.locked = function (fn) {
                var that = this;
                var p = new rsvp.Promise();
                that.lock().then(function () {
                    fn().then(function () {
                        var args = arguments;
                        that.removeLock().then(function () {
                            p.resolve(args);
                        }, function (err) {
                            p.reject(err);
                        });
                    }, function (err) {
                        that.removeLock().then(function () {
                            p.reject(err);
                        }, function (err) {
                            p.reject(err);
                        });
                    });
                }, function (err) {
                    p.reject(err);
                });
                return p;
            };
            MongoStore.prototype.getCollection = /* ----------------------------- MONGO CODE ----------------------------------- */
            function () {
                var that = this;
                var done = new rsvp.Promise();
                // Shortcut if we have been here before
                if(that._collection !== null) {
                    done.resolve(that._collection);
                    return done;
                }
                // Open DB
                that._logger.debug('STORE', '%s: Connecting to database - %s', that.id(), that._dbName);
                that._db = new mongo.Db(that._dbName, new mongo.Server(that._host, that._port, {
                    poolSize: 1
                }), {
                    w: 1
                });
                that._db.open(function (err, db) {
                    if(err) {
                        that.fail(done, '%s: Unable to open db: %s : %s', that.id(), that._dbName, err.message);
                    } else {
                        // Open Collection
                        that._logger.debug('STORE', '%s: Opening collection - %s', that.id(), that._collectionName);
                        that._db.createCollection(that._collectionName, function (err, collection) {
                            if(err) {
                                that.fail(done, '%s: Unable to open collection: %s : %s', that.id(), that._collectionName, err.message);
                            } else {
                                that._collection = collection;
                                // Init collection
                                var curP = that.ensureExists(lockUID, {
                                    locked: false
                                }, null);
                                curP = that.wait(curP, function () {
                                    return that.ensureExists(store.rootUID, {
                                        _rev: 0,
                                        _ref: 1,
                                        _type: 'Object',
                                        _data: {
                                        }
                                    }, collection);
                                });
                                curP.then(function () {
                                    done.resolve();
                                }, function (err) {
                                    done.resolve(err);
                                });
                            }
                        });
                    }
                });
                return done;
            };
            MongoStore.prototype.lock = function (timeout) {
                if (typeof timeout === "undefined") { timeout = MINLOCK; }
                var that = this;
                var p = new rsvp.Promise();
                that._logger.debug('STORE', '%s: Trying to acquire lock', that.id());
                var oid = shared.utils.toObjectID(lockUID);
                var rand = new bson.ObjectId().toString();
                that._collection.findAndModify({
                    _id: oid,
                    locked: false
                }, [], {
                    _id: oid,
                    owner: that.id().toString(),
                    host: shared.utils.hostInfo(),
                    pid: process.pid,
                    rand: rand,
                    locked: true
                }, {
                    safe: true,
                    upsert: false,
                    remove: false,
                    new: false
                }, function (err, doc) {
                    if(err) {
                        that.fail(p, '%s: Unable query lock : %s', that.id(), err.message);
                    } else if(!doc) {
                        // Report on current state
                        if(timeout > CHECKRAND) {
                            that._collection.findOne({
                                _id: oid
                            }, function (err, doc) {
                                if(err) {
                                    that.fail(p, '%s: Unable query lock : %s', that.id(), err.message);
                                } else {
                                    that._logger.debug('STORE', '%s: Locked by: %s', that.id(), doc.host);
                                    // If lock rand is changing, reset timout so we don't kill unecessarily
                                    if(doc && doc['rand'] !== undefined && that._lockRand !== doc.rand) {
                                        if(that._lockRand) {
                                            that._logger.debug('STORE', '%s: Lock rand has changed, %s to %s, reseting timeout', that.id(), that._lockRand, doc.rand);
                                        }
                                        that._lockRand = doc.rand;
                                        timeout = CHECKRAND;
                                    }
                                    // We are going to have to break this
                                    if(timeout > MAXLOCK) {
                                        that._logger.debug('STORE', '%s: Lock owner must be dead, trying to remove', that.id());
                                        that.removeLock().then(function () {
                                            that.lock().then(function () {
                                                p.resolve();
                                            }, function (err) {
                                                p.reject(err);
                                            });
                                        }, function (err) {
                                            p.resolve(err);
                                        });
                                    } else {
                                        setTimeout(function () {
                                            that.lock(timeout * 2).then(function () {
                                                p.resolve();
                                            }, function (err) {
                                                p.reject(err);
                                            });
                                        }, timeout);
                                    }
                                }
                            });
                        } else {
                            // < CHECK time, just try again
                            setTimeout(function () {
                                that.lock(timeout * 2).then(function () {
                                    p.resolve();
                                }, function (err) {
                                    p.reject(err);
                                });
                            }, timeout);
                        }
                    } else {
                        that._logger.debug('STORE', '%s: Acquired lock', that.id());
                        p.resolve();
                    }
                });
                return p;
            };
            MongoStore.prototype.removeLock = function () {
                var that = this;
                var done = new rsvp.Promise();
                var oid = shared.utils.toObjectID(lockUID);
                that._collection.update({
                    _id: oid
                }, {
                    _id: oid,
                    locked: false
                }, {
                    safe: that._safe,
                    upsert: true
                }, function (err, update) {
                    if(err) {
                        that.fail(done, '%s: Unable remove lock : %s', that.id(), err.message);
                    } else {
                        that._logger.debug('STORE', '%s: Released lock', that.id());
                        that._lockRand = null;
                        done.resolve();
                    }
                });
                return done;
            };
            MongoStore.prototype.getRoot = function () {
                var that = this;
                var done = new rsvp.Promise();
                if(that._root !== null) {
                    done.resolve(that._root);
                } else {
                    var curP = that.getCollection();
                    curP.then(function () {
                        that.lock().then(function () {
                            that.getObject(store.rootUID).then(function (obj) {
                                that.removeLock().then(function () {
                                    that._root = obj;
                                    done.resolve(obj);
                                }, function (err) {
                                    done.reject(err);
                                });
                            }, function (err) {
                                that.removeLock().then(function () {
                                    ;
                                    done.reject(err);
                                });
                            });
                        }, function (err) {
                            done.reject(err);
                        });
                    }, function (err) {
                        done.reject(err);
                    });
                }
                return done;
            };
            MongoStore.prototype.getObject = function (oid) {
                var done = new rsvp.Promise();
                var that = this;
                that.getCollection().then(function (collection) {
                    that._logger.debug('STORE', '%s: Searching for object: %s', that.id(), oid);
                    collection.findOne({
                        _id: shared.utils.toObjectID(oid)
                    }, function (err, doc) {
                        if(err) {
                            that.fail(done, '%s: Unable to search collection: %s : %s', that.id(), that._collectionName, err.message);
                        } else {
                            if(doc === null) {
                                that.fail(done, '%s: Object missing in store: %s', that.id(), oid);
                            } else {
                                that._logger.debug('STORE', '%s: Loading object: %s:%d', that.id(), oid, doc._rev);
                                // Load the new object
                                var obj = that._cache.find(oid);
                                var rec = that.updateObject(doc, obj);
                                // Reset tracking
                                var t = shared.tracker.getTrackerUnsafe(rec.obj);
                                if(t === null) {
                                    t = new shared.tracker.Tracker(that, rec.obj, rec.id, rec.rev);
                                    that._cache.insert(t.id(), rec.obj);
                                } else {
                                    t.setRev(rec.rev);
                                    t.retrack(rec.obj);
                                }
                                var tdata = {
                                    rout: rec.out,
                                    rin: doc._ref
                                };
                                t.setData(tdata);
                                // Catch root update
                                if(t.id().toString() === store.rootUID.toString()) {
                                    that._root = rec.obj;
                                }
                                // Return object
                                done.resolve(rec.obj);
                            }
                        }
                    });
                });
                return done;
            };
            MongoStore.prototype.refreshSet = function (failed) {
                var that = this;
                var fails = [];
                for(var i = 0; i < failed.length; i++) {
                    fails.push(that.getObject(failed[i]));
                }
                return rsvp.all(fails);
            };
            MongoStore.prototype.writeObject = function (oid, obj, rev, ref) {
                shared.utils.dassert(shared.utils.isValue(oid) && shared.utils.isObjectOrArray(obj));
                var that = this;
                // Prep a copy for upload
                var fake = {
                };
                fake._data = shared.utils.clone(obj);
                var keys = Object.keys(obj);
                for(var k = 0; k < keys.length; k++) {
                    if(shared.utils.isObjectOrArray(obj[keys[k]])) {
                        var id = that.valueId(obj[keys[k]]);
                        fake._data[keys[k]] = {
                            _id: id.toString()
                        };
                    }
                }
                fake._id = shared.utils.toObjectID(oid);
                fake._rev = rev;
                fake._ref = ref;
                fake._type = shared.utils.isObject(obj) ? 'Object' : 'Array';
                // Upload the fake
                var p = new rsvp.Promise();
                that._logger.debug('STORE', '%s: Updating object: %s %j', that.id(), oid, obj);
                that._collection.update({
                    _id: fake._id
                }, fake, {
                    safe: that._safe,
                    upsert: true
                }, function (err, count) {
                    if(err) {
                        that.fail(p, '%s: Update failed on new object %s=%j error %s', that.id(), id, obj, err.message);
                    } else {
                        if(that._safe && count !== 1) {
                            that.fail(p, '%s: Update failed on new object %s=%j count %d', that.id(), id, obj, count);
                        } else {
                            p.resolve();
                        }
                    }
                });
                return p;
            };
            MongoStore.prototype.ensureExists = function (oid, proto, arg) {
                var that = this;
                var p = new rsvp.Promise();
                that._logger.debug('STORE', '%s: Checking/inserting for object: %s', that.id(), oid);
                proto._id = shared.utils.toObjectID(oid);
                that._collection.findOne({
                    _id: shared.utils.toObjectID(oid)
                }, function (err, doc) {
                    if(err) {
                        that.fail(p, '%s: Unable to search collection: %s : %s', that.id(), that._collectionName, err.message);
                    } else if(doc === null) {
                        that._collection.insert(proto, {
                            safe: true
                        }, function (err, inserted) {
                            // Here err maybe be because of a race so we just log it
                            if(err) {
                                that._logger.debug('STORE', '%s: Unable to insert %s (ignoring as maybe race)', that.id(), oid);
                            } else {
                                that._logger.debug('STORE', '%s: Object %s inserted', that.id(), oid);
                            }
                            p.resolve(arg);
                        });
                    } else {
                        that._logger.debug('STORE', '%s: Object %s already exists', that.id(), oid);
                        p.resolve(arg);
                    }
                });
                return p;
            };
            MongoStore.prototype.changeRevAndRef = function (oid, revchange, refchange) {
                var that = this;
                var p = new rsvp.Promise();
                that._logger.debug('STORE', '%s: Updating object rev & ref: %s uprev: %s, upref %d', that.id(), oid, revchange, refchange);
                var revinc = 0;
                if(revchange) {
                    revinc = 1;
                }
                that._collection.findAndModify({
                    _id: shared.utils.toObjectID(oid)
                }, [], {
                    $inc: {
                        _rev: revinc,
                        _ref: refchange
                    }
                }, {
                    safe: true,
                    remove: false,
                    upsert: false,
                    new: true
                }, function (err, doc) {
                    if(err) {
                        that.fail(p, '%s: Update failed on object ref for %s error %s', that.id(), oid, err.message);
                    } else {
                        if(doc === null) {
                            that.fail(p, '%s: Update failed on object ref for %s empty doc', that.id(), oid);
                        } else {
                            if(doc._ref === 0) {
                                that.deleteObject(oid).then(function () {
                                    p.resolve();
                                }, function (err) {
                                    p.reject(err);
                                });
                            } else {
                                p.resolve();
                            }
                        }
                    }
                });
                return p;
            };
            MongoStore.prototype.deleteObject = function (oid) {
                var that = this;
                var p = new rsvp.Promise();
                that._logger.debug('STORE', '%s: Deleting object: %s', that.id(), oid);
                that._collection.remove({
                    _id: shared.utils.toObjectID(oid)
                }, {
                    safe: that._safe
                }, function (err, count) {
                    if(err) {
                        that.fail(p, '%s: Deleting failed on %s error %s', that.id(), oid, err.message);
                    } else {
                        if(that._safe && count !== 1) {
                            that.fail(p, '%s: Deleting failed on %s count %d', that.id(), oid, count);
                        } else {
                            p.resolve();
                        }
                    }
                });
                return p;
            };
            MongoStore.prototype.readProp = function (oid, prop) {
                var that = this;
                var p = new rsvp.Promise();
                var fields = {
                };
                fields['_data.' + prop] = true;
                that._logger.debug('STORE', '%s: Reading prop for object: %s[%s]', that.id(), oid, prop);
                that._collection.findOne({
                    _id: shared.utils.toObjectID(oid)
                }, fields, function (err, doc) {
                    if(err) {
                        that.fail(p, '%s: Unable to search collection: %s : %s', that.id(), that._collectionName, err.message);
                    } else if(doc === null) {
                        that.fail(p, '%s: Object missing in store: %s : %s', that.id(), oid);
                    } else {
                        p.resolve(doc._data[prop]);
                    }
                });
                return p;
            };
            MongoStore.prototype.writeProp = function (oid, prop, value) {
                var that = this;
                var p = new rsvp.Promise();
                if(value instanceof shared.serial.Reference) {
                    value = {
                        _id: value.id()
                    };
                }
                var upd = {
                };
                upd['_data.' + prop] = value;
                that._logger.debug('STORE', '%s: Updating property: %s[%s] %j', that.id(), oid, prop, value);
                that._collection.update({
                    _id: shared.utils.toObjectID(oid)
                }, {
                    $set: upd
                }, {
                    safe: that._safe
                }, function (err, count) {
                    if(err) {
                        that.fail(p, '%s: Update failed on %s[%s] %j error %s', that.id(), oid, prop, value, err.message);
                    } else {
                        if(that._safe && count !== 1) {
                            that.fail(p, '%s: Update failed on %s[%s] %j count %d', that.id(), oid, prop, value, count);
                        } else {
                            p.resolve();
                        }
                    }
                });
                return p;
            };
            MongoStore.prototype.deleteProp = function (oid, prop) {
                var that = this;
                var p = new rsvp.Promise();
                var upd = {
                };
                upd['_data.' + prop] = '';
                that._logger.debug('STORE', '%s: Deleting property: %s[%s]', that.id(), oid, prop);
                that._collection.update({
                    _id: shared.utils.toObjectID(oid)
                }, {
                    $unset: upd
                }, {
                    safe: that._safe
                }, function (err, count) {
                    if(err) {
                        that.fail(p, '%s: Deleting failed on %s[%s] error %s', that.id(), oid, prop, err.message);
                    } else {
                        if(that._safe && count !== 1) {
                            that.fail(p, '%s: Deleting failed on %s[%s] count %d', that.id(), oid, prop, count);
                        } else {
                            p.resolve();
                        }
                    }
                });
                return p;
            };
            MongoStore.prototype.arrayPop = function (oid, front) {
                var that = this;
                var p = new rsvp.Promise();
                var arg = 1;
                var name = 'back';
                if(front) {
                    arg = -1;
                    name = 'front';
                }
                that._logger.debug('STORE', '%s: Array pop: %s[%s]', that.id(), oid, name);
                that._collection.update({
                    _id: shared.utils.toObjectID(oid)
                }, {
                    $pop: {
                        _data: arg
                    }
                }, {
                    safe: that._safe
                }, function (err, count) {
                    if(err) {
                        that.fail(p, '%s: Array pop failed on %s[%s] error %s', that.id(), oid, name, err.message);
                    } else {
                        if(that._safe && count !== 1) {
                            that.fail(p, '%s: Array pop failed on %s[%s] count %d', that.id(), oid, name, count);
                        } else {
                            p.resolve();
                        }
                    }
                });
                return p;
            };
            MongoStore.prototype.checkReadset = function (rset) {
                this._logger.debug('STORE', '%s: checkReadset(%d)', this.id(), rset.size());
                var that = this;
                shared.utils.dassert(rset.size() !== 0);
                var fails = [];
                rset.apply(function (oid, rev) {
                    fails.push(that.revisionCheck(oid, rev));
                    return true;
                });
                return rsvp.all(fails);
            };
            MongoStore.prototype.revisionCheck = function (oid, revision) {
                this._logger.debug('STORE', '%s: revisionCheck(%s,%s)', this.id(), oid, revision);
                var that = this;
                var promise = new rsvp.Promise();
                that._collection.find({
                    _id: shared.utils.toObjectID(oid),
                    _rev: revision
                }).count(function (err, num) {
                    if(err) {
                        promise.reject(err.message);
                    } else {
                        if(num === 1) {
                            promise.resolve(null);
                        } else {
                            promise.resolve(oid);
                        }
                    }
                });
                return promise;
            };
            return MongoStore;
        })(shared.mtx.mtxFactory);
        store.MongoStore = MongoStore;        
    })(shared.store || (shared.store = {}));
    var store = shared.store;
    // store
    })(shared || (shared = {}));
// shared
// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.
/// <reference path='import.ts' />
/// <reference path='utils.ts' />
/// <reference path='id.ts' />
/// <reference path='types.ts' />
var shared;
(function (shared) {
    (function (message) {
        var dassert = shared.utils.dassert;
        var cluster = require('cluster');
        var workerno = cluster.worker ? cluster.worker.uniqueID : 0;
        /**
        * Uses the worker unique id to route data. All non-local messages
        * end up being routed via the cluster master. A null rid is used
        * to send data to the 'network' endpoint. Zero route data means
        * send to master, which is logically the same as saying I don't
        * know where to send it as the master will pass-on if needed.
        */
        var Address = (function () {
            function Address(rid, worker) {
                this.rid = rid;
                this.worker = shared.utils.isValue(worker) ? worker : workerno;
            }
            Address._network = null;
            Address.networkAddress = function networkAddress() {
                if(Address._network === null) {
                    Address._network = new Address(null, 0);
                }
                return Address._network;
            };
            return Address;
        })();
        message.Address = Address;        
        var LocalMessage = (function () {
            function LocalMessage() {
                this.next = null;
                this.to_rid = null;
                this.to_worker = null;
                this.from_rid = null;
                this.from_worker = null;
                this.body = null;
            }
            return LocalMessage;
        })();        
        var _messageType = null;
        function messageType() {
            if(_messageType === null) {
                _messageType = shared.types.TypeStore.instance().type(new LocalMessage());
            }
            return _messageType;
        }
        function isMessage(msg) {
            return shared.types.TypeStore.instance().type(msg) === messageType();
        }
        message.isMessage = isMessage;
        function setTo(msg, addr) {
            shared.utils.dassert(shared.utils.isObject(msg));
            shared.utils.dassert(shared.utils.isObject(addr));
            msg.to_rid = addr.rid;
            msg.to_worker = addr.worker;
        }
        message.setTo = setTo;
        function setFrom(msg, addr) {
            shared.utils.dassert(shared.utils.isObject(msg));
            shared.utils.dassert(shared.utils.isObject(addr));
            msg.from_rid = addr.rid;
            msg.from_worker = addr.worker;
        }
        message.setFrom = setFrom;
        function replyTo(to, from) {
            shared.utils.dassert(shared.utils.isObject(to));
            shared.utils.dassert(shared.utils.isObject(from));
            to.to_rid = from.from_rid;
            to.to_worker = from.from_worker;
        }
        message.replyTo = replyTo;
        var _message_list = null;
        function getMessage() {
            var message = _message_list;
            if(message != null) {
                _message_list = _message_list.next;
                message.next = null;
            } else {
                message = new LocalMessage();
            }
            return message;
        }
        message.getMessage = getMessage;
        function getMessageFor(addr) {
            var m = getMessage();
            message.setFrom(m, addr);
            return m;
        }
        message.getMessageFor = getMessageFor;
        function returnMessage(msg) {
            msg.next = _message_list;
            _message_list = msg;
        }
        message.returnMessage = returnMessage;
    })(shared.message || (shared.message = {}));
    var message = shared.message;
    // message
    })(shared || (shared = {}));
// shared
// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.
/// <reference path='import.ts' />
/// <reference path='debug.ts' />
/// <reference path='utils.ts' />
/// <reference path='id.ts' />
/// <reference path='collect.ts' />
/// <reference path='types.ts' />
/// <reference path='tracker.ts' />
/// <reference path='mongo.ts' />
var ver = '0.2.0';
exports.version = function () {
    return ver;
};
exports.info = function () {
    return 'Shared ' + ver + ' Copyright(c) Kevin Jones @hutkev';
};
exports.createStore = shared.store.createStore;
exports.debug = {
};
exports.debug.log = function (args) {
    shared.utils.defaultLogger().enableDebugLogging(args);
};
exports.debug.assert = shared.utils.enableAsserts;
exports.tests = {
};
exports.tests.utils = shared.utils;
exports.tests.types = shared.types;
exports.tests.tracker = shared.tracker;
exports.tests.store = shared.store;
//@ sourceMappingURL=shared.js.map
