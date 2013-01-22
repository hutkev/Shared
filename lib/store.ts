// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />
/// <reference path='utils.ts' />
/// <reference path='mongo.ts' />

module shared {
  export module store {

    export var lockUID = utils.makeUID('000000000000000000000000');
    export var rootUID = utils.makeUID('000000000000000000000001');

    /*
     * Create a new store, this always has to be a secondary at the moment
     * to allow for undo actions.
     */
    export function createStore(host?: string, port?:number, db?: string, collection?: string): Store {
      return new MongoStore(host, port, db, collection);
    }

    export interface Store  {

      atomic(handler: (store: any) => any , callback?: (error: string, arg: any) => void ): void;

    }

  } // store
} // shared