var cluster = require('cluster');
var store = require('../lib/shared.js').createStore();

var workers = parseInt(process.argv[2]) || 1;
var jobs = (parseInt(process.argv[3]) || 100);

if (cluster.isMaster) {

  console.log('Options: <workers> <jobs>');
  console.log('Creating %s fib(..) jobs', jobs);

  //require('../lib/shared.js').debug.log('STORE');

  store.atomic(function (db) {
    db.jobs = [];
    db.results = [];
    for (var a = 0 ; a < jobs; a++) {
      db.jobs.push((Math.random() * 19) >>> 0);
    }
  });

  console.log('Starting %s workers to perform %s jobs', workers, jobs);
  var running = 0;
  for (var w = 0 ; w < workers; w++) {
    cluster.fork();
    running++;
  }

  console.log('Waiting for workers to complete...');
  cluster.on('exit', function (worker, code, signal) {
    running--;
    console.log('Only %d left running', running);
    if (running === 0) {
      store.atomic(function (db) {
        return { jobs: db.jobs.length, results: db.results.length };
      }, function (err, res) {
        console.log('The job queue contains %d entries', res.jobs);
        console.log('The results queue contains %d entries', res.results);
      });
    }
  });

} else {

  //require('../lib/shared.js').debug.log('STORE');

  var done = 0;

  function fib(n) {
    return n < 2 ? n : fib(n - 1) + fib(n - 2);
  }

  function doJob() {
    store.atomic(function (db) {
      return db.jobs.shift();
    }, function (err, job) {
      if (!err && job !== undefined) {
        var result = fib(job);
        store.atomic(function (db) {
          return db.results.push(result);
        });
        done++;
        process.nextTick(doJob);
      } else {
        console.log('Worker %d did %d jobs', cluster.worker.id, done);
        process.exit(0);
      }
    });
  };

  doJob();
}
