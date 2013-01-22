var cluster = require('cluster');
var shared = require('../lib/shared.js');
//shared.debug.log('STORE');

var store = shared.createStore();

if (cluster.isMaster) {

  var workers = parseInt(process.argv[2]) || 1;
  var count = ((parseInt(process.argv[3]) || 10000) / workers) >>> 0;
  console.log('Creating counter(s) of size %s for %s worker(s) to decrement', count, workers);
  store.atomic(function (db) { 
    for (var w =0 ; w<workers; w++) {
      db['worker'+w] = count;
    }
  });

  console.log('Forking workers...');
  var running = 0;
  for (var w = 0 ; w < workers; w++) {
    cluster.fork();
    running++;
  }

  console.log('Waiting for death...');
  cluster.on('exit', function (worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
    running--;
    if (running === 0) {
      for (var w = 0 ; w < workers; w++) {
        store.atomic(function (db) {
          return db['worker' + w];
        }, function (err, count) {
          console.log('Worker %s has counted down to %s', w, count);
        });
      }
    }
  });

} else {

try {
  var more = true;
  var worker = 'worker' + (cluster.worker.id - 1);

  function decOne() {
    store.atomic(function (db) {
      db[worker] -= 1;
      return db[worker] > 0;
    }, function (err,more) {
      if (!err && more) {
        process.nextTick(decOne);
      } else {
  	console.timeEnd('Duration');
      }
   });
  };

  console.time('Duration');
  decOne();
} catch (e) {
  console.log('Worker exception');
}
}
