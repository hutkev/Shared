var cluster = require('cluster');
var store = require('../lib/shared.js').createStore();

if (cluster.isMaster) {

  store.apply(function (db) { 
    // Store init code
  });

  cluster.fork();

} else {

  store.apply(function (db) {
    // Worker action
  }, function (err) {
     // err is null on success
     process.exit(0);
  });

}
