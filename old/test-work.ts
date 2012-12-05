/// <reference path='../defs/node-0.8.d.ts' />
/// <reference path='../lib/work.ts' />
/// <reference path='../lib/debug.ts' />


module testwork {

  import work = shared.work;
  import utils = shared.utils;

  class CallbackWorkItem extends work.WorkItem {
    private _work;
    private _abort;

    constructor (work: (queue: work.WorkQueue) => void , 
      abort: (queue: work.WorkQueue) => void ) { 
      super();
      this._work = work;
      this._abort = abort;
    }

    work() {
      this._work(this.queue());
    }

    abort() {
      this._abort(this.queue());
    }
  }

  export function pushitem(test) {
    var wq = new shared.work.WorkQueue();

    var wi = new CallbackWorkItem(function (queue: shared.work.WorkQueue) {
      test.ok(queue.pop() === wi);
    }, function (queue: shared.work.WorkQueue) {
    })
    test.expect(2);
    wq.push(wi);
    test.ok(wq.empty());
    test.done();
  }

  export function shiftitem(test) {
    var wq = new shared.work.WorkQueue();

    var wi = new CallbackWorkItem(function (queue: shared.work.WorkQueue) {
      test.ok(queue.shift() === wi);
    }, function (queue: shared.work.WorkQueue) {
    })
    test.expect(2);
    wq.unshift(wi);
    test.ok(wq.empty());
    test.done();
  };

  export function stalled(test) {

    var aborted = false;
    var logger = utils.defaultLogger();
    var f = logger.fatal;
    logger.fatal = function (fmt: string, args: any[]) {
      aborted = true;
    }

    test.expect(1);
    var wq = new shared.work.WorkQueue();
    var wi  = new CallbackWorkItem(
      function (queue: shared.work.WorkQueue) {
      },
      function (queue: shared.work.WorkQueue) {
        test.ok(queue.front() === wi);
        queue.pop();
      })
    wq.push(wi);
  
    var end = function () {
      if (aborted && wq.empty()) {
        logger.fatal = f;
        test.done()
      } else {
        setTimeout(end, 1000);
      }
    }
    setTimeout(end, 1000);
  };

} // work
