// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />
/// <reference path='utils.ts' />
/// <reference path='mongo.ts' />

module shared {
  export module store {

    export var rootUID = utils.makeUID('000000000000000000000001');

    /*
     * Create a new store, this always has to be a secondary at the moment
     * to allow for undo actions.
     */
    export function createStore(options:any): Store {
      return new MongoStore(options);
    }

    export interface Store  {
      close(): void;

      apply(handler: (store: any) => any , callback?: (error: string, arg: any) => void ): void;

    }

  } // store
} // shared