/*
 * Clean out db
 *
 * Assumes MongoDB is running on localhost on default port
 */
var shared = require('../lib/shared.js');

// Uncomment this to show debug messages
// shared.debug.log('STORE');

// Get access to the local MongoDB store
var store = require('../lib/shared.js').createStore();

// Create the account details
store.apply(function (db) {
  var keys = Object.keys(db);
  for (var i = 0 ; i < keys.length; i++)
    delete db[keys[i]];
}, function (err) {
  if (err) console.trace(err);
  store.close();
});
