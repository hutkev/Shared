// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache License, Version 2.0.
// See LICENSE.txt in the project root for complete license information.

/// <reference path='../defs/node-0.8.d.ts' />

module shared {
  export module utils {

    /**
     * A simple string set, the strings must be valid property names
     */
    export class StringSet {
      private _id: number;

      constructor (names: string[]) {
        this._id = 0;
        for (var i = 0; i < names.length; i++) {
          this.put(names[i]);
        }
      }

      put(key: string): void {
        this[key] = this._id;
        this._id++;
      }

      has(key: string): bool {
        return this.hasOwnProperty(key);
      }

      id(key: string): number {
        return this[key];
      }

      remove(key: string): bool {
        var exists = this.has(key);
        delete this[key];
        return exists;
      }
    }

    /**
     * Log message levels, should really be an enum
     */
    export var LogLevel = {
      DEBUG: 0,
      INFO: 1,
      FATAL: 2
    };

    /**
     * Logger interface
     */
    export interface Logger {
      log(type: number, subject: string, fmt: string, msgs: any[]): void;
    }

    /**
     * Logger helper
     */
    export class LogBase implements Logger {

      private _next: Logger;
      private _level: number;
      private _subjects: StringSet;

      constructor (next: Logger, level: number, subjects: string[]) {
        this._next = next;
        this._level = level;
        this._subjects = new StringSet(subjects);
      }

      public level(): number {
        return this._level;
      }

      public logSubject(subject: string): bool {
        return this._subjects.has(subject);
      }

      public debug(subject: string, fmt: string, ...msgs: any[]): void {
        this.log(LogLevel.DEBUG, subject, fmt, msgs);
        if (this._next)
          this._next.log(LogLevel.DEBUG, subject, fmt, msgs);
      }

      public info(subject: string, fmt: string, ...msgs: any[]): void {
        this.log(LogLevel.INFO, subject, fmt, msgs);
        if (this._next)
          this._next.log(LogLevel.INFO, subject, fmt, msgs);
      }

      public fatal(fmt: string, ...msgs: any[]): void {
        this.log(LogLevel.FATAL, null, fmt, msgs);
        if (this._next)
          this._next.log(LogLevel.FATAL, null, fmt, msgs);
      }

      public assert(test: bool, fmt: string, ...args: any[]): void {
        if (this._level === LogLevel.DEBUG && !(test)) {
          this.log(LogLevel.FATAL, null, fmt, args);
          if (this._next)
            this._next.log(LogLevel.FATAL, null, fmt, args);
        }
      }

      private log(type: number, subject: string, fmt: string, msgs: any[]): void {
        this.assert(false, "Missing override");
      }
    }

    /**
     * Simple console logger
     */
    export class ConsoleLogger extends LogBase {

      constructor (next: Logger, level: number, ...subjects: string[]) {
        super(next, level, subjects);
      }

      private log(type: number, subject: string, fmt: string, msgs: any[]) {
        switch (type) {
          case LogLevel.DEBUG:
            if (this.logSubject(subject) && this.level() === LogLevel.DEBUG) {
              var d = new Date().toISOString();
              console.info(d + ' DEBUG: ' + fmt, msgs);
            }
            break;
          case LogLevel.INFO:
            if (this.logSubject(subject) && this.level() <= LogLevel.INFO) {
              var d = new Date().toISOString();
              console.info(d + ' INFO: ' + fmt, msgs);
            }
            break;
          case LogLevel.FATAL:
            var d=new Date().toISOString();
            console.error(d+' FATAL: '+fmt, msgs);
            throw new Error('Fatal error');
            break;
          default:
            this.assert(false, "Unexpected LogLevel");
            break;
        }

      }
    }

    /**
     * File logger
     */
    export class FileLogger extends LogBase {

      private _fileprefix: string;
      private _fd: number;

      constructor (fileprefix: string, next: Logger, level: number, ...subjects: string[]) {
        this._fileprefix = fileprefix;
        this._fd = null;
        super(next, level, subjects);
      }

      private log(type: number, subject: string, fmt: string, msgs: any[]) {
        if (!this._fd) this.openLog();
        switch (type) {
          case LogLevel.DEBUG:
            if (this.logSubject(subject) && this.level() === LogLevel.DEBUG) {
              var d = new Date().toISOString();
              var b = new Buffer(util.format(d + ' DEBUG: ' + fmt, msgs));
              fs.writeSync(this._fd, b, 0, b.length, null);
            }
            break;
          case LogLevel.INFO:
            if (this.logSubject(subject) && this.level() <= LogLevel.INFO) {
              var d = new Date().toISOString();
              var b = new Buffer(util.format(d + ' INFO: ' + fmt, msgs));
              fs.writeSync(this._fd, b, 0, b.length, null);
            }
            break;
          case LogLevel.FATAL:
            var d = new Date().toISOString();
            var b = new Buffer(util.format(d + ' FATAL: ' + fmt, msgs));
            fs.writeSync(this._fd, b, 0, b.length, null);
            throw new Error('Fatal error');
            break;
          default:
            this.fatal("Unexpected LogLevel");
        }
      }

      private openLog() {
        if (!this._fd) {
          var i = 0;
          while (true) {
            var name = this._fileprefix + '-' + process.pid + '-' + i;
            try {
              var fd = fs.openSync(name, 'ax', '0666');
              this._fd = fd;
              return;
            } catch (e) {
              i++;
              if (i === 32) {
                throw e;
              }
            }
          }
        }
      }
    }
  } // module utils
} // module shared