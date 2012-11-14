var cluster = require('cluster');
var store = require('./shared.js').store;

if (cluster.isMaster) {
	cluster.fork();
	cluster.on('exit', function(worker, code, signal) {
	    console.log('worker ' + worker.process.pid + ' died');
	    console.log(store);
	  });
} else {
	var count = 0;
	function addOne() {
    	store.apply(function(r) {
    		console.log('CALLING');
    		console.log(r);
    		if (r.a === undefined)
    			r.a = 1;
    		else
    			r.a += 1;
    		count++;
    	}, function(ok) {
    		if (count < 2)
    			addOne();
    		else
    			process.exit();
    	});
    };
    addOne();
}