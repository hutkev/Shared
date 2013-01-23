var cluster = require('cluster');
var shared = require('../lib/shared.js');
shared.debug.log('STORE');
var store = require('../lib/shared.js').createStore();

if (cluster.isMaster) {

  var workers = parseInt(process.argv[2]) || 1;
  var count = ((parseInt(process.argv[3]) || 10000) / workers) >>> 0;
  console.log('Creating counter(s) of size %s for %s worker(s) to decrement', count, workers);
  store.atomic(function (db) { 
    for (var w =0 ; w<workers; w++) {
      if (db['worker'+w] === undefined)
        db['worker'+w] = { counter : count };
      else
        db['worker'+w].counter = count;
    }
  }, function(err) {
    console.log('Forking workers...');
    var running = 0;
    for (var w = 0 ; w < workers; w++) {
      cluster.fork();
      running++;
    }
  });


  console.log('Waiting for death...');
  cluster.on('exit', function (worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
    running--;
    if (running === 0) {
      store.atomic(function (db) {
        for (var w = 0 ; w < workers; w++) 
          console.log('Worker %s has counted down to %s', w, db['worker'+w].counter);
      }, function (err, count) {
        if (err)
          console.log('Error: ' + err);
      });
    }
  });

} else {

  var more = true;
  var worker = 'worker' + (cluster.worker.id - 1);

  function decOne() {
    store.atomic(function (db) {
      db[worker].counter -= 1;
      return db[worker].counter > 0;
    }, function (err,more) {
      if (!err && more) {
        process.nextTick(decOne);
      } else {
        console.log(worker +' all done');
      }
   });
  };

  decOne();
}
