Shared – 0.2.0
==============
Kevin Jones (https://twitter.com/hutkev)

Shared is an interface for managing shared objects. In this version the only supported store is [MongoDB](http://www.mongodb.org). The primary interface uses direct object manipulation to make it trivially easy to use. 

    store.apply(function(db) {
        if (db.savings > amount) {
            db.saving -= amount;
            db.current += amount;
            if (db.history === undefined)
                db.history = [];
            db.history.push({transfer: amount, from: 'saving',  to: 'current' });
        }
    }, function (err) {
        // Error handling
    });
    
To make changes to shared objects you call *apply* on a *store*. Your callback is passed a *db* object which is the (initially empty) root object of a graph of nodes that you can create to store whatever data.

When *apply* invokes the callbacks your changes will have been committed to the store (and in this version to MongoDB) to allow others to see them. Applying changes is atomic, either they are all applied or none are. 

Creating a Store
----------------

    var shared = require('shared');
    var store = shared.createStore(options);
    
The options are:
* host (default: localhost) - MongoDB hostname
* port (default: 27017) - MongoDB port
* db (default: "shared") - MongoDB database name
* collection (default: "shared") - MongoDB collection name
 
The collection does not have to be for the exclusive use of shared but for safety it may be better to use a dedicated collection.

Closing a Store
---------------

  store.close();

If you don't close the stores then your process will not exit.

Side effects
------------

Shared performs updates optimistically on a locally cached version of the shared objects. If it is later determined that the cache is out of date with respect to the data stored in MongoDB your callback will be re-run. 

This means you should be careful to avoid writing code that has side effects in a callback, such as logging to the console. The way to handle this is by returning a value from the callback which will be passed to the second argument of the error callback.

    store.apply(function(db) {
      return db.current;
    }, function(err, ret) {
        console.log('Balance is ' + ret);
    )};
 
Exceptions
----------

Exceptions thrown within the apply are caught automatically and passed to the error callback, if one has been provided. Any changes made prior to an exception been thrown will not be committed and so exceptions provide a way to terminate an operation abnormally.   

Restrictions
------------

* Do not leak objects from the apply closure, the objects must only be accessed from within your callback.
* Do not rely on an objects prototype. Objects may be constructed with 'new'   but the prototype of an object is not recorded so it will become a plain old object after the changes are committed.
* Do not define getter/setter methods on objects, these are used in parts of the implementation and will cause things to break.
* Avoid assigning functions to object properties, these are currently silently ignored.
* Date types may be used but they are currently mapped to Strings during a commit.
* In this version avoid excessive growth of the data graph. The library requires a garbage collector to recover dead objects from its own data structures and this is not fully implemented. 


Performance Considerations
--------------------------

* This version is not tuned for performance, expect odd results if benchmarking.
* Array handling in MongoDB is rather limited. Push, pop & shift operations should perform well but anything involving slicing, sorting, reversing or unshifting will perform badly on large arrays.

Examples
--------
The distribution includes some examples you may want to review:

* Counters – A simple count down example where multiple workers each decrement their own counter in the store until it reaches 0.
* Bank – A bank account money transfer simulation. A set of workers performs a set number of transfers between randomly selected accounts. Success is not losing any of the money!  
* Work – Workers pull requests to computer Fibonacci numbers from a simple shared queue and post their results on a second queue.

License & Source
----------------
The code is licensed under the Apache License 2.0.

The original source is written in TypeScript. The distribution you receive may only contain JavaScript derived from this while the library is being developed.

Dependancies
------------

The version of rsvp in node_modules has been modified slightly for better exception handling. All other dependancies are unchanged.


Todo
----

* GC Store Cache based on timestamp
* Profile performance
* API for controlling object splits
* GC for stored cyclic references
* Triggers/Events
* Large array handling

