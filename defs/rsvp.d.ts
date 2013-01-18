declare module rsvp {
	
	export interface Promise {
		isResolved: bool;
		resolve(value?: any);
		reject(err?: any);
		then(success: Function, failure?: Function): Promise;
	}

}
