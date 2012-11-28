/// <reference path='../defs/node-0.8.d.ts' />
/// <reference path='../lib/work.ts' />

//var work: shared.work = require('../lib/shared.js').tests.work;

exports.pushitem = function(test) {
  var wq = new shared.work.WorkQueue();
  
  var wi  = new shared.work.CallbackWorkItem(function (queue: shared.work.WorkQueue) {
    test.ok(queue.pop() === wi);
  }, function (queue: shared.work.WorkQueue) {
  })
  test.expect(2);
  wq.push(wi);
  test.ok(wq.empty());
  test.done();
};

exports.shiftitem = function(test) {
  var wq = new shared.work.WorkQueue();
  
  var wi  = new shared.work.CallbackWorkItem(function (queue: shared.work.WorkQueue) {
    test.ok(queue.shift() === wi);
  }, function (queue: shared.work.WorkQueue) {
  })
  test.expect(2);
  wq.unshift(wi);
  test.ok(wq.empty());
  test.done();
};

/*
exports.stalled = function(test) {
  var wq = new work.WorkQueue();
  
  var wi  = new work.CallbackWorkItem(
    function (queue: shared.work.WorkQueue) {
    },
    function (queue: shared.work.WorkQueue) {
    })
  wq.push(wi);

  var end = function () {
    if (wq.empty())
      test.done()
    else
      setTimeout(end, 1000);
  }
  setTimeout(end, 1000);
};
*/
