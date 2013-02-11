/*
 * Bank account transaction example
 *
 * Each worker performs a number of transfers between accounts. The goal is not
 * to lose any money during the transfers due to workers operating on the same
 * accounts.
 *
 * Assumes MongoDB is running on localhost on default port
 */
var cluster = require('cluster');
var shared = require('../lib/shared.js');

// Uncomment this to show debug messages
// shared.debug.log('STORE');

// Get access to the local MongoDB store
var store = require('../lib/shared.js').createStore();

var workers = parseInt(process.argv[2]) || 1;
var accounts = (parseInt(process.argv[3]) || 100);
var transfers = ((parseInt(process.argv[4]) || 1000) / workers) >>> 0;

if (cluster.isMaster) {

  // In the master
  console.log('Options: <workers> <accounts> <transfers>');
  console.log('Creating %s accounts with $1000 each', accounts);
  var running = 0;

  // Create the account details
  store.apply(function (db) { 
    for (var a =0 ; a < accounts; a++) {
      db['account'+a] = { balance : 1000 };
    }
  }, function (err) {
    if (err) console.trace(err);

    // Start the workers going
    console.log('Starting %s workers to perform %s transfers each between the accounts', workers, transfers);
    for (var w = 0 ; w < workers; w++) {
      cluster.fork();
      running++;
    }
  });

  // Wait for worker death
  var tcash = accounts * 1000;
  console.log('Waiting for workers to complete...');
  cluster.on('exit', function (worker, code, signal) {
    running--;
    console.log('Only %d left running', running);

    // When all dead, count the cash
    if (running === 0) {
      store.apply(function (db) {
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
        store.close();
      });
    }
  });

} else {

  // How many transfers still to do
  var todo = transfers;

  // Process one transfer
  function transfer() {
    var from = (Math.random() * accounts) >>> 0;
    var to = (Math.random() * accounts) >>> 0;
    var amount = (Math.random() * 100) >>> 0;

    store.apply(function (db) {
      db['account' + from].balance -= amount;
      db['account' + to].balance += amount;
    }, function (err) {
      if (err) console.trace(err);
      todo--;
      if (todo > 0) {
        process.nextTick(transfer);
      } else {
        store.close();
        process.exit();
      }
   });
  };

  // Bootstrap
  transfer();
}
