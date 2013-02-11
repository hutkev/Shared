/*
 * Simple cluster countdown test.
 *
 * Each worker is given its own independant counter that must be reduced to 0. Once all 
 * the workers complete the master checks they have done their duty.
 *
 * Assumes MongoDB is running on localhost on default port
 */
var cluster = require('cluster');
var shared = require('../lib/shared.js');

// Uncomment this to show debug messages
// shared.debug.log('STORE');

// Get access to the local MongoDB store
var store = require('../lib/shared.js').createStore();

if (cluster.isMaster) {

  // In master
  var workers = parseInt(process.argv[2]) || 1;
  var count = ((parseInt(process.argv[3]) || 10000) / workers) >>> 0;
  var running = 0;

  // Create the counters, 1 for each worker
  console.log('Creating counter(s) of size %s for %s worker(s) to decrement', count, workers);
  store.apply(function (db) { 
    for (var w =0 ; w<workers; w++) {
      if (db['worker'+w] === undefined)
        db['worker'+w] = { counter : count };
      else
        db['worker'+w].counter = count;
    }
  }, function (err) {
    if (err) console.trace(err);

    // Start the workers going
    console.log('Forking workers...');
    for (var w = 0 ; w < workers; w++) {
      cluster.fork();
      running++;
    }
  });

  // Wait for worker death
  console.log('Waiting for death...');
  cluster.on('exit', function (worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
    running--;
    if (running === 0) {

      // When all dead check counters are empty
      store.apply(function (db) {
        var sum = 0;
        for (var w = 0 ; w < workers; w++) {
          if (db['worker' + w] === undefined) {
            console.log('FAILED');
            console.log(w);
            console.log(db);
          }

          sum = db['worker' + w].counter;
        }
        return sum;
      }, function (err, sum) {
        if (err) {
          console.log('Error: ' + err);
        } else {
          console.log('Sum of counters: ' + sum);
          store.close();
        }
      });
    }
  });

} else {

  // In worker
  var more = true;
  var worker = 'worker' + (cluster.worker.id - 1);

  // Decrement one from counter & try again
  function decOne() {
    store.apply(function (db) {
      db[worker].counter -= 1;
      return db[worker].counter > 0;
    }, function (err,more) {
      if (!err && more) {
        process.nextTick(decOne);
      } else {
        console.log(worker + ' all done');
        store.close();
        process.exit();
      }
   });
  };

  // Bootstrap
  decOne();
}
