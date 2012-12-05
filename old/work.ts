// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />
/// <reference path='debug.ts' />
/// <reference path='collect.ts' />

module shared {
  export module work {

    export class WorkItem {
      private _queue: WorkQueue;

      constructor () {
        this._queue = null;
      }

      queue() {
        return this._queue;
      }

      start(queue: WorkQueue) { 
        this._queue = queue;
        this.work();
      }

      working() : bool { 
        return this._queue !== null;
      }

      /*
       * Override to do work, will be called periodically until
       * the item is removed from the queue.
       */
      work() {
      }

      /*
       * Override to handle task failure, return true to indicate 
       */
      abort() : void {
      }

    }

    export class WorkQueue {
      private _logger: utils.Logger;
      private _maxtick: number;
      private _ticks: number;
      private _ticking: bool;
      private _queue: utils.Queue;

      constructor (maxtick?: number) {
        this._logger = utils.defaultLogger();
        this._queue = new utils.Queue();
        this._maxtick = maxtick || 100;
        this._ticks = 0;
        this._ticking = false;
      }

      private checkWork() : void {
        if (!this.empty()) {
          var wi: WorkItem = this._queue.front();
          if (!wi.working()) {

            // Start task
            wi.start(this);

            // Setup checker to throw if does not complete
            this._ticks = 0;
            var queue = this;
            var checker = function () {
              if (!queue.empty() && queue.front() === wi) {
                queue._ticks++;
                if (queue._ticks > queue._maxtick) {
                  wi.abort();
                  queue._logger.fatal('WorkQueue item stalled', wi);
                } else {
                  wi.work();
                }
                setTimeout(checker, 100);
              }
            };
            setTimeout(checker, 100);
          }
        }
      }

      empty () : bool  {
        return this._queue.empty();
      }

      front() {
        return this._queue.front()
      }

      push(item: WorkItem) {
        this._queue.push(item);
        this.checkWork();
      }

      pop() : WorkItem {
        var wi = this._queue.pop();
        this.checkWork();
        return wi;
      }

      unshift(item: WorkItem) {
        this._queue.unshift(item);
        this.checkWork();
      }
      
      shift(): WorkItem {
        var wi = this._queue.shift();
        this.checkWork();
        return wi;
      }
    }


  } // module work
} // module shared