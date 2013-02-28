// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />
/// <reference path='utils.ts' />
/// <reference path='mongo.ts' />

module shared {
  export module store {

    export var rootUID = utils.makeUID('000000000000000000000001');

    /**
      * Create a new store.
      * @param options Store specific options
      */
    export function createStore(options:any): Store {
      return new MongoStore(options);
    }

    /**
      * Interface for all store types
      */
    export interface Store  {
      
      /**
       * Apply changes to a store. 
       * @param handler Callback for making changes to db, may be called multiple times
       * @param callback Completion callback with a possibly null error object
       */
      apply(handler: (db: any) => any, callback?: (error: Error, arg: any) => void ): void;

      /**
       * Clean the store. Removes all data held in the store.
       * @param callback Completion callback with a possibly null error object
       */
      clean(callback?: (Error: string) => void ): void;

      /**
       * Close the store. This cleans up database connections which
       * will allow node.js to terminate normally.
       */
      close(): void;
    }

  } // store
} // shared