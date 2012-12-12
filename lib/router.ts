// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />
/// <reference path='message.ts' />

module shared {
  export module router {

    var dassert = utils.dassert;
    var cluster = require('cluster');
    var util = require('util');
    var workerno = cluster.worker ? cluster.worker.uniqueID : 0;

    /**
     * Generic message receiver interface. Each must be capable of 
     * providing a network unique id, pragmatically a UUID.
     */
    export interface Receiver extends utils.Unique {
      address(): message.Address;
      receive(msg: message.Message): void;
      unknownHandler(msg: message.Message): bool;
      fatal(fmt: string, ...args: any[]): void;
    }

    /**
     * Generic router interface for sending messages between participants.
     * Specific router types are expected to require custom construction
     * depening on transport mechanism.
     *
     * Messages may be sent via the a router to another receiver by using
     * the unqiue id of that receiver or they may be sent as network
     * requests by specifying a null receiver. How network requests are
     * processed is depends on the network type.
     * 
     * Errors may be reported via a receiver or they may be handled by the
     * router implementation in some other way, including the throwing of
     * exceptions.
     */
    export interface Router {
      /**
       * Register a new receiver with the router. Once registered messages
       * will be passsed to the receiver via its 'handle' function.
       */
      register(recv: Receiver) : void;

      /**
       * Deregister an existing receiver with the router. No more messages
       * will be passed to this receiver.
       */
      deregister(recv: Receiver) : void;

      /**
       * Send a message to a receiver, pass null for 'to' to send to the
       * network. Messages must be capable of being serialized in JSON.
       */
      send(msg: message.Message): void;
    }

    /*
     * Simple cluster router. The cluster master version must extend this
     * and provide an implementaion of networkMessage(msg:any) to handle
     * the processing of messages being sent to the 'network'.
     */
    export class ClusterRouter extends utils.UniqueObject implements Router {

      private static _instance;       // Singleton instance
      private _logger: utils.Logger;

      private _receivers: utils.Map;  // rid -> {receiver}
      private _routes: utils.Map;     // rid -> {cid} Cluster master only

      static instance(): ClusterRouter {
        if (!ClusterRouter._instance)
          ClusterRouter._instance = new ClusterRouter();
        return ClusterRouter._instance;
      }

      constructor () {
        dassert(!ClusterRouter._instance);

        // Init
        super();
        this._logger = utils.defaultLogger();
        this._receivers = new utils.Map(utils.hash);
        if (!cluster.isMaster) {
          this._routes = null;
        } else {
          this._routes = new utils.Map(utils.hash);
        }
        this._logger.info('Cluster router started, cid: %d.', workerno);

        // Listen for interesting events
        var that = this;
        if (cluster.isMaster) {
          for (var w = 0; w < cluster.workers.length; w++) {
            cluster.workers[w].on('message', function (msg) {
              if (message.isMessage(msg))
                that.route(<message.Message>msg);
            });
          }
          cluster.on('fork', function (wrk) {
            wrk.on('message', function (msg) {
              if (message.isMessage(msg))
                that.route(<message.Message>msg);
            });
          });
          process.on('message', function (msg) {
            if (message.isMessage(msg))
              that.route(<message.Message>msg);
          });
        } else {
          process.on('message', function (msg) {
            if (message.isMessage(msg))
              that.route(<message.Message>msg);
          });
        }
      }

      /**
       * Fatal error handler. Logs before passing error back to receiver.
       */
      fatal(recv: Receiver, fmt: string, ...args: any[]): void {
        args.push(recv);
        this._logger.debug('ROUTER',fmt, args);
        recv.fatal(fmt, args);
      }

      /**
       * Register a new receiver.
       */
      register(recv: Receiver): void {
        dassert(utils.isObject(recv));

        // Check the ID is not already registered
        var rid = recv.id();
        var re : Receiver =  this._receivers.find(rid);
        if (re) {
          if (re === recv)
            this._logger.debug('ROUTER', 'Receiver is already registered', recv);
          else
            this.fatal(recv, 'A different receiver for this id is already registered', rid);
          return;
        } else {
          this._logger.debug('ROUTER', 'New receiver registered, rid: %s', rid.toString());
        }

        // All ok
        this._receivers.insert(rid, recv);
        if (cluster.isMaster) {
          this._routes.insert(rid, 0);
        } else {
          // Register receiver with network
          var msg = message.getMessage();
          message.setTo(msg, message.Address.networkAddress());
          message.setFrom(msg, recv.address());
          msg.body = null;
          this.send(msg);
          message.returnMessage(msg);
        }
      }

      /**
       * Deregister a receiver.
       */
      deregister(recv: Receiver): void {
        dassert(utils.isObject(recv));

        // Remove from our lookup table
        var rid = recv.id();
        var re : Receiver = this._receivers.find(rid);
        if (re === null) {
          this.fatal(recv, 'This receiver is not currently registered', rid);
          return;
        } else {
          this._logger.debug('ROUTER', 'Reciever deregistered, rid: %s', rid.toString());
        }

        // Drop from lookup
        this._receivers.remove(rid);
        if (cluster.isMaster) {
          this._routes.remove(rid);
        } else {
          var msg = message.getMessage();
          message.setTo(msg, message.Address.networkAddress());
          message.setFrom(msg, new message.Address(recv.id(),0));
          msg.body = null;
          this.send(msg);
          message.returnMessage(msg);
        }
      }

      /**
       * Bit bucket for 'network messages' that can be used to bootstrap
       * other services.
       */
      networkMessage(msg: message.Message): bool {

        // Maybe just a routing message
        if (msg.body === null) {
          this._routes.remove(msg.from_rid);
          if (msg.from_worker !== 0) {
            this._routes.insert(msg.from_rid, msg.from_worker);
          } 
          return true;
        } 
          
        // Try the receivers
        return !this._receivers.apply(function (id: utils.uid, recv: Receiver) {
          return !recv.unknownHandler(msg);
        });
      }

      /**
       * Route message, either to local receiver or to cluster master
       * for further routing.
       */
      route(msg : message.Message): void {
        dassert(utils.isObject(msg));
        this._logger.debug('ROUTER', 'Incoming', msg);

        // Optimistically try our own route table first as quick path
        if (msg.to_rid !== null) {
          var recv: Receiver = this._receivers.find(msg.to_rid);
          if (recv) {
            // Found receipient
            recv.receive(msg);
            return;
          }
        }

        // Maybe we need route info?
        if (cluster.isMaster && msg.to_worker === 0 && msg.to_rid !== null) {
          var cid = this._routes.find(msg.to_rid);
          if (cid !== null) {
            msg.to_worker = cid;
          } else {
            this._logger.debug('ROUTER', 'Unroutable message received', msg);
            return;
          }
        }

        // Is this for someone else?
        if (msg.to_worker !== workerno) {
          if (cluster.isMaster) {

            // Find who TODO: Make quicker
            for (var wid in cluster.workers) {
              if (cluster.workers[wid].uniqueID === msg.to_worker) {
                cluster.workers[wid].send(msg);
                return;
              }
            }

            // No one to handle, maybe they died
            this._logger.debug('ROUTER', 'Message sent to unknown worker', msg);
            return;

          } else {
            // Punt to the master
            this._logger.debug('ROUTER', 'Message punted to master', msg);
            cluster.worker.send(msg);
            return;
          }
        } 

        // Must be for us, is it a network message?
        if (msg.to_rid === null) {
          this._logger.debug('ROUTER', 'Network message received', msg);
          if (!this.networkMessage(msg)) {
            this._logger.debug('ROUTER', 'Unhandled network message', msg);
          }
          return;
        } 

        // Out of options
        this._logger.debug('ROUTER', 'No receiver found for message', msg);
      };

      /**
       * Send a message to a receiver
       */
      send(msg: message.Message): void {
        dassert(utils.isObject(msg));
        dassert(utils.isValue(msg.from_rid));

        // Pupulate from if needed
        if (!utils.isValue(msg.from_worker))
          msg.from_worker = workerno;

        // Set to node (to master) if needed
        if (!utils.isValue(msg.to_worker))
          msg.to_worker = 0;

        // Is it known local?  
        if (msg.to_rid !== null && msg.to_worker === workerno) {
          var recv: Receiver = this._receivers.find(msg.to_rid);
          if (recv !== null) {
            // TODO stack check, possible recursion problems ?
            this._logger.debug('ROUTER', 'Sending direct to receiver', msg);
            recv.receive(msg);
          } else {
            this._logger.debug('ROUTER', 'No receiver found for message', msg);
          }
          return;
        } 

        // Not local, route it then
        this.route(msg);
      }

    }
  } // router
} // shared
