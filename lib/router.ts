//     router.js
//     (c) 2012 Kevin Jones
//     This file may be freely distributed under the MIT license.

/// <reference path='../defs/node-0.8.d.ts' />

var cluster = require('cluster');

export function Router() {

  if (Router.prototype._singletonInstance)
    return Router.prototype._singletonInstance;
  Router.prototype._singletonInstance = this;

  this._map = {};
  this._names = {};
  this._id = 0;
  if (!cluster.isMaster) {
    this._id = cluster.worker.uniqueID;
  }
  var that = this;

  if (cluster.isMaster) {
    for (var w = 0; w < cluster.workers.length; w++) {
      cluster.workers[w].on('message', function(msg) {
        if (msg.route_to !== undefined) {
          that.dispatch(msg);
        }
      });
    }
    cluster.on('fork', function(wrk) {
      wrk.on('message', function(msg) {
        if (msg.route_to !== undefined) {
          that.dispatch(msg);
        }
      });
    });
    process.on('message', function(msg) {
      if (msg.route_to !== undefined) {
        that.dispatch(msg);
      }
    });
  } else {
    process.on('message', function(msg) {
      if (msg.route_to !== undefined) {
        that.dispatch(msg);
      }
    });
  }
}

Router.prototype.from = function(obj) {
  return {id: this._id, task: obj.id()};
}

Router.prototype.clear = function(obj) {
  this._map = {};
  this._names = {};
};

Router.prototype.register = function(obj, name) {
  var id = obj.id();
  if (this._map[id] === undefined && 
    (name === undefined || this._names[name] === undefined)) {
    if (name !== undefined) {
      var as = {id: this._id, task: id};
      this._names[name] = as;
      if (!cluster.isMaster) {
        var msg = {route_to: {id: 0, task: 0}, name: name, as: as}; 
        this.dispatch(msg);
      }
    }
    this._map[id] = {obj: obj, name: name};
    return true;
  } 
  return false;
};

Router.prototype.deregister = function(obj) {
  var id = obj.id();
  var e = this._map[id];
  if (e !== undefined) {
    if (e.name !== undefined) {
      if (!cluster.isMaster) {
        var msg = {route_to: {id: 0, task: 0}, name: name}; 
        this.dispatch(msg);
      }
      delete this._names[e.name];
    }
    delete this._map[id]; 
    return true;
  } else {
    return false;
  }
};

Router.prototype.dispatch = function(msg) {
  if (msg.route_to === undefined)
    return;
    
  if (msg.route_to.name !== undefined) {
    var e = this._names[msg.route_to.name];
    if (e !== undefined) {
      msg.route_to = e;
    }
  }
  
  if (msg.route_to.id !== this._id) {
    if (cluster.isMaster) {
      for (var w = 0; w < cluster.workers.length; w++) {
        if (cluster.workers[w].uniqueId === msg.route_to.id) {
            cluster.workers[w].send(msg);
            return;
        }
      }
    } else {
      cluster.worker.send(msg);
    }
  } else {
    if (msg.route_to.task === 0) {
      if (msg.name !== undefined) {
        if (msg.as !== undefined)
          this._names[name] = msg.as;
        else
          delete this._names[name]; 
      }
    } else { 
      var recv = this._map[msg.route_to.task];
      if (recv !== undefined) {
         recv.obj.handle(msg);
      }
    }
  }
};

export var router = new Router();
