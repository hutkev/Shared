/*
 * Work queue example
 *
 * Master queues a number of fib() calculation jobs and waits for workers to 
 * complete them.
 *
 * Assumes MongoDB is running on localhost on default port
 */

var cluster = require('cluster');
var shared = require('../lib/shared');

// Uncomment this to show debug messages
// shared.debug.log('STORE');

// Get access to the local MongoDB store
var store = shared.createStore();

var workers = parseInt(process.argv[2]) || 1;
var jobs = (parseInt(process.argv[3]) || 100);

if (cluster.isMaster) {

  // In master
  console.log('Options: <workers> <jobs>');
  console.log('Creating %s fib(..) jobs', jobs);
  var running = 0;
  store.apply(function (db) {
    // Setup jobs for workers
    db.jobs = [];
    db.results = [];
    for (var a = 0 ; a < jobs; a++) {
      db.jobs.push((Math.random() * 19) >>> 0);
    }
  }, function (err) {
    if (err) console.trace(err);

    // Start the workers going
    console.log('Starting %s workers to perform %s jobs', workers, jobs);
    for (var w = 0 ; w < workers; w++) {
      cluster.fork();
      running++;
    }
  });

  // Wait for worker death
  console.log('Waiting for workers to complete...');
  cluster.on('exit', function (worker, code, signal) {
    running--;
    console.log('Only %d left running', running);

    // All dead, report results
    if (running === 0) {
      store.apply(function (db) {
        return { jobs: db.jobs.length, results: db.results.length };
      }, function (err, res) {
        if (err) console.trace(err);
        console.log('The job queue contains %d entries', res.jobs);
        console.log('The results queue contains %d entries', res.results);
        store.close();
      });
    }
  });

} else {

  var done = 0;

  function fib(n) {
    return n < 2 ? n : fib(n - 1) + fib(n - 2);
  }

  // Do a calc
  function doJob() {
    // Grab a job
    store.apply(function (db) {
      return db.jobs.shift();
    }, function (err, job) {
      if (!err && job !== undefined) {
        // Compute answer
        var result = fib(job);

        // Record result
        store.apply(function (db) {
          return db.results.push(result);
        }, function(err) {
          if (err) console.trace(err)
          done++;
          process.nextTick(doJob);
        });
      } else {
        console.log('Worker %d did %d jobs', cluster.worker.id, done);
        store.close();
        process.exit(0);
      }
    });
  };

  // Boostrap
  doJob();
}
