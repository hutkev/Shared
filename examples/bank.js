var cluster = require('cluster');
var store = require('../lib/shared.js').createStore();

var workers = parseInt(process.argv[2]) || 1;
var accounts = (parseInt(process.argv[3]) || 100);
var transfers = ((parseInt(process.argv[4]) || 1000) / workers) >>> 0;

if (cluster.isMaster) {

  //require('../lib/shared.js').debug.log('STORE');

  console.log('Options: <workers> <accounts> <transfers>');
  console.log('Creating %s accounts with $1000 each', accounts);
  store.atomic(function (db) { 
    for (var a =0 ; a < accounts; a++) {
      db['account'+a] = { balance : 1000 };
    }
  });
  var tcash = accounts * 1000;

  console.log('Starting %s workers to perform %s transfers each between the accounts', workers, transfers);
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
        var sum = 0;
        for (var a = 0 ; a < accounts; a++) {
          sum += db['account' + a].balance;
        }
        return sum;
      }, function (err, sum) {
        if (sum === tcash) {
          console.log('Phew, there is still $%d in the accounts, all is well.', sum);
        } else {
          console.log('Darn, there is $%d in the accounts, there should have been $%d.', sum, tcash);
        }
      });
    }
  });

} else {

  //require('../lib/shared.js').debug.log('STORE');

  var todo = transfers;

  function transfer() {
    var from = (Math.random() * accounts) >>> 0;
    var to = (Math.random() * accounts) >>> 0;
    var amount = (Math.random() * 100) >>> 0;

    store.atomic(function (db) {
      db['account' + from].balance -= amount;
      db['account' + to].balance += amount;
    }, function (err) {
     if (err===null) {
       if (todo-- > 1) {
         process.nextTick(transfer);
         return;
       }
     }
     process.exit();
   });
  };

  transfer();
}
