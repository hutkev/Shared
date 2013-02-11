
/// <reference path='lib.d.ts' />
/// <reference path='node-0.8.d.ts' />

export interface HandlerIF {

  // Spec indicated define should return something but does not state what
  defineProperty(name: string, desc: PropertyDescriptor): void;
  delete (name: string): bool;
  
  getPropertyNames(name: string): string[];
  getOwnPropertyNames(name: string): string[];

  getOwnPropertyDescriptor(name: string): PropertyDescriptor;
  getPropertyDescriptor(name: string): PropertyDescriptor;

  // Returns object containing name,PropertyDescriptor pairs
  fix(): any;

  // Properties must always be configuable, the reasoning is obscure
}

export interface ProxyIF {
	  create(handler : HandlerIF, proto?: any);
	  createFunction(handler, callTrap, constructTrap);
}

declare var Proxy: ProxyIF;

class VirtualHandler implements HandlerIF {

  private delegate : any= {};
  private props: any = {};

  constructor (obj?: any = {}) {
    this.delegate = obj;
  }

  addProperty(name: string, writeCB: (any) => void ) {
    var that = this;

    var desc: PropertyDescriptor = {
      get: function () {
        return that.props[name].value;
      },
      set: function(value) {
        writeCB(value);
        that.props[name].value = value;
      }
    }
    this.props[name] = { value: null, pd: desc };
  }

  defineProperty(name: string, desc: PropertyDescriptor): void {
    Object.defineProperty(this.delegate, name, desc);
  }

  delete (name: string): bool {
    return delete this.delegate[name];
  }

  getOwnPropertyNames() : string[] {
    return Object.getOwnPropertyNames(this.delegate);
  }

  getPropertyNames() : string[] {
    var getPropertyNames = function (obj, name) {
      if (obj === null) return [];
      return Object.getOwnPropertyNames(obj).concat(
        getPropertyNames(Object.getPrototypeOf(obj)));
    }
    return getPropertyNames(this.delegate);
  }

  getOwnPropertyDescriptor(name: string) : PropertyDescriptor {
    var that = this;

    if (this.props[name] !== undefined) {
      return that.props[name].pd;
    } else {
      var desc = Object.getOwnPropertyDescriptor(this.delegate, name);
      if (desc !== undefined) desc.configurable = true;
      return desc;
    }
  }

  getPropertyDescriptor(name: string) : PropertyDescriptor {
    var getPropertyDescriptor = function (obj, name) {
      if (obj === null) return undefined;
      var desc = Object.getOwnPropertyDescriptor(obj, name);
      if (desc !== undefined)
        return desc;
      return getPropertyDescriptor(Object.getPrototypeOf(obj));
    }

    var desc = getPropertyDescriptor(this.delegate, name);
    if (desc !== undefined) desc.configurable = true;
    return desc;
  }

  fix() {
    var result = {};
    Object.getOwnPropertyNames(this.delegate).forEach(function(name) {
      result[name] = Object.getOwnPropertyDescriptor(this.delegate, name);
    });
    return result;
  }
}

/* ==================================================================== */

class Tester {
  private handler : VirtualHandler;

  constructor () {
    this.handler = new VirtualHandler(this);
    this.handler.addProperty("foo", function (value) {
      console.log('New foo: ' + value);
    });
    return Proxy.create(this.handler,this);
  }
}

var tester = new Tester()
tester.foo = 1;
   