
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

class ForwardHandler implements HandlerIF {

  private wrapped : any= {};

  constructor (obj?: any = {}) {
    this.wrapped = obj;
  }

  defineProperty(name: string, desc: PropertyDescriptor): void {
    Object.defineProperty(this.wrapped, name, desc);
  }

  delete (name: string): bool {
    return delete this.wrapped[name];
  }

  getOwnPropertyNames() : string[] {
    return Object.getOwnPropertyNames(this.wrapped);
  }

  getPropertyNames() : string[] {
    var getPropertyNames = function (obj, name) {
      if (obj === null) return [];
      return Object.getOwnPropertyNames(obj).concat(
        getPropertyNames(Object.getPrototypeOf(obj)));
    }
    return getPropertyNames(this.wrapped);
  }

  getOwnPropertyDescriptor(name: string) : PropertyDescriptor {
    var desc = Object.getOwnPropertyDescriptor(this.wrapped, name);
    if (desc !== undefined) desc.configurable = true;
    return desc;
  }

  getPropertyDescriptor(name: string) : PropertyDescriptor {
    var getPropertyDescriptor = function (obj, name) {
      if (obj === null) return undefined;
      var desc = Object.getOwnPropertyDescriptor(obj, name);
      if (desc !== undefined)
        return desc;
      return getPropertyDescriptor(Object.getPrototypeOf(obj));
    }

    var desc = getPropertyDescriptor(this.wrapped, name);
    if (desc !== undefined) desc.configurable = true;
    return desc;
  }

  fix() {
    var result = {};
    Object.getOwnPropertyNames(obj).forEach(function(name) {
      result[name] = Object.getOwnPropertyDescriptor(obj, name);
    });
    return result;
  }
}

/* ==================================================================== */

class Tester {
}

var tester = new Tester()
var obj = Proxy.create(new ForwardHandler(tester))

obj.a = 1
console.log(obj.a)
console.log(tester)
console.log('Is a tester? : ' + (obj instanceof Tester))
