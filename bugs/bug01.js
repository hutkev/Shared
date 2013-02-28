
var shared = require('../lib/shared.js');
var store = shared.createStore();

store.clean(function(err) {
  store.apply(function(db) {
   db['test'] = [];
  }, function(err) {
    store.apply(function(db) {
      db['test'][0] = 1;
    },function(err) {
      store.close();
    });
  });
});



