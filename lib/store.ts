// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />
/// <reference path='primary.ts' />
/// <reference path='secondary.ts' />

module shared {
  export module store {

    var cluster = require('cluster');
    export var rootUID = utils.makeUID('00000000-0000-0000-0000-000000000001');

    /*
     * Create a store, possibly the primary if running on a cluster master
     * node and a primary has not yet been started.
     */
    export function createStore() : Store {
      if (cluster.isMaster && PrimaryStore.primaryStore() === null) {
        return new PrimaryStore();
      } else {
        return new SecondaryStore();
      }
    }

    export interface Store extends router.Receiver {

      start(listen?: router.Router): void;
      stop(): void;

      atomic(handler: (store: any) => any , callback?: (error: string, arg: any) => void ): void;

    }

  } // store
} // shared