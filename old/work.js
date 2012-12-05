var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
}
var shared;
(function (shared) {
    (function (work) {
        var WorkItem = (function () {
            function WorkItem() {
                this._queue = null;
            }
            WorkItem.prototype.queue = function () {
                return this._queue;
            };
            WorkItem.prototype.start = function (queue) {
                this._queue = queue;
                this.work();
            };
            WorkItem.prototype.working = function () {
                return this._queue !== null;
            };
            WorkItem.prototype.work = function () {
            };
            WorkItem.prototype.abort = function () {
            };
            return WorkItem;
        })();
        work.WorkItem = WorkItem;        
        var CallbackWorkItem = (function (_super) {
            __extends(CallbackWorkItem, _super);
            function CallbackWorkItem(work, abort) {
                        _super.call(this);
                this._work = work;
                this._abort = abort;
            }
            CallbackWorkItem.prototype.work = function () {
                this._work(this.queue());
            };
            CallbackWorkItem.prototype.abort = function () {
                this._abort(this.queue());
            };
            return CallbackWorkItem;
        })(WorkItem);
        work.CallbackWorkItem = CallbackWorkItem;        
        var WorkQueue = (function () {
            function WorkQueue(maxtick) {
                this._logger = shared.utils.defaultLogger();
                this._queue = new shared.utils.Queue();
                this._maxtick = maxtick || 10;
                this._ticks = 0;
                this._ticking = false;
            }
            WorkQueue.prototype.checkWork = function () {
                if(!this.empty()) {
                    var wi = this._queue.front();
                    if(!wi.working()) {
                        wi.start(this);
                        this._ticks = 0;
                        var queue = this;
                        var checker = function () {
                            if(!queue.empty() && queue.front() === wi) {
                                queue._ticks++;
                                if(queue._ticks > queue._maxtick) {
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
            };
            WorkQueue.prototype.empty = function () {
                return this._queue.empty();
            };
            WorkQueue.prototype.front = function () {
                return this._queue.front();
            };
            WorkQueue.prototype.push = function (item) {
                this._queue.push(item);
                this.checkWork();
            };
            WorkQueue.prototype.pop = function () {
                var wi = this._queue.pop();
                this.checkWork();
                return wi;
            };
            WorkQueue.prototype.unshift = function (item) {
                this._queue.unshift(item);
                this.checkWork();
            };
            WorkQueue.prototype.shift = function () {
                var wi = this._queue.shift();
                this.checkWork();
                return wi;
            };
            return WorkQueue;
        })();
        work.WorkQueue = WorkQueue;        
    })(shared.work || (shared.work = {}));
    var work = shared.work;

})(shared || (shared = {}));

