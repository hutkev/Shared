
declare module mongodb {

	export interface Server {
		constructor (host: string, port: number, opts?: ServerOptions);
	}

	export interface Db {
		constructor (databaseName: string, serverConfig: Server, db_options?: DBOptions);

		db(dbName: string): Db;

		open(callback: (err : Error, db : Db) => void );
		close(forceClose?: bool, callback?: (err: any, result: any) => void );
		admin(callback: (err, result) => void ): any;
		collectionsInfo(collectionName: string, callback?: (err, result) => void );
		collectionNames(collectionName: string, options: any, callback?: (err, result) => void );

		collection(collectionName: string, callback: (err: any, collection: Collection) => void );
		collection(collectionName: string, options: MongoCollectionOptions, callback: (err: any, collection: Collection) => void );

		collections(callback: (err: any, collections: Collection[]) => void );
		eval(code: any, parameters: any[], options?: any, callback?: (err, result) => void );
		//dereference(dbRef: DbRef, callback: (err, result) => void);

		logout(options: any, callback?: (err, result) => void );
		logout(callback: (err, result) => void );

		authenticate(userName: string, password: string, callback?: (err, result) => void );
		authenticate(userName: string, password: string, options: any, callback?: (err, result) => void );

		addUser(username: string, password: string, callback?: (err, result) => void );
		addUser(username: string, password: string, options: any, callback?: (err, result) => void );

		removeUser(username: string, callback?: (err, result) => void );
		removeUser(username: string, options: any, callback?: (err, result) => void );

		createCollection(collectionName: string, callback?: (err: Error, result: Collection) => void );
		createCollection(collectionName: string, options: CollectionCreateOptions, callback?: (err, result) => void );

		command(selector: any, callback?: (err, result) => void );
		command(selector: any, options: any, callback?: (err, result) => void );

		dropCollection(collectionName: string, callback?: (err, result) => void );
		renameCollection(fromCollection: string, toCollection: string, callback?: (err, result) => void );

		lastError(options, connectionOptions, callback: (err, result) => void );
		previousError(options, callback: (err, result) => void );

		// error = lastError
		// lastStatus = lastError

		executeDbCommand(command_hash, callback?: (err, result) => void );
		executeDbCommand(command_hash, options, callback?: (err, result) => void );

		executeDbAdminCommand(command_hash, callback?: (err, result) => void );
		executeDbAdminCommand(command_hash, options, callback?: (err, result) => void );

		resetErrorHistory(callback?: (err, result) => void );
		resetErrorHistory(options, callback?: (err, result) => void );

		createIndex(collectionName, fieldOrSpec, options, callback);
		ensureIndex(collectionName, fieldOrSpec, options, callback);

		cursorInfo(options, callback);

		dropIndex(collectionName, indexName, callback);
		reIndex(collectionName, callback);
		indexInformation(collectionName, options, callback);
		dropDatabase(callback: (err, result) => void );

		stats(options, callback);
		_registerHandler(db_command, raw, connection, exhaust, callback);
		_reRegisterHandler(newId, object, callback);
		_callHandler(id, document, err);
		_hasHandler(id);
		_removeHandler(id);
		_findHandler(id): { id: string; callback: Function; };
		__executeQueryCommand(self, db_command, options, callback);

		DEFAULT_URL: string;

		connect(url: string, options: { uri_decode_auth?: bool; }, callback: (err, result) => void );
	}

	export interface ObjectID {
		constructor (s: string);
	}

	export interface SocketOptions {
		//= set seconds before connection times out default:0
		timeout?: number;
		//= Disables the Nagle algorithm default:true
		noDelay?: bool;
		//= Set if keepAlive is used default:0 , which means no keepAlive, set higher than 0 for keepAlive
		keepAlive?: number;
		//= ‘ascii’|’utf8’|’base64’ default:null
		encoding?: string;
	}

	export interface ServerOptions {
		// - to reconnect automatically, default:false
		auto_reconnect?: bool;
		// - specify the number of connections in the pool default:1
		poolSize?: number;
		// - a collection of pr socket settings
		socketOptions?: any;
	}

	export interface PKFactory {
		counter: number;
		createPk: () => number;
	}

	export interface DBOptions {
		//- if true, use native BSON parser
		native_parser?: bool;
		//- sets strict mode , if true then existing collections can’t be “recreated” etc.
		strict?: bool;
		//- custom primary key factory to generate _id values (see Custom primary keys).
		pk?: PKFactory;
		//- generation of objectid is delegated to the mongodb server instead of the driver. default is false
		forceServerObjectId?: bool;
		//- specify the number of milliseconds between connection attempts default:5000
		retryMiliSeconds?: number;
		//- specify the number of retries for connection attempts default:3
		numberOfRetries?: number;
		//- enable/disable reaper (true/false) default:false
		reaper?: bool;
		//- specify the number of milliseconds between each reaper attempt default:10000
		reaperInterval?: number;
		//- specify the number of milliseconds for timing out callbacks that don’t return default:30000
		reaperTimeout?: number;
		//- driver expects Buffer raw bson document, default:false
		raw?: bool;
	}

	export interface CollectionCreateOptions {
		// {true | {w:n, wtimeout:n} | {fsync:true}, default:false}, executes with a getLastError command returning the results of the command on MongoDB.
		safe?: bool;
		// {Boolean, default:false}, serialize functions on the document.
		serializeFunctions?: bool;
		// {Boolean, default:false}, perform all operations using raw bson objects.
		raw?: bool; 
		// object overriding the basic ObjectID primary key generation.
		pkFactory?: PKFactory;
		// {Boolean, default:false}, create a capped collection.
		capped?: bool;
		// {Number}, the size of the capped collection in bytes. 
		size?: number;
		// {Number}, the maximum number of documents in the capped collection.
		max?: number;
		// {Boolean, default:false}, create an index on the _id field of the document, not created automatically on capped collections.
		autoIndexId?: bool;
		// {String}, the prefered read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
		readPreference?: string; 
	}

	export interface Collection {
		//constructor (db: Db, collectionName: string, pkFactory, options);
		
		insert(query: any, callback: (err: any, result: any) => void): void;
		insert(query: any, options: { safe?: any; continueOnError?: bool; keepGoing?: bool; serializeFunctions?: bool; }, callback: (err: any, result: any) => void): void;
		
		remove(selector, callback?: (err: any, result: any) => void);
		remove(selector, options: { safe?: any; single?: bool; }, callback?: (err: any, result: any) => void);
		
		rename(newName: String, callback?: (err, result) => void);
		
		save(doc: any, callback : (err, result) => void);
		save(doc: any, options: { safe: any; }, callback : (err, result) => void);
		
		update(selector: any, document: any, callback?: (err: any, result: any) => void): void;
		update(selector: any, document: any, options: { safe?; upsert?; multi?; serializeFunctions?; }, callback: (err: any, result: any) => void): void;
		
		distinct(key: string, query: Object, callback: (err, result) => void);
		distinct(key: string, query: Object, options: { readPreferences; }, callback: (err, result) => void);
		
		count(callback: (err, result) => void);
		count(query: Object, callback: (err, result) => void);
		count(query: Object, options: { readPreferences; }, callback: (err, result) => void);
		
		drop(callback?: (err, result) => void);
		
		findAndModify(query: Object, sort: any[], doc: Object, callback: (err, result) => void);
		findAndModify(query: Object, sort: any[], doc: Object, options: { safe: any; remove: bool; upsert: bool; new: bool; }, callback: (err, result) => void);
		
		findAndRemove(query : Object, sort? : any[], callback?: (err, result) => void);
		findAndRemove(query : Object, sort? : any[], options?: { safe; }, callback?: (err, result) => void);
		
		find(callback?: (err: any, result: Cursor) => void): Cursor;
		find(selector: any, callback?: (err: any, result: Cursor) => void): Cursor;
		find(selector: any, fields: any, callback?: (err: any, result: Cursor) => void): Cursor;
		find(selector: any, options: CollectionFindOptions, callback?: (err: any, result: Cursor) => void): Cursor;
		find(selector: any, fields: any, options: CollectionFindOptions, callback?: (err: any, result: Cursor) => void): Cursor;
		find(selector: any, fields: any, skip: number, limit: number, callback?: (err: any, result: Cursor) => void): Cursor;
		find(selector: any, fields: any, skip: number, limit: number, timeout: number, callback?: (err: any, result: Cursor) => void): Cursor;
		
		findOne(callback?: (err: any, result: any) => void): Cursor;
		findOne(selector: any, callback?: (err: any, result: any) => void): Cursor;
		findOne(selector: any, fields: any, callback?: (err: any, result: any) => void): Cursor;
		findOne(selector: any, options: CollectionFindOptions, callback?: (err: any, result: any) => void): Cursor;
		findOne(selector: any, fields: any, options: CollectionFindOptions, callback?: (err: any, result: any) => void): Cursor;
		findOne(selector: any, fields: any, skip: number, limit: number, callback?: (err: any, result: any) => void): Cursor;
		findOne(selector: any, fields: any, skip: number, limit: number, timeout: number, callback?: (err: any, result: any) => void): Cursor;
		
		createIndex(fieldOrSpec, options: IndexOptions, callback: (err: Error, indexName: string) => void);
		ensureIndex(fieldOrSpec, options: IndexOptions, callback: (err: Error, indexName: string) => void);
		indexInformation(options, callback);
		dropIndex(name, callback);
		dropAllIndexes(callback);
		// dropIndexes = dropAllIndexes
		
		reIndex(callback);
		mapReduce(map, reduce, options, callback);
		group(keys, condition, initial, reduce, finalize, command, options, callback);
		options(callback);
		isCapped(callback);
		indexExists(indexes, callback);
		geoNear(x, y, options, callback);
		geoHaystackSearch(x, y, options, callback);
		indexes(callback);
		aggregate(pipeline:any[], options, callback);
		stats(options, callback);
		
		hint;
	}

	export interface IndexOptions {
		background?: bool;
		dropDups?: bool;
		sparse?: bool;
		unique?: bool;
		v?: number;
	}

	export interface Cursor {
		constructor (db, collection, selector, fields, skip, limit, sort, hint, explain, snapshot, timeout, tailable, batchSize, slaveOk, raw, read, returnKey, maxScan, min, max, showDiskLoc, comment, awaitdata, numberOfRetries, dbName, tailableRetryInterval, exhaust, partial);

		rewind() : Cursor;
		toArray(callback: (err: any, results: any[]) => any) : void;
		each(callback: (err: Error, item: any) => void) : void;
		count(callback: (err: any, count: number) => void) : void;

		sort(keyOrList : any, callback? : (err, result) => void): Cursor;
		sort(keyOrList : String, direction : any, callback? : (err, result) => void): Cursor;

		limit(limit: number, callback?: (err, result) => void): Cursor;
		setReadPreference(readPreferences, tags, callback?): Cursor;
		skip(skip: number, callback?: (err, result) => void): Cursor;
		batchSize(batchSize, callback: (err, result) => void): Cursor;

		nextObject(callback: (err:any, doc: any) => void);
		explain(callback: (err, result) => void);
		//stream(): CursorStream;

		close(callback?: (err, result) => void);
		isClosed(): Boolean;

	}

	export interface CollectionFindOptions {
		limit?;
		sort?;
		fields?;
		skip?;
		hint?;
		explain?;
		snapshot?;
		timeout?;
		tailtable?;
		tailableRetryInterval?;
		numberOfRetries?;
		awaitdata?;
		exhaust?;
		batchSize?;
		returnKey?;
		maxScan?;
		min?;
		max?;
		showDiskLoc?;
		comment?;
		raw?;
		readPreferences?;
		partial?;
	}

	export interface MongoCollectionOptions {
		safe?: any;
		serializeFunctions?: any;
		raw?: bool;
		pkFactory?: any;
		readPreferences?: string;
	}
}
