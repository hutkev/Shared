// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />
/// <reference path='collect.ts' />

module shared {
  export module utils {

    var fs = require('fs');
    var assert = require('assert');
    var util = require('util');
    var cluster = require('cluster');
 
    /**
     * Log message levels, should really be an enum.
     * Logs include messages for current level and higher. NONE turns off 
     * logging.  
     */
    export var LogLevel = {
      INFO: 1,
      WARN: 2,    
      FATAL: 3,
      NONE: 4
    };

    /**
     * Writable interface
     */
    export interface Writeable {
      write(str: string): void;
    }

    /**
     * Writable FD
     */
    export class WriteableFD implements Writeable {

      private _fd: number;

      constructor (fd: number) { 
        this._fd = fd;
      }

      write(str: string): void {
        var b = new Buffer(str);
        fs.writeSync(this._fd, b, 0, b.length, null);
      }
    }

    /**
     * Logger helper
     */
    export class Logger {

      private _to: Writeable;
      private _next: Logger;
      private _prefix: string;
      private _level: number;
      private _debug: StringSet;

      constructor (to: Writeable, prefix: string, level: number, 
        debug?: string[], next?: Logger) {
        this._to = to;
        this._prefix = prefix;
        this._level = level;
        this._debug = new StringSet(debug);
        this._next = next;
      }

      public logLevel(): number {
        return this._level;
      }

      public isDebugLogging(component: string): bool {
        return this._debug.has(component);
      }

      public enableDebugLogging(component: string, on?: bool): void {
        if (isValue(on) && !on) {
          this._debug.remove(component);
        } else {
          this._debug.put(component);
        }
      }

      public disableDebugLogging(): void {
        this._debug.removeAll();
      }

      public debug(component: string, fmt: string, ...msgs: any[]): void {
        if (this.isDebugLogging(component)) {
          var f = component + ': ' + fmt;
          this.log(LogLevel.INFO, f, msgs);
          if (this._next)
            this._next.log(LogLevel.INFO, f, msgs);
        }
      }

      public info(fmt: string, ...msgs: any[]): void {
        this.log(LogLevel.INFO, fmt, msgs);
        if (this._next)
          this._next.log(LogLevel.INFO, fmt, msgs);
      }

      public warn(fmt: string, ...msgs: any[]): void {
        this.log(LogLevel.WARN, fmt, msgs);
        if (this._next)
          this._next.log(LogLevel.INFO, fmt, msgs);
      }

      public fatal(fmt: string, ...msgs: any[]): void {
        this.log(LogLevel.FATAL, fmt, msgs);
        if (this._next)
          this._next.log(LogLevel.FATAL, fmt, msgs);
      }

      public write(msg: string) {
        this._to.write(msg);
        if (this._next)
          this._next.write(msg);
      }

      public trace(fmt: string, ...msgs: any[]): void {
        var e = new Error;
        e.name = 'Trace';
        e.message = dateFormat(this._prefix, fmt, msgs);
        Error.captureStackTrace(e, arguments.callee);
        this.write(e.stack+'\n');
      }

      private log(type: number, fmt: string, msgs: any[]): void {
        switch (type) {
          case LogLevel.INFO:
            if (this.logLevel() <= LogLevel.INFO) {
              this._to.write(dateFormat(this._prefix+ ' INFO',fmt,msgs));
            }
            break;
          case LogLevel.WARN:
            if (this.logLevel() <= LogLevel.WARN) {
              this._to.write(dateFormat(this._prefix+ ' WARNING', fmt, msgs));
            }
            break;
          case LogLevel.FATAL:
            if (this.logLevel() <= LogLevel.FATAL) {
              var err = dateFormat(this._prefix+ ' FATAL', fmt, msgs);
              this._to.write(err);
              if (!isValue(this._next))
                throw new Error('Fatal error: ' + err);
            }
            break;
          case LogLevel.NONE:
            break;
          default:
            dassert(false);
            break;
        }
        if (this._next)
          this._next.log(LogLevel.INFO, fmt, msgs);
      }
    }

    /**
     * File logger
     */
    export class FileLogger extends Logger {

      constructor (fileprefix: string, prefix: string, level: number, 
        subjects: string[], next?: Logger) {
        var w = this.openLog(fileprefix);
        super(w, prefix, level, subjects, next);
      }

      private openLog(fileprefix: string) : Writeable {
        var i = 0;
        while (true) {
          var name = fileprefix + '-' + process.pid + '-' + i;
          try {
            var fd = fs.openSync(name, 'ax', '0666');
            return new WriteableFD(fd);
          } catch (e) {
            // Try again with another suffix
            i++;
            if (i === 10) {
              throw e;
            }
          }
        }
      }
    }

    var _defaultLogger: Logger = null;

    /**
     * Set a logger to be used as the default for modules.
     */
    export function setdefaultLogger(logger: Logger) {
      dassert(isValue(logger));
      _defaultLogger = logger;
    }

    /**
     * Obtains the default logger. If one has not been set then logging is
     * to process.stdout at the INFO level.
     */
    export function defaultLogger() : Logger {
      if (!_defaultLogger) {
        var prefix = 'master';
        if (cluster.worker) 
          prefix = 'work ' + cluster.worker.id;
        _defaultLogger = new Logger(process.stdout, prefix, LogLevel.INFO, []);
      }
      return _defaultLogger;
    }

    var _assertsEnabled = true;

    /**
     * Enable/Disable internal asserts.
     */
    export function enableAsserts(on: bool) {
      _assertsEnabled = on;
    }

    /**
     * Are assert enabled?
     */
    export function assertsEnabled() : bool {
      return _assertsEnabled;
    }

    /**
     * Switchable assert handler.
     */
    export function dassert(test: bool) {
      if (_assertsEnabled)
        assert.ok(test);
    }

  } // module utils
} // module shared